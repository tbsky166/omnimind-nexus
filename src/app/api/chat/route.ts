// 主 A2A 聊天 API 路由 — 多 Agent 协作的核心入口，通过 SSE 流式返回各阶段输出
// ═══ Beta 优化流水线：Router(分析+规划) → Credit → Round1(并行) → Round2(互评) → Arbitration(仲裁) → QG+L7(交付) ═══
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";
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
import { parseAgentDSL, serializeDSL } from "@/lib/agent-dsl";
import { generateAgentPackage, generateAgentRegistry } from "@/lib/agent-factory";
import { generateFullExtension } from "@/lib/nextjs-builder";
import { findTemplate } from "@/data/agent-templates";
import { executeGenerateDocument, executeFileWrite, executeFileRead, executeCodebaseRead, executeCodebaseList, executeCodebaseEdit } from "@/lib/document";
import { agents } from "@/data/agents";
import { addEntity, addRelation, applyForgettingCurve, generateGraphSummary } from "@/lib/knowledge-graph";
import { globalKnowledgeGraph, lastForgettingCurve } from "@/lib/kg-store";
import { createMetacognitionManager, startThinking, recordThinking, endThinking, formatReflectionReport } from "@/lib/metacognition";
import { runSwarmConsensus, createSwarmMemory, type SwarmConfig } from "@/lib/swarm";
import { runEvolution, initializePopulation, type EvolutionConfig, type EvolutionResult } from "@/lib/evolution";
import { calculateDiversity, type DiversityMetrics } from "@/lib/diversity";
import { analyzeCounterfactual, saveCounterfactualAnalysis } from "@/lib/counterfactual";
import { addMemory } from "@/lib/dreams";

// ── 全局元认知状态：追踪所有 Agent 的思维过程 / Global metacognition state: track all agents' thinking processes ──
const globalMetacognition = createMetacognitionManager({
  trackThinking: true,
  detectBiases: true,
  calibrateConfidence: true,
  autoReflect: true,
  reflectInterval: 5,
  minConfidenceForAction: 0.7,
  biasSeverityThreshold: 0.4,
  maxThinkingChainLength: 50,
});

// ── 模块级 tavilyApiKey（从 POST handler 设置，供 toolExecutor 使用）/ Module-level tavilyApiKey (set by POST handler, used by toolExecutor) ──
let currentTavilyApiKey: string | undefined;

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

// 自定义 Agent 持久化：将 Creator 生成的 Agent 元数据追加到 custom-agents.json / Persist custom agent metadata to JSON file
const CUSTOM_AGENTS_FILE = path.join(process.cwd(), "data", "custom-agents.json");

