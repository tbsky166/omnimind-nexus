// ═══════════════════════════════════════════════════════════════
// MoA (Mixture of Agents) — 多模型会诊+拍板机制
// 参考 Hermes Agent 的 MoA 架构：
// 多个"专家模型"独立分析同一问题 → 一个"主任模型"综合拍板
// ═══════════════════════════════════════════════════════════════

import { callLLM, type ChatMessage } from "@/lib/prompt";

export interface MoaConfig {
  /** 专家模型列表 / List of expert models */
  expertModels: {
    model: string;
    baseUrl: string;
    apiKey: string;
    name: string;
    /** 专家角色描述 / Expert role description */
    role: string;
  }[];
  /** 主任模型（拍板者）/ Chief model (arbitrator) */
  chief: {
    model: string;
    baseUrl: string;
    apiKey: string;
  };
  /** 最大并发数 / Max concurrent experts */
  maxConcurrency: number;
}

export interface ExpertOpinion {
  model: string;
  name: string;
  role: string;
  content: string;
  /** 置信度（0-1）/ Confidence score */
  confidence: number;
  /** 耗时 ms / Duration in ms */
  duration: number;
}

export interface MoaResult {
  /** 最终综合答案 / Final synthesized answer */
  finalAnswer: string;
  /** 各专家意见 / All expert opinions */
  expertOpinions: ExpertOpinion[];
  /** 推理过程摘要 / Reasoning summary */
  reasoning: string;
  /** 总耗时 ms / Total duration */
  totalDuration: number;
  /** 使用的专家数量 / Number of experts used */
  expertCount: number;
}

/**
 * 并发调用多个专家模型 / Concurrently call multiple expert models
 */
async function callExpert(
  model: string,
  baseUrl: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  name: string,
  role: string,
): Promise<ExpertOpinion> {
  const startTime = Date.now();
  try {
    const response = await callLLM(
      systemPrompt,
      messages,
      apiKey,
      baseUrl,
      model,
      2048,
    );
    const duration = Date.now() - startTime;

    // 估算置信度：基于回答长度和是否包含明确结论 / Estimate confidence based on response length and presence of conclusion
    let confidence = 0.5;
    const content = response.content;
    if (content && content.length > 100) confidence += 0.1;
    if (content && content.length > 500) confidence += 0.1;
    if (content && /结论|建议|总结|推荐|因此|所以/.test(content)) confidence += 0.1;
    if (content && !/不确定|无法确定|缺乏信息|抱歉/.test(content)) confidence += 0.1;
    confidence = Math.min(confidence, 0.95);

    return {
      model,
      name,
      role,
      content: content || "(无响应)",
      confidence,
      duration,
    };
  } catch (e) {
    const duration = Date.now() - startTime;
    return {
      model,
      name,
      role,
      content: `[错误: ${e instanceof Error ? e.message : "未知"}]`,
      confidence: 0,
      duration,
    };
  }
}

/**
 * 运行 MoA 混合智能体流程 / Run the MoA pipeline
 */
