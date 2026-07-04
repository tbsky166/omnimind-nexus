import { agents } from "@/data/agents";

// ---- Types ----
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  executedToolCalls: ToolCall[];
  toolResults: { name: string; result: string }[];
}

// ---- Tool Definitions ----
export const DOC_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "generate_document",
      description: "将协作成果生成为可下载的正式文档（docx/xlsx）。用于最终交付报告、方案、表格等。",
      parameters: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["docx", "xlsx"],
            description: "文档格式：docx 适用于报告/方案/文案，xlsx 适用于数据表格",
          },
          title: { type: "string", description: "文档标题" },
          content: { type: "string", description: "完整 Markdown 内容" },
        },
        required: ["format", "title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_write",
      description: "在 Agent 工作区创建、编辑或追加文件。用于写代码、配置文件、笔记、草稿等。文件保存在 /workspace/ 目录下。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "文件名或相对路径，如 solution.py、config.json、notes.md" },
          content: { type: "string", description: "文件完整内容" },
          action: {
            type: "string",
            enum: ["create", "edit", "append"],
            description: "create=新建/覆盖, edit=编辑覆盖, append=追加到末尾",
          },
        },
        required: ["path", "content", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_read",
      description: "读取 Agent 工作区中的文件内容。用于查看之前 Agent 写入的文件。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "文件名" },
        },
        required: ["path"],
      },
    },
  },
];

// ---- Agent Prompt Builder ----
export function buildAgentPrompt(agentName: string): string {
  const cleanName = agentName.replace(/^[\p{Emoji_Presentation}\p{Emoji}\s]+/u, "").trim();
  let agent = agents.find((a) => a.name === cleanName || a.name === agentName);

  if (!agent) {
    const englishMap: Record<string, string> = {
      writer: "写作 Agent", researcher: "市场研究", educator: "教育 Agent",
      coder: "编码 Agent", architect: "架构师", reviewer: "审查 Agent",
      refactorer: "重构 Agent", tester: "测试 Agent", security: "安全 Agent",
      performance: "性能 Agent", devops: "运维 Agent", "data analyst": "数据分析",
      strategist: "策略 Agent", finance: "财务 Agent", pm: "产品 Agent",
      product: "产品 Agent", "market research": "市场研究", negotiator: "谈判 Agent",
      legal: "法律 Agent", "project manager": "项目管理", designer: "设计 Agent",
      translator: "翻译 Agent", "media agent": "多媒体 Agent", "ai/ml": "AI/ML Agent",
      "ml agent": "AI/ML Agent", gaming: "游戏 Agent", mobile: "移动端 Agent",
      iot: "IoT Agent", dba: "数据库 Agent", "database agent": "数据库 Agent",
      social: "社媒 Agent", hr: "HR Agent", support: "客服 Agent",
      "customer support": "客服 Agent", scientist: "科研 Agent", "science agent": "科研 Agent",
      a11y: "无障碍 Agent", "accessibility agent": "无障碍 Agent", creator: "Creator",
    };
    const mappedName = englishMap[cleanName.toLowerCase()];
    if (mappedName) agent = agents.find((a) => a.name === mappedName);
  }

  if (!agent) {
    agent = agents.find(
      (a) => a.name.includes(cleanName) || cleanName.includes(a.name) || a.role.toLowerCase().includes(cleanName.toLowerCase())
    );
  }

  if (!agent) return "";

  return `你是 OmniMind Nexus 中的 **${agent.name}**（${agent.role}），通过 A2A 协议与其他 Agent 协作。

## 你的性格
${agent.personality}

## 你的专长
${agent.description}

## 协作规则
1. 你必须给出**具体、可执行的产出**——代码、方案、文案、数据、步骤等，而非仅分析
2. 你可以引用、补充或质疑其他 Agent 的观点，让协作更深入
3. 如果其他 Agent 已经给出了好方案，在其基础上深化而非重复
4. 你的回复必须是完整的可交付成果，用户拿到就能用
5. 你是最终交付负责人时，完成分析后应调用 generate_document 工具生成正式文档

## 输出格式
直接用自然语言回复，100-400字，必须包含具体可交付成果。不要输出 JSON，不要用代码块包裹回复。`;
}

