import { NextRequest } from "next/server";
import {
  buildAgentPrompt,
  buildRouterPrompt,
  buildArbitratorPrompt,
  buildQualityGatePrompt,
  buildRound2Prompt,
  buildPlannerPrompt,
  parsePlannerResponse,
  callLLM,
  callLLMStream,
  callLLMWithToolsStream,
  parseRouterResponse,
  DOC_TOOLS,
  type ChatMessage,
} from "@/lib/prompt";
import { executeGenerateDocument, executeFileWrite, executeFileRead } from "@/lib/document";
import { agents } from "@/data/agents";

export const runtime = "nodejs";

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

// ---- Helpers ----
function formatHistory(msgs: AgentMessage[]): string {
  return msgs.map((m) => `[${m.speaker}${m.a2aLayer ? ` | ${m.a2aLayer}` : ""}]: ${m.content}`).join("\n");
}

async function writeSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, msg: AgentMessage) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

// Streaming helpers
function streamStart(controller: ReadableStreamDefaultController, encoder: TextEncoder, speaker: string, emoji: string, a2aLayer: string) {
  const msg: AgentMessage = { speaker, emoji, content: "", a2aLayer, streaming: "start" };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

function streamDelta(controller: ReadableStreamDefaultController, encoder: TextEncoder, delta: string) {
  const msg: AgentMessage = { speaker: "", emoji: "", content: "", streaming: "delta", delta };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

function streamEnd(controller: ReadableStreamDefaultController, encoder: TextEncoder, speaker: string, emoji: string, content: string, a2aLayer: string) {
  const msg: AgentMessage = { speaker, emoji, content, a2aLayer, streaming: "end" };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
}

// Timeout helper — abort after ms
function withTimeout(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

function buildPrevMessages(prevHistory: unknown): ChatMessage[] {
  if (!prevHistory || !Array.isArray(prevHistory)) return [];
  return prevHistory
    .filter((m: AgentMessage) => m.speaker && m.content)
    .map((m: AgentMessage) => ({
      role: m.isUser ? "user" as const : "assistant" as const,
      content: `[${m.speaker}${m.a2aLayer ? ` | ${m.a2aLayer}` : ""}]: ${m.content}`,
    }));
}

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

function buildMessages(prevMessages: ChatMessage[], currentContext: string, sessionHistory: string): ChatMessage[] {
  const msgs: ChatMessage[] = [...prevMessages];
  if (sessionHistory) {
    msgs.push({ role: "user", content: `当前会话记录：\n${sessionHistory}\n\n${currentContext}` });
  } else {
    msgs.push({ role: "user", content: currentContext });
  }
  return msgs;
}

// ---- Tool executor for the LLM ----
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

// ---- Send tool call card as SSE ----
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

// ---- Run a streaming agent phase (with tool calling) ----
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

  // Signal stream end with final content
  streamEnd(controller, encoder, speaker, emoji, content, a2aLayer);

  return { content, toolResults: result.toolResults || [] };
}

// ---- Main Handler ----
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
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
          // ═══ Phase 1: L1 Discovery ═══
          const routerThinkingMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: "分析需求中，正在匹配最优 Agent 组合...",
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
          const protocolFlow = routerResult?.protocolFlow || "标准 A2A 协作流程";

          const routerMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: `${routerAnalysis}\n\n选中：${selectedAgents.join("、")}\n\nA2A流程：${protocolFlow}`,
            a2aLayer: "L1", isSystem: true,
          };
          history.push(routerMsg);
          await writeSSE(controller, encoder, routerMsg);

          const { fullContext } = buildContextString(prevHistory, message, routerAnalysis, selectedAgents, fileContext);

          // ═══ Phase 2: Plan & Tasks ═══
          const planThinkingMsg: AgentMessage = {
            speaker: "Planner", emoji: "📋",
            content: "制定执行计划中...",
            a2aLayer: "L1", isSystem: true,
          };
          history.push(planThinkingMsg);
          await writeSSE(controller, encoder, planThinkingMsg);

          const plannerMsgs = buildMessages(prevMessages, fullContext, formatHistory(history));
          const plannerRaw = await callLLM(buildPlannerPrompt(), plannerMsgs, apiKey, baseUrl, model);
          const plannerResult = parsePlannerResponse(plannerRaw.content);

          const plan = plannerResult?.plan || "分析需求 → 分工协作 → 综合交付";
          const tasks = plannerResult?.tasks || selectedAgents.map((a) => ({
            name: `${a}分析`,
            agent: a,
            description: `从 ${a} 的专业角度分析用户需求`,
          }));

          const planMsg: AgentMessage = {
            speaker: "Planner", emoji: "📋",
            content: `【执行计划】\n${plan}`,
            a2aLayer: "L1", isSystem: true,
          };
          history.push(planMsg);
          await writeSSE(controller, encoder, planMsg);

          const taskList = tasks.map((t: { name: string; agent: string }, i: number) =>
            `  ${i + 1}. ${t.name} → ${t.agent}`
          ).join("\n");
          const taskMsg: AgentMessage = {
            speaker: "Planner", emoji: "✅",
            content: `【任务清单】\n${taskList}`,
            a2aLayer: "L1", isSystem: true,
          };
          history.push(taskMsg);
          await writeSSE(controller, encoder, taskMsg);

          // ═══ Phase 3: L3 Credit ═══
          const creditMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: `[A2A-Credit] ${selectedAgents.join("、")} 信用核查通过。\n各 Agent 历史协作评分：${selectedAgents.map((a) => `${a} ★★★★★`).join(" | ")}\nL3 信用确认完成，进入 L4 协商阶段。`,
            a2aLayer: "L3", isSystem: true,
          };
          history.push(creditMsg);
          await writeSSE(controller, encoder, creditMsg);

          // ═══ Phase 4: L4 Negotiation — Round 1 (streaming + tool calling) ═══
          for (let i = 0; i < selectedAgents.length; i++) {
            const agentName = selectedAgents[i];
            const taskInfo = tasks.find((t: { agent: string }) => t.agent === agentName);
            const agentData = agents.find((a) => a.name === agentName);
            const agentEmoji = agentData?.emoji || "🤖";
            const agentPrompt = buildAgentPrompt(agentName);

            if (!agentPrompt) {
              const fallback: AgentMessage = { speaker: agentName, emoji: agentEmoji, content: "收到任务，正在分析中...", a2aLayer: "L4" };
              history.push(fallback);
              await writeSSE(controller, encoder, fallback);
              continue;
            }

            // Inject task + tool permissions
            const taskedPrompt = taskInfo
              ? agentPrompt.replace(
                  "## 协作规则",
                  `## 你的任务\n${taskInfo.name}：${taskInfo.description}\n\n## 工具权限\n你可以调用以下工具：\n- file_write: 创建/编辑文件（代码、配置、笔记等）\n- file_read: 读取其他 Agent 写的文件\n- generate_document: 生成正式 docx/xlsx 文档\n如果任务需要产出文件，直接调用工具。调用工具后简要说一句即可。\n\n## 协作规则`
                )
              : agentPrompt.replace(
                  "## 协作规则",
                  `## 工具权限\n你可以调用以下工具：\n- file_write: 创建/编辑文件\n- file_read: 读取文件\n- generate_document: 生成正式文档\n如果任务需要产出文件，直接调用工具。\n\n## 协作规则`
                );

            const msgs = buildMessages(prevMessages, fullContext, formatHistory(history));

            try {
              const { content, toolResults } = await runStreamingAgent(
                controller, encoder, taskedPrompt, msgs, apiKey, baseUrl, model,
                agentName, agentEmoji, "L4", true, 4096
              );

              history.push({ speaker: agentName, emoji: agentEmoji, content, a2aLayer: "L4" });

              // Send tool cards
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

          // ═══ Phase 3.5: L5 Affection — Round 2 (streaming) ═══
          if (selectedAgents.length >= 2) {
            const r2Notice: AgentMessage = {
              speaker: "Router", emoji: "🔄",
              content: "[A2A-L5] 进入第二轮深度讨论。各 Agent 将互相评审、补充和深化彼此的方案。",
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

          // ═══ Phase 5: L6 Arbitration (streaming) ═══
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

          // ═══ Phase 6: Quality Gate (streaming) ═══
          const qgMsgs = buildMessages(prevMessages, fullContext, formatHistory(history));
          try {
            const { content } = await runStreamingAgent(
              controller, encoder, buildQualityGatePrompt(), qgMsgs, apiKey, baseUrl, model,
              "Quality Gate", "✅", "", false, 4096
            );
            history.push({ speaker: "Quality Gate", emoji: "✅", content, isSystem: true });
          } catch (e) {
            const qgMsg: AgentMessage = {
              speaker: "Quality Gate", emoji: "✅",
              content: "协作完成。请查看各 Agent 的分析结果。",
              isSystem: true,
            };
            history.push(qgMsg);
            await writeSSE(controller, encoder, qgMsg);
          }

          // ═══ Phase 7: L7 Federation — 最终交付 (streaming + tools) ═══
          const outputAgentName = selectedAgents[0];
          const outputAgent = agents.find((a) => a.name === outputAgentName);
          if (outputAgent) {
            const outputSystemPrompt = `你是 OmniMind Nexus 的最终交付负责人 **${outputAgent.name}**（${outputAgent.role}），L7 Federation 层。

## 你的性格
${outputAgent.personality}

## 你的专长
${outputAgent.description}

## 任务
前面所有 Agent 已完成两轮讨论 + 仲裁 + 质量审核。你的任务是：
1. 阅读所有对话记录，提取所有可交付成果
2. 综合所有 Agent 的最佳方案，形成一个完整的最终交付物
3. 判断用户意图：如果用户明确需要报告/文档/方案/表格等正式交付物，调用 generate_document 工具生成文件
   - 文字类内容（报告/方案/文案）→ format: "docx"
   - 数据表格类内容 → format: "xlsx"
   - title: 有意义的文档标题
   - content: 完整的 Markdown 格式内容
4. 如果用户只是咨询/讨论/闲聊，不需要生成文档，直接给出最终回复即可

## 重要
- 只在用户需要正式交付物时才调用工具，不要无脑生成文档
- 不要输出 JSON 格式，直接自然语言回复`;

            const outMsgs = buildMessages(prevMessages, fullContext, formatHistory(history));

            try {
              const { content, toolResults } = await runStreamingAgent(
                controller, encoder, outputSystemPrompt, outMsgs, apiKey, baseUrl, model,
                outputAgent.name, outputAgent.emoji, "L7", true, 8192
              );

              history.push({ speaker: outputAgent.name, emoji: outputAgent.emoji, content, a2aLayer: "L7" });

              // Send tool cards for L7
              if (toolResults.length > 0) {
                for (const tr of toolResults) {
                  await sendToolCard(controller, encoder, outputAgent.name, outputAgent.emoji, "L7", tr.name, tr.result);
                }
              } else {
                // Fallback: check user intent for document generation
                const userWantsDoc = /生成|输出|导出|下载|写(一份|个)|制作|帮我|报告|文档|docx|xlsx|表格|方案|清单/i.test(message);

                if (userWantsDoc) {
                  const isXlsx = /xlsx|表格|excel|spreadsheet/i.test(message + content);
                  const format = isXlsx ? "xlsx" : "docx";
                  const titleMatch = content.match(/《([^》]+)》/) ||
                    message.match(/(?:报告|文档|方案|清单|表格)[:：]?\s*([^\n，。!?])/);
                  const title = titleMatch?.[1]?.trim() || message.slice(0, 30);

                  const allAgentOutputs = history
                    .filter((m) => !m.isSystem || m.a2aLayer === "L7")
                    .map((m) => `## ${m.speaker}${m.a2aLayer ? ` (${m.a2aLayer})` : ""}\n${m.content}`)
                    .join("\n\n");

                  const docContent = content.length > 500
                    ? content
                    : `${allAgentOutputs}\n\n## 最终交付\n${content}`;

                  try {
                    const genResult = await executeGenerateDocument({ format, title, content: docContent });
                    if (genResult.success) {
                      const docMsg: AgentMessage = {
                        speaker: outputAgent.name,
                        emoji: outputAgent.emoji,
                        content: genResult.fileName,
                        a2aLayer: "L7",
                        isSystem: true,
                        toolName: "generate_document",
                        toolAction: `生成 ${genResult.format?.toUpperCase()} 文档`,
                        fileUrl: genResult.fileUrl,
                        downloadName: genResult.fileName,
                        fileFormat: genResult.format,
                      };
                      await writeSSE(controller, encoder, docMsg);
                    }
                  } catch (e) {
                    console.error("[L7] Document generation error:", e);
                  }
                }
              }
            } catch (e) {
              const errMsg: AgentMessage = {
                speaker: outputAgent.name, emoji: outputAgent.emoji,
                content: `[超时/错误] ${e instanceof Error ? e.message : "执行失败"}`,
                a2aLayer: "L7", isSystem: true,
              };
              history.push(errMsg);
              await writeSSE(controller, encoder, errMsg);
            }
          }

          // ═══ Phase 8: L2 Memory ═══
          const memMsg: AgentMessage = {
            speaker: "Router", emoji: "🔀",
            content: `[A2A-Mem] 本次协作完成。涉及 ${selectedAgents.length} 个 Agent、${selectedAgents.length >= 2 ? "两轮" : "一轮"}讨论、${history.length} 条消息。结论已写入 L2 共享记忆。`,
            a2aLayer: "L2", isSystem: true,
          };
          history.push(memMsg);
          await writeSSE(controller, encoder, memMsg);

        } catch (e) {
          const errMsg: AgentMessage = {
            speaker: "System", emoji: "⚠️",
            content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
            isSystem: true,
          };
          await writeSSE(controller, encoder, errMsg);
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
  } catch (e) {
    console.error("Chat API error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
