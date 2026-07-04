// 主 A2A 聊天 API 路由 — 多 Agent 协作的核心入口，通过 SSE 流式返回各阶段输出
// ═══ Beta 优化流水线：Router(分析+规划) → Credit → Round1(并行) → Round2(互评) → Arbitration(仲裁) → QG+L7(交付) ═══
import { NextRequest } from "next/server";
import {
  buildAgentPrompt,
  buildRouterPrompt,
  buildArbitratorPrompt,
  buildQualityGatePrompt,
  buildRound2Prompt,
  buildL7Prompt,
  parseRouterResponse,
  callLLM,
  callLLMStream,
  callLLMWithToolsStream,
  DOC_TOOLS,
  type ChatMessage,
} from "@/lib/prompt";
import { executeGenerateDocument, executeFileWrite, executeFileRead } from "@/lib/document";
import { agents } from "@/data/agents";

export const runtime = "nodejs";

// ---- 前端展示用的 Agent 消息数据结构 / Data structure for Agent messages displayed in the frontend ----
interface AgentMessage {
  speaker: string;
  emoji: string;
  content: string;
  a2aLayer?: string;
  isSystem?: boolean;
  isUser?: boolean;
  fileUrl?: string;
  downloadName?: string;
  fileFormat?: string;
  toolName?: string;
  toolAction?: string;
  streaming?: "start" | "delta" | "end";
  delta?: string;
}

// ---- 工具函数 / Helper functions ----

// 将对话历史格式化为字符串，用于拼接到 LLM 上下文中 / Format conversation history into a string for LLM context
function formatHistory(msgs: AgentMessage[]): string {
  return msgs.map((m) => `[${m.speaker}${m.a2aLayer ? ` | ${m.a2aLayer}` : ""}]: ${m.content}`).join("\n");
}

// 通用 SSE 写入：将一条消息序列化为 SSE 格式并发送 / Generic SSE writer: serializes a message into SSE format and sends it
async function writeSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, msg: AgentMessage) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