export async function runMoA(
  userQuestion: string,
  conversationHistory: ChatMessage[],
  config: MoaConfig,
): Promise<MoaResult> {
  const startTime = Date.now();

  // 并发调用所有专家 / Concurrently call all experts
  const expertPromises = config.expertModels.map((expert) =>
    callExpert(
      expert.model,
      expert.baseUrl,
      expert.apiKey,
      `你是一位 AI 专家，你的专长领域是：${expert.role}。请从你的专业角度分析用户的问题。`,
      conversationHistory,
      expert.name,
      expert.role,
    ),
  );

  const expertOpinions = await Promise.all(expertPromises);

  // 主任模型综合 / Chief model synthesizes
  const chiefSystemPrompt = `你是一个 AI 主任仲裁官。你需要综合多位专家对同一问题的独立分析，给出最终答案。

## 你的任务
1. 仔细阅读每位专家的意见
2. 找出共识点和分歧点
3. 优先采纳高置信度专家的意见
4. 如果存在分歧，基于逻辑推理选择最合理的方案
5. 给出一个清晰、全面的最终答案
6. 在答案末尾，简要说明你的综合推理过程

## 输出格式
【最终答案】
（详细回答用户问题）

【推理过程】
- 共识点：...
- 分歧点：...
- 采纳理由：...`;

  const opinionsText = expertOpinions
    .map(
      (o, i) =>
        `### 专家 ${i + 1}：${o.name}（角色：${o.role}）\n` +
        `模型：${o.model}\n` +
        `置信度：${(o.confidence * 100).toFixed(0)}%\n` +
        `意见：\n${o.content}\n`,
    )
    .join("\n---\n\n");

  let finalAnswer = "";
  let reasoning = "";

  try {
    const chiefResponse = await callLLM(
      chiefSystemPrompt,
      [{ role: "user", content: `用户问题：${userQuestion}\n\n以下是各专家意见：\n\n${opinionsText}\n\n请综合以上意见，给出最终答案。` }],
      config.chief.apiKey,
      config.chief.baseUrl,
      config.chief.model,
      4096,
    );

    // 解析主任模型的输出 / Parse chief model output
    const answerMatch = chiefResponse.content.match(/【最终答案】\s*([\s\S]*?)(?=【推理过程】|$)/);
    const reasoningMatch = chiefResponse.content.match(/【推理过程】\s*([\s\S]*?)$/);

    finalAnswer = answerMatch ? answerMatch[1].trim() : chiefResponse.content;
    reasoning = reasoningMatch ? reasoningMatch[1].trim() : "";
  } catch (e) {
    // 如果主任模型失败，用最高置信度专家的意见 / Fallback to highest confidence expert
    const best = expertOpinions
      .filter((o) => o.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)[0];
    finalAnswer = best
      ? `[MoA 主任模型调用失败，使用最高置信度专家(${best.name})的意见]\n\n${best.content}`
      : "[MoA 所有模型均调用失败]";
    reasoning = "主任模型调用失败，自动降级为最高置信度专家意见。";
  }

  const totalDuration = Date.now() - startTime;

  return {
    finalAnswer,
    expertOpinions,
    reasoning,
    totalDuration,
    expertCount: config.expertModels.length,
  };
}

/**
 * 快速 MoA：使用相同模型配置多个专家角色 / Quick MoA: use same model config for multiple expert roles
 * 适用场景：只有一个 API Key 但想用 MoA 获得多视角分析
 */
export async function runQuickMoA(
  userQuestion: string,
  conversationHistory: ChatMessage[],
  model: string,
  baseUrl: string,
  apiKey: string,
  expertRoles: { name: string; role: string }[] = DEFAULT_EXPERT_ROLES,
): Promise<MoaResult> {
  const config: MoaConfig = {
    expertModels: expertRoles.map((r) => ({
      model,
      baseUrl,
      apiKey,
      name: r.name,
      role: r.role,
    })),
    chief: { model, baseUrl, apiKey },
    maxConcurrency: 3,
  };

  return runMoA(userQuestion, conversationHistory, config);
}

/** 默认专家角色 / Default expert roles */
export const DEFAULT_EXPERT_ROLES: { name: string; role: string }[] = [
  { name: "逻辑分析师", role: "严谨的逻辑推理和数学分析，擅长从数据和事实出发推导结论" },
  { name: "创意顾问", role: "创新思维和发散性思考，擅长提出突破性方案和非常规解法" },
  { name: "风险评估师", role: "识别潜在风险和边缘情况，擅长从安全性和可行性角度审视问题" },
  { name: "产品经理", role: "用户需求和产品体验，擅长从用户视角评估方案的价值和可用性" },
];

/** 精简版专家角色（2 个专家，节省 token）/ Lite expert roles (2 experts, save tokens) */
export const LITE_EXPERT_ROLES: { name: string; role: string }[] = [
  { name: "分析师", role: "逻辑推理、数据分析、风险评估" },
  { name: "创意师", role: "创新思维、用户体验、方案设计" },
];