function persistCustomAgent(agent: { name: string; emoji: string; role: string; category: string; personality: string; description: string; dslSource?: string }) {
  const dir = path.dirname(CUSTOM_AGENTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CUSTOM_AGENTS_FILE)) fs.writeFileSync(CUSTOM_AGENTS_FILE, "[]");

  let list: Array<Record<string, unknown>> = [];
  try {
    list = JSON.parse(fs.readFileSync(CUSTOM_AGENTS_FILE, "utf-8"));
    if (!Array.isArray(list)) list = [];
  } catch { /* ignore */ }

  // 同名去重：更新已有记录 / Dedup by name: update if exists
  const existingIdx = list.findIndex((a) => a.name === agent.name);
  const record = {
    id: existingIdx >= 0 ? list[existingIdx].id : `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...agent,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : Date.now(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }

  fs.writeFileSync(CUSTOM_AGENTS_FILE, JSON.stringify(list, null, 2));
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

  if (name === "codebase_read") {
    const result = await executeCodebaseRead((args.path as string) || "", process.cwd());
    return JSON.stringify({
      success: result.success,
      tool: "codebase_read",
      filePath: result.filePath,
      content: result.content,
      size: result.size,
      message: result.message,
    });
  }

  if (name === "codebase_list") {
    const result = executeCodebaseList((args.path as string) || "", process.cwd());
    return JSON.stringify({
      success: result.success,
      tool: "codebase_list",
      dirPath: result.dirPath,
      entries: result.entries,
      message: result.message,
    });
  }

  if (name === "codebase_edit") {
    const result = executeCodebaseEdit(
      (args.path as string) || "",
      (args.old_string as string) || "",
      (args.new_string as string) || "",
      process.cwd()
    );
    return JSON.stringify({
      success: result.success,
      tool: "codebase_edit",
      filePath: result.filePath,
      message: result.message,
      linesChanged: result.linesChanged,
    });
  }

  if (name === "web_search") {
    const { webSearch, formatSearchResults } = await import("@/lib/search");
    const query = (args.query as string) || "";
    if (!query.trim()) {
      return JSON.stringify({ success: false, error: "搜索关键词不能为空" });
    }
    const result = await webSearch(query, currentTavilyApiKey);
    return JSON.stringify({
      success: true,
      tool: "web_search",
      query: result.query,
      answer: result.answer,
      results: result.results.slice(0, 5),
      formatted: formatSearchResults(result),
      searchTime: result.searchTime,
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
    } else if (parsed.tool === "codebase_edit") {
      const msg: AgentMessage = {
        speaker: agentName,
        emoji: agentEmoji,
        content: `编辑 ${parsed.filePath}（${parsed.linesChanged > 0 ? `+${parsed.linesChanged}` : parsed.linesChanged} 行）`,
        a2aLayer,
        toolName: "codebase_edit",
        toolAction: "编辑源码",
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
  // 工具循环需要更多时间（每轮 API 调用 + 工具执行）/ Tool loop needs more time (per-round API call + tool execution)
  const { signal, cleanup } = withTimeout(useTools ? 300000 : 120000);
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
  } catch (e) {
    // 出错时也要发送 streamEnd，否则前端会一直等待 / Must send streamEnd on error, otherwise frontend hangs
    streamEnd(controller, encoder, speaker, emoji, a2aLayer);
    throw e;
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
    const { message, history: prevHistory, fileContext, settings: clientSettings, _test } = await req.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    // 优先使用前端传入的设置，回退到环境变量 / Prefer client settings, fallback to env
    const apiKey = clientSettings?.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = clientSettings?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = clientSettings?.model || process.env.OPENAI_MODEL || "gpt-4o";

    // 功能开关 / Feature toggles
    const enableSwarm = clientSettings?.enableSwarm ?? true;
    const enableEvolution = clientSettings?.enableEvolution ?? false;
    const enableKnowledgeGraph = clientSettings?.enableKnowledgeGraph ?? true;
    const enableMetacognition = clientSettings?.enableMetacognition ?? true;

    // 设置模块级变量供 toolExecutor 使用 / Set module-level variable for toolExecutor
    currentTavilyApiKey = clientSettings?.tavilyApiKey;

    if (!apiKey) {
      return Response.json({ error: "API Key 未配置，请前往设置页面填写" }, { status: 500 });
    }

    // 测试连接模式 / Test connection mode
    if (_test) {
      return Response.json({ ok: true, model, baseUrl });
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

          // ── 蜂群模式检测：仅在开关启用且触发关键词时激活 / Swarm mode: only when toggle enabled and keywords match ──
          const swarmKeywords = /(蜂群|swarm|共识|consensus|集体决策|投票|群体智能|信息素|蚂蚁|ant colony|粒子群|pso)/i;
          const isSwarmMode = enableSwarm && swarmKeywords.test(message);
          if (isSwarmMode) {
            const swarmNotice: AgentMessage = {
              speaker: "Swarm Engine", emoji: "🐝",
              content: "检测到蜂群模式请求。启动信息素场，初始化蜂群 Agent，准备进行集体共识决策...",
              a2aLayer: "Swarm", isSystem: true,
            };
            history.push(swarmNotice);
            await writeSSE(controller, encoder, swarmNotice);

            // 构建蜂群配置 / Build swarm config
            const swarmConfig: SwarmConfig = {
              populationSize: selectedAgents.length * 5,
              maxIterations: 50,
              convergenceThreshold: 0.05,
              explorationRatio: 0.3,
              pheromoneWeight: 0.5,
              socialWeight: 0.3,
              cognitiveWeight: 0.2,
              inertiaWeight: 0.7,
              dimensions: 5,
              bounds: [0, 1],
            };

            const swarmMemory = createSwarmMemory(swarmConfig.dimensions);
            const fitnessFn = (position: number[]): number => {
              // 基于位置向量的适应度评估 / Fitness evaluation based on position vector
              return position.reduce((sum, p) => sum + p, 0) / position.length;
            };

            const consensusResult = runSwarmConsensus(swarmConfig, selectedAgents, fitnessFn);

            const swarmResult: AgentMessage = {
              speaker: "Swarm Engine", emoji: "🐝",
              content: `蜂群共识完成：
• 一致度：${(consensusResult.agreement * 100).toFixed(1)}%
• 解质量：${(consensusResult.quality * 100).toFixed(1)}%
• 迭代次数：${consensusResult.iterations}
• 收敛时间：${(consensusResult.convergenceTime / 1000).toFixed(1)}s
• 参与 Agent：${consensusResult.participants.join("、")}
${consensusResult.minorityReports.length > 0 ? `• 少数派报告：${consensusResult.minorityReports.length} 个` : ""}
${consensusResult.danceHistory.length > 0 ? `• 舞动通信：${consensusResult.danceHistory.length} 次` : ""}`,
              a2aLayer: "Swarm", isSystem: true,
            };
            history.push(swarmResult);
            await writeSSE(controller, encoder, swarmResult);
          }

          // ── 知识图谱：应用遗忘曲线（仅在开关启用时）/ Knowledge graph: apply forgetting curve (only when enabled) ──
          if (enableKnowledgeGraph) {
            const now = Date.now();
            if (now - lastForgettingCurve.value > 3600000) {
            applyForgettingCurve(globalKnowledgeGraph, 7 * 24 * 3600 * 1000);
            lastForgettingCurve.value = now;
            }
          }

          // ── 元认知：为每个 Agent 开始思维链（仅在开关启用时）/ Metacognition: start thinking chain (only when enabled) ──
          if (enableMetacognition) {
            for (const agentName of selectedAgents) {
              const agentData = agents.find((a) => a.name === agentName);
              if (agentData) {
                startThinking(globalMetacognition, `session_${Date.now()}`, agentName, agentName, message);
              }
            }
          }

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
              `## 工具权限\n你可以调用以下工具：\n- file_write: 创建/编辑文件（代码、配置、笔记等）\n- file_read: 读取其他 Agent 写的文件\n- generate_document: 生成正式 docx/xlsx 文档\n- web_search: 联网搜索最新信息（新闻、技术文档、实时数据等）\n\n**重要：调用工具后，必须用一句完整的话说明工具调用结果**（如"文档已生成"、"文件已创建"、"已搜索到相关结果"）。不要只调用工具不说话，必须给出文字回复。\n\n## 协作规则`
            );

            const msgs = buildMessages(prevMessages, fullContext, formatHistory(history));

            try {
              const { content, toolResults } = await runStreamingAgent(
                controller, encoder, taskedPrompt, msgs, apiKey, baseUrl, model,
                agentName, agentEmoji, "L4", true, 4096
              );

              history.push({ speaker: agentName, emoji: agentEmoji, content, a2aLayer: "L4" });

              // ── 人格进化事件 / Personality evolution event ──
              // 完成后通知前端对 Agent 进行性格进化
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "personality_evolve", agentName, feedbackType: "task_success", intensity: 0.7 })}\n\n`
              ));

              for (const tr of toolResults) {
                await sendToolCard(controller, encoder, agentName, agentEmoji, "L4", tr.name, tr.result);
              }

              // ── 知识图谱：从 Agent 响应中提取关键概念（仅在开关启用时）/ Extract key concepts (only when enabled) ──
              if (enableKnowledgeGraph) {
              const entityMatches = content.match(/(?:`[^`]+`)|(?:\b(?:API|SDK|CLI|REST|GraphQL|gRPC|WebSocket|HTTP|HTTPS|TCP|TLS|SSL|OAuth|JWT|SSO|React|Vue|Angular|Next\.js|Nuxt|Svelte|Express|Fastify|Nest|Django|Flask|FastAPI|Rails|Laravel|Spring|Gin|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Docker|Kubernetes|AWS|GCP|Azure|Vercel|Netlify|Cloudflare|Terraform|微服务|容器化|服务网格|事件驱动|领域驱动|CQRS|Machine Learning|Deep Learning|NLP|LLM|RAG|Vector DB|Embedding|机器学习|深度学习|自然语言处理|大语言模型|检索增强|Transformer|GAN|RL|神经网络|注意力机制|强化学习)\b)/gi);
              if (entityMatches) {
                const uniqueEntities = [...new Set(entityMatches.map((e) => e.replace(/`/g, "").trim()).filter((e) => e.length > 1 && e.length < 50))];
                for (const entityName of uniqueEntities) {
                  const existingEntity = globalKnowledgeGraph.entities.get(entityName);
                  if (!existingEntity) {
                    addEntity(globalKnowledgeGraph, {
                      name: entityName,
                      type: "concept",
                      confidence: 0.5,
                      tags: [agentName],
                      description: "",
                      embeddings: [],
                      source: agentName,
                      metadata: {},
                    });
                  } else {
                    existingEntity.confidence = Math.min(1, existingEntity.confidence + 0.05);
                    existingEntity.accessCount++;
                    if (!existingEntity.tags.includes(agentName)) existingEntity.tags.push(agentName);
                  }
                }
                // 建立 Agent 间的关系 / Create cross-agent relations
                for (const otherAgent of selectedAgents) {
                  if (otherAgent !== agentName) {
                    const hasRelation = globalKnowledgeGraph.relations.some(
                      (r) => r.from === agentName && r.to === otherAgent
                    );
                    if (!hasRelation) {
                      addRelation(globalKnowledgeGraph, {
                        from: agentName,
                        to: otherAgent,
                        type: "supports",
                        weight: 0.3,
                        confidence: 0.5,
                        context: "multi-agent-collaboration",
                        evidence: "auto-generated",
                      });
                    }
                  }
                }
              }
              } // end enableKnowledgeGraph

              // ── 元认知：记录思维步骤（仅在开关启用时）/ Record thinking step (only when enabled) ──
              if (enableMetacognition) {
              recordThinking(globalMetacognition, {
                type: "analysis",
                content: content.slice(0, 300),
                confidence: 0.75,
                assumptions: [],
                evidence: ["LLM 模型输出"],
                counterEvidence: [],
                stepNumber: 0,
                alternatives: [],
                biases: [],
              });
              } // end enableMetacognition
            } catch (e) {
              const errMsg: AgentMessage = {
                speaker: agentName, emoji: agentEmoji,
                content: `[超时/错误] ${e instanceof Error ? e.message : "执行失败"}，跳过此 Agent。`,
                a2aLayer: "L4", isSystem: true,
              };
              history.push(errMsg);
              await writeSSE(controller, encoder, errMsg);
              // 失败时降低风险偏好，提升严谨度
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "personality_evolve", agentName, feedbackType: "task_failure", intensity: 0.8 })}\n\n`
              ));
            }
          }

          // ═══ 认知多样性评估 / Cognitive diversity assessment ═══
          const l4Outputs = history
            .filter((m) => m.a2aLayer === "L4" && !m.isSystem)
            .map((m) => ({ agentName: m.speaker, content: m.content }));
          if (l4Outputs.length >= 2) {
            const diversity = calculateDiversity(l4Outputs);
            const diversityMsg: AgentMessage = {
              speaker: "🧠 多样性分析", emoji: "🧠",
              content: `认知多样性指数：${diversity.overallScore}/100 | 群体思维风险：${diversity.groupthinkRisk === "high" ? "🔴 高" : diversity.groupthinkRisk === "medium" ? "🟡 中" : "🟢 低"} | 识别视角：${diversity.perspectiveCount} 个`,
              a2aLayer: "L6", isSystem: true,
            };
            history.push(diversityMsg);
            await writeSSE(controller, encoder, diversityMsg);
            // 单独发送多样性数据供前端保存 / Send diversity data separately for frontend storage
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "diversity", ...diversity })}\n\n`));
          }

          // ═══ 反事实推理 / Counterfactual reasoning ═══
          const actualAgentNames = selectedAgents.filter((a) => a !== "Creator" || true);
          const diversityScore = l4Outputs.length >= 2
            ? calculateDiversity(l4Outputs).overallScore
            : 50;
          const cfAnalysis = analyzeCounterfactual(
            `session_${Date.now()}`,
            message.slice(0, 100),
            actualAgentNames,
            { efficiency: 70, quality: 75, diversity: diversityScore },
          );
          saveCounterfactualAnalysis(cfAnalysis);
          if (cfAnalysis.bestAlternative) {
            const cfMsg: AgentMessage = {
              speaker: "🔮 反事实分析", emoji: "🔮",
              content: `💡 发现更优组合：用「${cfAnalysis.bestAlternative.agents.join("、")}」替代当前组合，预计综合得分提升 ${cfAnalysis.bestAlternative.estimatedScore - Math.round(70 * 0.3 + 75 * 0.4 + diversityScore * 0.3)} 分。${cfAnalysis.bestAlternative.reasoning}`,
              a2aLayer: "L6", isSystem: true,
            };
            history.push(cfMsg);
            await writeSSE(controller, encoder, cfMsg);
          }

          // ═══ 记忆巩固 / Memory consolidation ═══
          for (const msg of l4Outputs) {
            addMemory(msg.agentName, `session_${Date.now()}`, msg.content, "insight", 60);
          }

          // ═══ 基因进化：基于本轮表现优化 Agent 参数（仅在开关启用时）/ Genetic evolution: optimize agent params (only when enabled) ═══
          if (enableEvolution && l4Outputs.length >= 2) {
            const evoNotice: AgentMessage = {
              speaker: "Evolution Engine", emoji: "🧬",
              content: "启动基因进化引擎，基于本轮 Agent 表现进行遗传算法优化...",
              a2aLayer: "Evolution", isSystem: true,
            };
            history.push(evoNotice);
            await writeSSE(controller, encoder, evoNotice);

            try {
              const evoConfig: EvolutionConfig = {
                populationSize: 20,
                eliteCount: 4,
                crossoverRate: 0.7,
                mutationRate: 0.2,
                tournamentSize: 3,
                maxGenerations: 10,
                targetFitness: 0.95,
                stagnationLimit: 5,
              };

              const evoResult = await runEvolution(
                evoConfig,
                async (chromosome) => {
                  // 适应度 = 基于多样性和 Agent 表现的综合评分
                  const params = chromosome.genes.reduce((acc, g) => {
                    acc[g.name] = g.value;
                    return acc;
                  }, {} as Record<string, number>);
                  const creativityBonus = (params.creativity ?? 0.5) * 0.3;
                  const rigorBonus = (1 - (params.risk_tolerance ?? 0.5)) * 0.3;
                  const diversityBonus = Math.min(1, diversityScore / 100) * 0.4;
                  return creativityBonus + rigorBonus + diversityBonus;
                },
              );

              const bestGenes = evoResult.bestChromosome.genes
                .slice(0, 5)
                .map((g) => `${g.name}: ${g.value.toFixed(2)}`);
              const evoResultMsg: AgentMessage = {
                speaker: "Evolution Engine", emoji: "🧬",
                content: `基因进化完成：