// ---- Router Prompt ----
export function buildRouterPrompt(): string {
  return `你是 OmniMind Nexus 的 **Router**，A2A 协议 L1 层核心。

## 核心职责
1. 分析用户需求的核心领域、复杂度和依赖关系
2. 从 32 个 Agent 中选出最合适的 2-4 个，考虑互补性
3. 规划 A2A 协议交互流程
4. 如有上下文，考虑之前对话的延续性

## 需求分类规则（必须遵守）

### 闲聊/问候/无明确任务
关键词：你好、嗨、hello、谢谢、再见、你是谁、介绍一下、在吗
→ 选 1 个 Creative 类 Agent（写作/教育/翻译/客服），禁止选 Engineering 类
示例："你好" → 写作 Agent 或 客服 Agent

### 技术/编程/代码
关键词：代码、bug、报错、优化、架构、接口、API、部署、数据库、SQL、算法、重构、测试、安全、性能
→ 从 Engineering 类选 2-3 个 + 可选 1 个 Business 类
示例："帮我写个登录接口" → 架构师 + 编码 Agent + 安全 Agent

### 数据分析/图表/报表
关键词：数据、分析、图表、统计、报表、Excel、CSV、趋势、预测
→ 数据分析 + 1-2 个 Business 类 + 可选 1 个 Creative 类
示例："分析这份销售数据" → 数据分析 + 策略 Agent + 写作 Agent

### 商业/策略/创业
关键词：商业、策略、市场、竞品、定价、融资、产品、需求、PRD、用户、增长
→ 从 Business 类选 2-3 个 + 可选 1 个 Creative 类
示例："做竞品分析" → 市场研究 + 策略 Agent + 产品 Agent

### 创意/写作/设计
关键词：写、画、设计、翻译、视频、游戏、UI、文案、品牌、配色
→ 从 Creative 类选 2-3 个
示例："帮我写一篇文案" → 写作 Agent + 设计 Agent

### 法律/合规/合同
关键词：法律、合同、合规、隐私、GDPR、条款、知识产权、版权
→ 法律 Agent + 1-2 个相关 Business 类
示例："审查这份合同" → 法律 Agent + 谈判 Agent

### 项目管理/团队
关键词：项目、计划、进度、任务、团队、资源、排期、里程碑
→ 项目管理 + 1-2 个相关 Agent
示例："帮我排项目计划" → 项目管理 + 架构师

## 选人原则
1. 优先选相关领域的 Agent，不要选无关的
2. 闲聊类绝不选 Engineering 类 Agent（编码、测试、安全、运维等）
3. 2-4 个 Agent 即可，宁少勿多
4. 如果用户需求模糊，选 1-2 个通用 Agent（写作/教育/产品）先探路

## 可用 Agent 列表
${agents.map((a) => `- ${a.emoji} ${a.name}（${a.role}，${a.category}类）`).join("\n")}

## 回复格式
输出 JSON：
- analysis: 需求分析（2-3句话，说明属于哪个分类）
- selectedAgents: 选中的 Agent 名字列表（2-4个，必须使用中文原名）
- reasoning: 每个 Agent 被选中的原因及协作顺序
- protocolFlow: A2A 协议流程描述

直接输出 JSON，不要其他文字。`;
}

// ---- Arbitration Prompt ----
export function buildArbitratorPrompt(): string {
  return `你是 OmniMind Nexus 的 A2A 仲裁组（L6 层）。
1. 逐一分析每个 Agent 的立场和论据
2. 基于事实和最佳实践做出裁决
3. 提取各方的正确部分，融合成最优方案
4. 如有必要，给出少数派报告

直接用自然语言回复，100-300字。不要输出 JSON。`;
}

// ---- Quality Gate Prompt ----
export function buildQualityGatePrompt(): string {
  return `你是 OmniMind Nexus 的 Quality Gate（质量门禁）。
综合所有 Agent 的分析和产出，输出一个完整的最终交付物。

## 要求
1. 阅读所有 Agent 发言，提取所有具体方案、代码、数据、文案
2. 整合成完整、用户可直接使用的最终结果
3. 检查遗漏或矛盾，补充完善

直接用自然语言回复，200-500字。不要输出 JSON。`;
}

// ---- Multi-round Discussion Prompt (Round 2) ----
export function buildRound2Prompt(agentName: string, otherAgents: string[]): string {
  const basePrompt = buildAgentPrompt(agentName);
  if (!basePrompt) return "";

  return basePrompt.replace(
    "## 协作规则",
    `## 第二轮讨论规则
阅读所有其他 Agent 的发言，进行第二轮深度讨论：
1. 引用并评价其他 Agent 的观点（${otherAgents.join("、")}）
2. 明确指出你同意什么、不同意什么、为什么
3. 在你的专长领域，深化或修正之前的方案
4. 如果发现其他 Agent 的方案有遗漏或错误，直接指出并补充
5. 最终给出一个更完善的版本

## 协作规则`
  );
}

