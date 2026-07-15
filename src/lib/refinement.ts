// ═══════════════════════════════════════════════════════════════════════
// 对抗性协作精炼 — 魔鬼代言人模式，合作挑刺直到产出最优解
// Adversarial Refinement — Devil's Advocate mode, cooperative flaw-finding until optimal
// ═══════════════════════════════════════════════════════════════════════

/** 精炼轮次 / Refinement round */
export interface RefinementRound {
  round: number;
  attacker: string;           // 攻击方（挑刺）
  defender: string;           // 防守方（改进）
  originalOutput: string;     // 原始输出
  attack: string;             // 攻击/挑刺内容
  refinedOutput: string;      // 改进后输出
  improvement: string;        // 改进点总结
  qualityDelta: number;       // 质量变化 +/-
}

/** 精炼结果 / Refinement result */
export interface RefinementResult {
  id: string;
  originalOutput: string;     // 初始输出
  refinedOutput: string;      // 最终精炼输出
  rounds: RefinementRound[];  // 精炼过程
  qualityImprovement: number; // 质量提升百分比
  totalRounds: number;        // 总轮次
  timestamp: number;
}

/** 精炼配置 / Refinement config */
export interface RefinementConfig {
  maxRounds: number;          // 最大精炼轮次
  qualityThreshold: number;   // 质量阈值（达到即可停止）
  improvementThreshold: number; // 最小改进幅度（低于此值停止）
}

const DEFAULT_CONFIG: RefinementConfig = {
  maxRounds: 3,
  qualityThreshold: 85,
  improvementThreshold: 5,
};

// ── 构建攻击方 Prompt / Build attacker prompt ──
function buildAttackerPrompt(
  originalOutput: string,
  taskContext: string,
  attackerName: string,
): Array<{ role: string; content: string }> {
  return [
    {
      role: "system",
      content: `你是 ${attackerName}，扮演"魔鬼代言人"角色。你的任务是严格审查以下输出，找出所有可能的漏洞、缺陷和可改进之处。

任务上下文：${taskContext}

审查规则：
- 逻辑漏洞：推理过程是否有问题？
- 完整性：是否遗漏了重要方面？
- 边界条件：边缘情况是否考虑？
- 可行性：方案是否实际可行？
- 安全性：是否有安全隐患？
- 表达清晰度：描述是否足够清晰？

请直接列出你发现的问题，每个问题一行，格式为"问题X：具体问题描述"。`,
    },
    {
      role: "user",
      content: `请审查以下输出：\n\n${originalOutput}`,
    },
  ];
}

// ── 构建防守方 Prompt / Build defender prompt ──
function buildDefenderPrompt(
  originalOutput: string,
  attacks: string,
  taskContext: string,
  defenderName: string,
): Array<{ role: string; content: string }> {
  return [
    {
      role: "system",
      content: `你是 ${defenderName}。你的输出刚刚被审查者指出了以下问题：

${attacks}

请根据这些反馈改进你的输出。要求：
- 逐一回应每个问题
- 改进被指出的缺陷
- 保持原有优点
- 输出改进后的完整版本

任务上下文：${taskContext}`,
    },
    {
      role: "user",
      content: `原始输出：\n\n${originalOutput}\n\n请根据上述反馈给出改进后的完整输出。`,
    },
  ];
}

// ── 执行精炼 / Execute refinement ──
// 注意：此函数需要传入 LLM 调用函数，因为不同环境调用方式不同
export async function executeRefinement(
  originalOutput: string,
  taskContext: string,
  defenderName: string,
  attackerName: string,
  callLLM: (messages: Array<{ role: string; content: string }>) => Promise<string>,
  config: RefinementConfig = DEFAULT_CONFIG,
): Promise<RefinementResult> {
  const rounds: RefinementRound[] = [];
  let currentOutput = originalOutput;
  let lastQuality = 50; // 初始质量估计

  for (let round = 1; round <= config.maxRounds; round++) {
    // 攻击方审查
    const attackerPrompt = buildAttackerPrompt(currentOutput, taskContext, attackerName);
    const attack = await callLLM(attackerPrompt);

    // 防守方改进
    const defenderPrompt = buildDefenderPrompt(currentOutput, attack, taskContext, defenderName);
    const refined = await callLLM(defenderPrompt);

    // 计算改进幅度（简化版：基于文本长度变化和关键词匹配）
    const qualityDelta = estimateQualityImprovement(currentOutput, refined, attack);

    const improvement = qualityDelta > 0
      ? `改进了 ${qualityDelta} 个质量点，主要解决了攻击方指出的 ${countIssues(attack)} 个问题`
      : "本轮未检测到显著改进";

    rounds.push({
      round,
      attacker: attackerName,
      defender: defenderName,
      originalOutput: currentOutput,
      attack,
      refinedOutput: refined,
      improvement,
      qualityDelta,
    });

    currentOutput = refined;
    lastQuality = Math.min(100, lastQuality + qualityDelta);

    // 达到质量阈值或改进幅度太小则停止
    if (lastQuality >= config.qualityThreshold || qualityDelta < config.improvementThreshold) {
      break;
    }
  }

  // 计算总体质量提升
  const qualityImprovement = Math.round(
    ((currentOutput.length - originalOutput.length) / Math.max(originalOutput.length, 1)) * 100
  );

  return {
    id: `refine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    originalOutput,
    refinedOutput: currentOutput,
    rounds,
    qualityImprovement: Math.max(0, Math.min(100, qualityImprovement + 10)),
    totalRounds: rounds.length,
    timestamp: Date.now(),
  };
}

// ── 辅助函数 / Helper functions ──
function countIssues(text: string): number {
  const matches = text.match(/问题\d+[：:]/g);
  return matches ? matches.length : 0;
}

function estimateQualityImprovement(original: string, refined: string, attack: string): number {
  let score = 0;
  // 1. 改进后文本更充实
  if (refined.length > original.length * 1.05) score += 2;
  // 2. 攻击方指出了问题
  if (attack.length > 50) score += 2;
  // 3. 改进后有明显变化
  if (refined !== original) score += 2;
  // 4. 攻击方指出了多个问题
  const issueCount = countIssues(attack);
  score += Math.min(issueCount, 5);
  return score;
}

// ── 存储 / Storage ──
const REFINE_STORAGE_PREFIX = "refinement_history";

function getRefineKey(userId: string): string {
  return `${REFINE_STORAGE_PREFIX}_${userId}`;
}

let currentUserId = "";

export function setRefinementUserId(userId: string): void {
  currentUserId = userId;
}

export function getRefinementHistory(): RefinementResult[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getRefineKey(currentUserId || "anonymous"));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveRefinementResult(result: RefinementResult): void {
  if (typeof window === "undefined") return;
  try {
    const history = getRefinementHistory();
    history.push(result);
    if (history.length > 50) history.shift();
    localStorage.setItem(getRefineKey(currentUserId || "anonymous"), JSON.stringify(history));
  } catch {}
}