• 代数：${evoResult.totalGenerations}
• 最佳适应度：${evoResult.bestChromosome.fitness.toFixed(4)}
• 收敛原因：${evoResult.convergenceReason === "target_reached" ? "达到目标" : evoResult.convergenceReason === "stagnation" ? "进化停滞" : "达到最大代数"}
• 优化参数：${bestGenes.join("、")}
• 进化时间：${(evoResult.totalTime / 1000).toFixed(1)}s`,
                a2aLayer: "Evolution", isSystem: true,
              };
              history.push(evoResultMsg);
              await writeSSE(controller, encoder, evoResultMsg);
            } catch (evoErr) {
              const evoErrMsg: AgentMessage = {
                speaker: "Evolution Engine", emoji: "🧬",
                content: `基因进化跳过：${evoErr instanceof Error ? evoErr.message : "未知错误"}`,
                a2aLayer: "Evolution", isSystem: true,
              };
              history.push(evoErrMsg);
              await writeSSE(controller, encoder, evoErrMsg);
            }
          }

          // ═══ Agent 创建后处理 / Agent creation post-processing ═══
          const creatorMsgs = history.filter((m) => (m.speaker === "Creator" || m.speaker === "🧬 Creator") && m.a2aLayer === "L4");
          for (const creatorMsg of creatorMsgs) {
            const dslMatch = creatorMsg.content.match(/```dsl\n([\s\S]*?)\n```/);
            if (dslMatch) {
              const dslSource = dslMatch[1];
              const parsed = parseAgentDSL(dslSource);

              if (parsed.success && parsed.config) {
                // 持久化自定义 Agent 到注册表 / Persist custom agent to registry
                try {
                  const p = parsed.config.personality;
                  const personalityStr = `${p.type} · 细节${p.detail_level} · 风险${p.risk_tolerance} · 创造力${p.creativity}`;
                  persistCustomAgent({
                    name: parsed.config.name,
                    emoji: parsed.config.emoji || "🤖",
                    role: parsed.config.role,
                    category: parsed.config.category || "Specialized",
                    personality: personalityStr,
                    description: parsed.config.description,
                    dslSource: dslSource,
                  });
                } catch (e) {
                  console.error("持久化自定义 Agent 失败:", e);
                }

                // 生成 Agent 代码包 / Generate agent code package
                const pkg = generateAgentPackage(parsed.config);
                const ext = generateFullExtension(parsed.config);

                // 生成 Agent 入口代码文件 / Generate agent entry code file
                const agentCodeMsg: AgentMessage = {
                  speaker: "Creator", emoji: "🧬",
                  content: `已解析 DSL 并生成 Agent 代码包：\n\n• Agent 入口：可插入 agents.ts\n• 系统提示词：${parsed.config.name}Prompt\n• 工具定义：${parsed.config.name}Tools\n• API 路由：${ext.routes.length} 个\n• 组件：${ext.components.length} 个`,
                  a2aLayer: "L1", isSystem: true,
                };
                history.push(agentCodeMsg);
                await writeSSE(controller, encoder, agentCodeMsg);

                // 为每个生成的文件创建下载链接 / Create download links for each generated file
                const allFiles: { name: string; content: string; format: string }[] = [
                  { name: `${parsed.config.name.replace(/\s+/g, "_")}_agent.ts`, content: pkg.fullCode, format: "ts" },
                  { name: `${parsed.config.name.replace(/\s+/g, "_")}_dsl.adl`, content: serializeDSL(parsed.config), format: "adl" },
                ];

                for (const route of ext.routes) {
                  allFiles.push({
                    name: route.fileName,
                    content: route.code,
                    format: "ts",
                  });
                }

                for (const comp of ext.components) {
                  allFiles.push({
                    name: comp.fileName,
                    content: comp.code,
                    format: "tsx",
                  });
                }

                for (const file of allFiles) {
                  const fileMsg: AgentMessage = {
                    speaker: "Creator", emoji: "📦",
                    content: file.content,
                    fileUrl: `data:text/plain;base64,${Buffer.from(file.content).toString("base64")}`,
                    downloadName: file.name,
                    fileFormat: file.format,
                    toolName: "agent_create",
                    toolAction: `生成 ${file.name}`,
                    a2aLayer: "L1",
                  };
                  history.push(fileMsg);
                  await writeSSE(controller, encoder, fileMsg);
                }
              } else {
                // DSL 解析失败 / DSL parse failed
                const errMsg: AgentMessage = {
                  speaker: "Creator", emoji: "⚠️",
                  content: `DSL 解析警告：${parsed.errors.join("；")}。请检查语法。`,
                  a2aLayer: "L1", isSystem: true,
                };
                history.push(errMsg);
                await writeSSE(controller, encoder, errMsg);
              }
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

          // ── 元认知：结束所有 Agent 的思维链并生成反思（仅在开关启用时）/ End thinking chains (only when enabled) ──
          const reflectionReports: string[] = [];
          if (enableMetacognition) {
            for (const agentName of selectedAgents) {
              const chain = endThinking(globalMetacognition, "多轮讨论完成", 0.8);
              if (chain && globalMetacognition.reports.length > 0) {
                const latestReport = globalMetacognition.reports[globalMetacognition.reports.length - 1];
                if (latestReport.agentId === agentName) {
                  reflectionReports.push(formatReflectionReport(latestReport));
                }
              }
            }
          }

          // ── 知识图谱摘要（仅在开关启用时）/ Knowledge graph summary (only when enabled) ──
          const kgSummary = enableKnowledgeGraph ? generateGraphSummary(globalKnowledgeGraph) : "";

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
              content: `[Quality Gate 阶段出错] ${e instanceof Error ? e.message : "执行失败"}。请查看各 Agent 的分析结果。`,
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

          // ── 知识图谱洞察：发送知识图谱统计（仅在开关启用时）/ Knowledge graph insights (only when enabled) ──
          if (enableKnowledgeGraph && globalKnowledgeGraph.entities.size > 0) {
            const entityArray = Array.from(globalKnowledgeGraph.entities.values());
            const sortedByAccess = entityArray.sort((a, b) => b.accessCount - a.accessCount);
            const recentEntities = sortedByAccess.slice(0, 5);
            const hotEntities = sortedByAccess.slice(0, 5);
            const kgMsg: AgentMessage = {
              speaker: "Knowledge Graph", emoji: "🧠",
              content: `知识图谱更新：
• 实体总数：${globalKnowledgeGraph.entities.size}
• 关系总数：${globalKnowledgeGraph.relations.length}
• 最新实体：${recentEntities.map((e) => e.name).join("、")}
• 热门实体：${hotEntities.map((e) => `${e.name}(${e.accessCount})`).join("、")}`,
              a2aLayer: "KG", isSystem: true,
            };
            history.push(kgMsg);
            await writeSSE(controller, encoder, kgMsg);
          }

          // ── 元认知反思摘要（仅在开关启用时）/ Metacognition reflection summary (only when enabled) ──
          if (enableMetacognition && reflectionReports.length > 0) {
            const metaMsg: AgentMessage = {
              speaker: "Metacognition", emoji: "🪞",
              content: `元认知反思完成：已为 ${reflectionReports.length} 个 Agent 生成反思报告。认知偏差检测、置信度校准、改进建议已生成。`,
              a2aLayer: "Meta", isSystem: true,
            };
            history.push(metaMsg);
            await writeSSE(controller, encoder, metaMsg);
          }

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