// ---- 流式输出辅助函数：分别发送 start / delta / end 事件，前端据此重建完整内容 / Streaming helpers: send start/delta/end events for the frontend to reconstruct full content ----
function streamStart(controller: ReadableStreamDefaultController, encoder: TextEncoder, speaker: string, emoji: string, a2aLayer: string) {
  const msg: AgentMessage = { speaker, emoji, content: "", a2aLayer, streaming: "start" };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

function streamDelta(controller: ReadableStreamDefaultController, encoder: TextEncoder, delta: string) {
  const msg: AgentMessage = { speaker: "", emoji: "", content: "", streaming: "delta", delta };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

function streamEnd(controller: ReadableStreamDefaultController, encoder: TextEncoder, speaker: string, emoji: string, a2aLayer: string) {
  const msg: AgentMessage = { speaker, emoji, content: "", a2aLayer, streaming: "end" };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

// 超时辅助：创建 AbortController，在指定毫秒后自动取消 / Timeout helper: creates an AbortController that auto-cancels after the given milliseconds
function withTimeout(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

// 将前端传来的历史消息转换为 LLM 可用的 ChatMessage 数组 / Convert frontend history messages into ChatMessage array for LLM consumption
function buildPrevMessages(prevHistory: unknown): ChatMessage[] {
  if (!prevHistory || !Array.isArray(prevHistory)) return [];
  return prevHistory
    .filter((m: AgentMessage) => m.speaker && m.content)
    .map((m: AgentMessage) => ({
      role: m.isUser ? "user" as const : "assistant" as const,
      content: `[${m.speaker}${m.a2aLayer ? ` | ${m.a2aLayer}` : ""}]: ${m.content}`,
    }));
}

// 构建每个阶段注入 LLM 的完整上下文字符串，包含之前对话、当前任务、Router 分析和文件内容 / Build the full context string injected into each LLM phase, including prior conversation, current task, Router analysis, and file content
function buildContextString(prevHistory: unknown, message: string, routerAnalysis: string, selectedAgents: string[], fileContext?: string): { fullContext: string; isFollowUp: boolean } {
  const prevContext = prevHistory && Array.isArray(prevHistory)
    ? (prevHistory as AgentMessage[])
        .filter((m) => m.speaker && m.content)
        .map((m) => `[${m.speaker}]: ${m.content}`)
        .join("\n")
    : "";
  const isFollowUp = prevContext.length > 0;

  const fullContext = [
    prevContext && `【之前的对话】\n${prevContext}`,
    `【当前任务】\n用户需求：${message}\n\nRouter分析：${routerAnalysis}\n选中Agent：${selectedAgents.join("、")}`,
    fileContext && `【上传文件内容】\n${fileContext}`,
    isFollowUp && "注意：这是后续对话，请基于之前的上下文给出连贯的回复。",
  ].filter(Boolean).join("\n\n");

  return { fullContext, isFollowUp };
}

// 组装最终发给 LLM 的消息数组：拼接历史消息 + 当前会话记录 + 上下文 / Assemble the final message array for LLM: concatenate prior messages + current session history + context
function buildMessages(prevMessages: ChatMessage[], currentContext: string, sessionHistory: string): ChatMessage[] {
  const msgs: ChatMessage[] = [...prevMessages];
  if (sessionHistory) {
    msgs.push({ role: "user", content: `当前会话记录：\n${sessionHistory}\n\n${currentContext}` });
  } else {
    msgs.push({ role: "user", content: currentContext });
  }
  return msgs;
}

// ---- 工具执行器：根据工具名称分发到具体的文档/文件操作实现 / Tool executor: dispatches tool calls to concrete document/file operation implementations ----
async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "generate_document") {
    const result = await executeGenerateDocument(args);
    if (result.success) {
      return JSON.stringify({
        success: true,
        tool: "generate_document",
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        format: result.format,
        message: result.message,
      });
    }
    return JSON.stringify({ success: false, error: result.message });
  }

  if (name === "file_write") {
    const result = await executeFileWrite(args);
    return JSON.stringify({
      success: result.success,
      tool: "file_write",
      fileName: result.fileName,
      fileUrl: result.fileUrl,
      action: result.action,
      message: result.message,
    });
  }

  if (name === "file_read") {
    const result = await executeFileRead((args.path as string) || "");
    return JSON.stringify({
      success: result.success,
      tool: "file_read",
      content: result.content,
      message: result.message,
    });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// ---- 发送工具调用卡片：当 Agent 调用了 generate_document 或 file_write 时，向前端推送包含文件下载链接的卡片消息 / Send tool call card: when an Agent calls generate_document or file_write, push a card message with file download link to the frontend ----
async function sendToolCard(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  agentName: string,
  agentEmoji: string,
  a2aLayer: string,
  toolName: string,
  toolResult: string
) {
  try {
    const parsed = JSON.parse(toolResult);
    if (!parsed.success) return;

    if (parsed.tool === "generate_document") {
      const msg: AgentMessage = {
        speaker: agentName,
        emoji: agentEmoji,
        content: parsed.fileName,
        a2aLayer,
        toolName: "generate_document",
        toolAction: `生成 ${parsed.format?.toUpperCase()} 文档`,
        fileUrl: parsed.fileUrl,
        downloadName: parsed.fileName,
        fileFormat: parsed.format,
      };
      await writeSSE(controller, encoder, msg);
    } else if (parsed.tool === "file_write") {
      const msg: AgentMessage = {
        speaker: agentName,
        emoji: agentEmoji,
        content: parsed.fileName,
        a2aLayer,
        toolName: "file_write",
        toolAction: `${parsed.action === "append" ? "追加" : "写入"}文件`,
        fileUrl: parsed.fileUrl,
        downloadName: parsed.fileName,
        fileFormat: parsed.fileName?.split(".").pop() || "txt",
      };
      await writeSSE(controller, encoder, msg);
    }
  } catch {
    // skip
  }
}

// ---- 运行流式 Agent 阶段：启动一个带工具调用的流式 LLM 调用，通过 SSE 将 token 逐字推送给前端 / Run a streaming Agent phase: starts a streaming LLM call (with optional tool calling) and pushes tokens to the frontend via SSE ----
async function runStreamingAgent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  systemPrompt: string,
  msgs: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  speaker: string,
  emoji: string,
  a2aLayer: string,
  useTools: boolean,
  maxTokens: number = 4096
): Promise<{ content: string; toolResults: { name: string; result: string }[] }> {
  // Signal stream start
  streamStart(controller, encoder, speaker, emoji, a2aLayer);

  let result;
  const { signal, cleanup } = withTimeout(90000);
  try {
    if (useTools) {
      result = await callLLMWithToolsStream(
        systemPrompt, msgs, apiKey, baseUrl, model, maxTokens, DOC_TOOLS, toolExecutor,
        (token) => streamDelta(controller, encoder, token),
        signal
      );
    } else {
      result = await callLLMStream(
        systemPrompt, msgs, apiKey, baseUrl, model, maxTokens, undefined,
        (token) => streamDelta(controller, encoder, token),
        signal
      );
    }
  } finally {
    cleanup();
  }

  // Clean up content — strip code blocks, trim
  const content = result.content.replace(/```[\s\S]*?```/g, "").trim() || "已完成。";

  // Signal stream end
  streamEnd(controller, encoder, speaker, emoji, a2aLayer);

  return { content, toolResults: result.toolResults || [] };
}

// ═══════════════════════════════════════════════════════════════
// 主 POST 处理器 — 接收用户消息，编排多阶段 A2A 协作流程 / Main POST handler — receives user message and orchestrates the multi-phase A2A collaboration workflow
// ═══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // ---- 请求解析：提取消息、历史记录、文件上下文，并校验 API Key / Request parsing: extract message, history, file context, and validate API Key ----
    const { message, history: prevHistory, fileContext } = await req.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const prevMessages = buildPrevMessages(prevHistory);

    const stream = new ReadableStream({
      async start(controller) {
        const history: AgentMessage[] = [];

        try {
          // ═══ 第一阶段：Router(分析+规划) — 解构需求、选择 Agent、制定执行计划 / Phase 1: Router (analyze + plan) — deconstruct, select, and plan ═══
          const routerThinkingMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: "分析需求中，正在匹配最优 Agent 组合并制定执行计划...",
            a2aLayer: "L1", isSystem: true,
          };
          history.push(routerThinkingMsg);
          await writeSSE(controller, encoder, routerThinkingMsg);

          const routerMsgs: ChatMessage[] = [...prevMessages];
          if (prevMessages.length > 0 || fileContext) {
            const contextParts: string[] = [];
            if (fileContext) contextParts.push(`【上传文件内容】\n${fileContext}`);
            contextParts.push(`用户需求：${message}`);
            routerMsgs.push({ role: "user", content: `【后续对话】请基于以上上下文，处理用户的新需求：\n${contextParts.join("\n\n")}` });
          } else {
            routerMsgs.push({ role: "user", content: `用户需求：${message}` });
          }

          const routerResult_raw = await callLLM(buildRouterPrompt(), routerMsgs, apiKey, baseUrl, model);
          const routerResult = parseRouterResponse(routerResult_raw.content);

          const selectedAgents = routerResult?.selectedAgents || ["架构师", "编码 Agent", "安全 Agent"];
          const routerAnalysis = routerResult?.analysis || `已分析需求，匹配 ${selectedAgents.length} 个专业 Agent`;
          const plan = routerResult?.plan || "分析需求 → 分工协作 → 综合交付";

          const routerMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: `${routerAnalysis}\n\n选中：${selectedAgents.join("、")}\n\n执行计划：${plan}`,
            a2aLayer: "L1", isSystem: true,
          };
          history.push(routerMsg);
          await writeSSE(controller, encoder, routerMsg);

          const { fullContext } = buildContextString(prevHistory, message, routerAnalysis, selectedAgents, fileContext);

          // ═══ 第二阶段：L3 信用层 — 验证所有选中 Agent 的可用性和信用状态 / Phase 2: L3 Credit ═══
          const creditMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: `[A2A-Credit] ${selectedAgents.join("、")} 信用核查通过，进入 L4 协商阶段。`,
            a2aLayer: "L3", isSystem: true,
          };
          history.push(creditMsg);
          await writeSSE(controller, encoder, creditMsg);

          // ═══ 第三阶段：L4 协商 — 第一轮，每个 Agent 流式输出分析结果，支持工具调用 / Phase 3: L4 Round 1 ═══
          for (let i = 0; i < selectedAgents.length; i++) {
            const agentName = selectedAgents[i];
            const agentData = agents.find((a) => a.name === agentName);
            const agentEmoji = agentData?.emoji || "🤖";
            const agentPrompt = buildAgentPrompt(agentName);

            if (!agentPrompt) {
              const fallback: AgentMessage = { speaker: agentName, emoji: agentEmoji, content: "收到任务，正在分析中...", a2aLayer: "L4" };
              history.push(fallback);
              await writeSSE(controller, encoder, fallback);
              continue;
            }

            const taskedPrompt = agentPrompt.replace(
              "## 协作规则",
              `## 工具权限\n你可以调用以下工具：\n- file_write: 创建/编辑文件（代码、配置、笔记等）\n- file_read: 读取其他 Agent 写的文件\n- generate_document: 生成正式 docx/xlsx 文档\n如果任务需要产出文件，直接调用工具。调用工具后简要说一句即可。\n\n## 协作规则`
            );

            const msgs = buildMessages(prevMessages, fullContext, formatHistory(history));

            try {
              const { content, toolResults } = await runStreamingAgent(
                controller, encoder, taskedPrompt, msgs, apiKey, baseUrl, model,
                agentName, agentEmoji, "L4", true, 4096
              );

              history.push({ speaker: agentName, emoji: agentEmoji, content, a2aLayer: "L4" });

              for (const tr of toolResults) {
                await sendToolCard(controller, encoder, agentName, agentEmoji, "L4", tr.name, tr.result);
              }
            } catch (e) {
              const errMsg: AgentMessage = {
                speaker: agentName, emoji: agentEmoji,
                content: `[超时/错误] ${e instanceof Error ? e.message : "执行失败"}，跳过此 Agent。`,
                a2aLayer: "L4", isSystem: true,
              };
              history.push(errMsg);
              await writeSSE(controller, encoder, errMsg);
            }
          }

          // ═══ 第四阶段：L5 互评 — 第二轮深度讨论，各 Agent 互相评审、补充和深化（≥2 Agent 时触发） / Phase 4: L5 Cross-review ═══
          if (selectedAgents.length >= 2) {
            const r2Notice: AgentMessage = {
              speaker: "Router", emoji: "🔄",
              content: "[A2A-L5] 进入第二轮互评讨论。各 Agent 将互相评审、补充和深化彼此的方案。",
              a2aLayer: "L5", isSystem: true,
            };
            history.push(r2Notice);
            await writeSSE(controller, encoder, r2Notice);

            for (let i = 0; i < selectedAgents.length; i++) {
              const agentName = selectedAgents[i];
              const agentData = agents.find((a) => a.name === agentName);
              const agentEmoji = agentData?.emoji || "🔄";
              const otherAgents = selectedAgents.filter((_, j) => j !== i);
              const r2Prompt = buildRound2Prompt(agentName, otherAgents);
              if (!r2Prompt) continue;

              const msgs = buildMessages(prevMessages, fullContext, formatHistory(history));

              try {
                const { content } = await runStreamingAgent(
                  controller, encoder, r2Prompt, msgs, apiKey, baseUrl, model,
                  agentName, agentEmoji, "L5", false, 4096
                );
                history.push({ speaker: agentName, emoji: agentEmoji, content, a2aLayer: "L5" });
              } catch (e) {
                const errMsg: AgentMessage = {
                  speaker: agentName, emoji: agentEmoji,
                  content: `[超时/错误] ${e instanceof Error ? e.message : "执行失败"}，跳过。`,
                  a2aLayer: "L5", isSystem: true,
                };
                history.push(errMsg);
                await writeSSE(controller, encoder, errMsg);
              }
            }
          }

          // ═══ 第五阶段：L6 仲裁 — 综合各 Agent 意见，输出最终结论（≥2 Agent 时触发） / Phase 5: L6 Arbitration ═══
          if (selectedAgents.length >= 2) {
            const arbMsgs = buildMessages(prevMessages, fullContext, formatHistory(history));
            try {
              const { content } = await runStreamingAgent(
                controller, encoder, buildArbitratorPrompt(), arbMsgs, apiKey, baseUrl, model,
                "仲裁组", "⚖️", "L6", false, 4096
              );
              history.push({ speaker: "仲裁组", emoji: "⚖️", content, a2aLayer: "L6", isSystem: true });
            } catch (e) {
              const arbMsg: AgentMessage = {
                speaker: "仲裁组", emoji: "⚖️",
                content: "各 Agent 意见已充分讨论，无明显分歧。",
                a2aLayer: "L6", isSystem: true,
              };
              history.push(arbMsg);
              await writeSSE(controller, encoder, arbMsg);
            }
          }

          // ═══ 第六阶段：质量门禁 + L7 联邦交付 — 综合所有讨论结果，生成最终交付物 / Phase 6: QG + L7 Federation ═══
          const outputAgent = agents.find((a) => a.name === selectedAgents[0]);
          const outputSystemPrompt = outputAgent
            ? buildL7Prompt(outputAgent.name, outputAgent.role, outputAgent.personality, outputAgent.description)
            : buildQualityGatePrompt();

          const outMsgs = buildMessages(prevMessages, fullContext, formatHistory(history));

          try {
            const { content, toolResults } = await runStreamingAgent(
              controller, encoder, outputSystemPrompt, outMsgs, apiKey, baseUrl, model,
              "Quality Gate", "✅", "L7", true, 8192
            );

            history.push({ speaker: "Quality Gate", emoji: "✅", content, a2aLayer: "L7", isSystem: true });

            for (const tr of toolResults) {
              await sendToolCard(controller, encoder, "Quality Gate", "✅", "L7", tr.name, tr.result);
            }
          } catch (e) {
            const qgMsg: AgentMessage = {
              speaker: "Quality Gate", emoji: "✅",
              content: "协作完成。请查看各 Agent 的分析结果。",
              isSystem: true,
            };
            history.push(qgMsg);
            await writeSSE(controller, encoder, qgMsg);
          }

          // ═══ 记忆保存：将本次协作摘要写入 L2 共享记忆 / Memory save: write collaboration summary to L2 ═══
          const memMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: `[A2A-Mem] 本次协作完成。涉及 ${selectedAgents.length} 个 Agent、${selectedAgents.length >= 2 ? "两轮" : "一轮"}讨论、${history.length} 条消息。结论已写入 L2 共享记忆。`,
            a2aLayer: "L2", isSystem: true,
          };
          history.push(memMsg);
          await writeSSE(controller, encoder, memMsg);

        // ═══ 错误处理：捕获流内任何阶段的异常，向前端推送错误消息 / Error handling: catch any exception from any phase within the stream and push an error message to the frontend ═══
        } catch (e) {
          const errMsg: AgentMessage = {
            speaker: "System", emoji: "⚠️",
            content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
            isSystem: true,
          };
          await writeSSE(controller, encoder, errMsg);
        // ═══ 流清理：无论成功还是失败，确保关闭 SSE 流 / Stream cleanup: always close the SSE stream regardless of success or failure ═══
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  // ═══ 外层错误处理：处理请求解析阶段的异常（如 JSON 解析失败） / Outer error handling: catches exceptions during request parsing (e.g., JSON parse failure) ═══
  } catch (e) {
    console.error("Chat API error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