// ---- LLM Call (supports tools) ----
export async function callLLM(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number = 4096,
  tools?: ToolDefinition[]
): Promise<LLMResponse> {
  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const body: Record<string, unknown> = {
    model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  return {
    content: message?.content || "",
    toolCalls: message?.tool_calls || [],
    executedToolCalls: [],
    toolResults: [],
  };
}

// ---- LLM Call with Tool Loop ----
export async function callLLMWithTools(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number = 4096,
  tools: ToolDefinition[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>
): Promise<LLMResponse> {
  const currentMessages = [...messages];
  let maxRounds = 2;
  const allToolCalls: ToolCall[] = [];
  const allToolResults: { name: string; result: string }[] = [];

  while (maxRounds-- > 0) {
    const result = await callLLM(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, tools);

    // No tool calls? Return the result with all executed tool calls
    if (result.toolCalls.length === 0) {
      return { ...result, executedToolCalls: allToolCalls, toolResults: allToolResults };
    }

    // Collect tool calls
    allToolCalls.push(...result.toolCalls);

    // Add assistant message with tool calls
    currentMessages.push({
      role: "assistant",
      content: result.content || "",
      tool_calls: result.toolCalls,
    });

    // Execute each tool call
    for (const tc of result.toolCalls) {
      let toolResult: string;
      try {
        const args = JSON.parse(tc.function.arguments);
        toolResult = await executeTool(tc.function.name, args);
        allToolResults.push({ name: tc.function.name, result: toolResult });
      } catch (e) {
        toolResult = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
      }

      currentMessages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: tc.id,
      });
    }
  }

  // Final call without tools to get the summary
  const finalResult = await callLLM(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens);
  return { ...finalResult, executedToolCalls: allToolCalls, toolResults: allToolResults };
}

// ---- Streaming LLM Call ----
export async function callLLMStream(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number = 4096,
  tools?: ToolDefinition[],
  onToken?: (token: string) => void,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const body: Record<string, unknown> = {
    model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          onToken?.(delta.content);
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallMap.has(idx)) {
              toolCallMap.set(idx, { id: "", name: "", arguments: "" });
            }
            const entry = toolCallMap.get(idx)!;
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name = tc.function.name;
            if (tc.function?.arguments) entry.arguments += tc.function.arguments;
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  const toolCalls: ToolCall[] = [];
  for (const [, entry] of toolCallMap) {
    if (entry.name) {
      toolCalls.push({
        id: entry.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "function",
        function: { name: entry.name, arguments: entry.arguments },
      });
    }
  }

  return { content, toolCalls, executedToolCalls: [], toolResults: [] };
}

// ---- Streaming LLM Call with Tool Loop ----
export async function callLLMWithToolsStream(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number,
  tools: ToolDefinition[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  onToken?: (token: string) => void,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const currentMessages = [...messages];
  let maxRounds = 2;
  const allToolCalls: ToolCall[] = [];
  const allToolResults: { name: string; result: string }[] = [];

  while (maxRounds-- > 0) {
    const result = await callLLMStream(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, tools, onToken, signal);

    if (result.toolCalls.length === 0) {
      return { ...result, executedToolCalls: allToolCalls, toolResults: allToolResults };
    }

    allToolCalls.push(...result.toolCalls);
    currentMessages.push({
      role: "assistant",
      content: result.content || "",
      tool_calls: result.toolCalls,
    });

    for (const tc of result.toolCalls) {
      let toolResult: string;
      try {
        const args = JSON.parse(tc.function.arguments);
        toolResult = await executeTool(tc.function.name, args);
        allToolResults.push({ name: tc.function.name, result: toolResult });
      } catch (e) {
        toolResult = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
      currentMessages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: tc.id,
      });
    }
  }

  // Final call without tools, still stream
  const finalResult = await callLLMStream(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, undefined, onToken, signal);
  return { ...finalResult, executedToolCalls: allToolCalls, toolResults: allToolResults };
}

// ---- Planner Prompt (Plan + Tasks) ----
export function buildPlannerPrompt(): string {
  return `你是 OmniMind Nexus 的 Planner。用户发来一个需求，Router 已选好 Agent。你需要制定执行计划并拆解为任务。

## 可用 Agent
${agents.map((a) => `- ${a.emoji} ${a.name}（${a.role}）`).join("\n")}

## 要求
1. 制定一个 3-5 步的执行计划，每步一句话
2. 将计划拆解为具体任务，每个任务指定一个 Agent 负责
3. 任务描述要具体，Agent 看到就知道该做什么

## 回复格式（单行 JSON）
{
  "plan": "步骤1: xxx\n步骤2: yyy\n步骤3: zzz",
  "tasks": [
    {"name": "任务名称", "agent": "Agent名字（中文原名）", "description": "具体任务描述"}
  ]
}

直接输出 JSON，不要其他文字。`;
}

// ---- L7 Federation Prompt ----
export function buildL7Prompt(agentName: string, agentRole: string, agentPersonality: string, agentDescription: string): string {
  return `你是 OmniMind Nexus 的最终交付负责人 **${agentName}**（${agentRole}），L7 Federation 层。

## 你的性格
${agentPersonality}

## 你的专长
${agentDescription}

## 任务
前面所有 Agent 已完成讨论 + 仲裁 + 质量审核。你的任务是：
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
}

// ---- Parsers ----
export function parsePlannerResponse(raw: string): {
  plan: string;
  tasks: { name: string; agent: string; description: string }[];
} | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.plan && Array.isArray(parsed.tasks)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
export function parseRouterResponse(raw: string): {
  analysis: string;
  selectedAgents: string[];
  reasoning: string;
  protocolFlow: string;
} | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.selectedAgents && Array.isArray(parsed.selectedAgents)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}