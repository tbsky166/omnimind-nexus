// ═══════════════════════════════════════════════════════════════════════
// 反事实推理引擎 — "如果当时选了不同的 Agent 会怎样？"
// Counterfactual Reasoning Engine — "What if we had chosen different agents?"
// ═══════════════════════════════════════════════════════════════════════

import { agents } from "@/data/agents";

/** 反事实路径 / Counterfactual path */
export interface CounterfactualPath {
  agents: string[];              // 替代 Agent 组合
  estimatedScore: number;        // 预估得分 0-100
  reasoning: string;             // 推理依据
  efficiency: number;            // 预估效率 0-100
  quality: number;               // 预估质量 0-100
  diversity: number;             // 预估多样性 0-100
}

/** 反事实分析结果 / Counterfactual analysis result */
export interface CounterfactualAnalysis {
  sessionId: string;
  topic: string;
  actualPath: {
    agents: string[];
    efficiency: number;
    quality: number;
    diversity: number;
  };
  alternativePaths: CounterfactualPath[];
  bestAlternative: CounterfactualPath | null;
  recommendation: string;
  timestamp: number;
}

// ── Agent 能力评分 / Agent capability scoring ──
const CATEGORY_CAPABILITIES: Record<string, { efficiency: number; quality: number; diversity: number }> = {
  "Engineering": { efficiency: 85, quality: 80, diversity: 40 },
  "Business": { efficiency: 60, quality: 70, diversity: 80 },
  "Creative": { efficiency: 55, quality: 65, diversity: 90 },
  "Specialized": { efficiency: 70, quality: 75, diversity: 60 },
  "Core": { efficiency: 80, quality: 85, diversity: 70 },
};

// ── 根据任务内容推荐 Agent 类别 / Recommend agent categories based on task content ──
const TASK_KEYWORDS: Record<string, string[]> = {
  "Engineering": ["代码", "编程", "架构", "开发", "bug", "修复", "实现", "部署", "测试", "重构", "code", "build", "api", "数据库"],
  "Business": ["商业", "市场", "策略", "财务", "分析", "报告", "产品", "用户", "竞品", "增长", "business", "market", "strategy"],
  "Creative": ["设计", "写作", "创意", "内容", "文案", "视频", "游戏", "课程", "design", "content", "creative", "write"],
  "Specialized": ["安全", "性能", "合规", "法律", "数据", "运维", "security", "compliance", "performance", "data"],
};

function recommendCategories(task: string): string[] {
  const lower = task.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [category, keywords] of Object.entries(TASK_KEYWORDS)) {
    scores[category] = keywords.filter(kw => lower.includes(kw)).length;
  }
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);
}

// ── 生成替代路径 / Generate alternative paths ──
function generateAlternativePaths(
  task: string,
  actualAgents: string[],
  count: number = 3,
): CounterfactualPath[] {
  const recommendedCats = recommendCategories(task);
  const actualCategories = actualAgents.map(name => {
    const agent = agents.find(a => a.name === name);
    return agent?.category || "Engineering";
  });

  const alternatives: CounterfactualPath[] = [];
  const usedCombinations = new Set<string>();
  usedCombinations.add(actualAgents.sort().join(","));

  // 尝试不同的 Agent 组合
  for (let attempt = 0; attempt < count * 5 && alternatives.length < count; attempt++) {
    const altAgents: string[] = [];
    // 为每个位置选一个不同类别的 Agent
    for (let i = 0; i < actualAgents.length; i++) {
      const targetCat = recommendedCats.length > 0
        ? recommendedCats[Math.floor(Math.random() * recommendedCats.length)]
        : Object.keys(CATEGORY_CAPABILITIES)[Math.floor(Math.random() * 4)];

      const candidates = agents.filter(a =>
        a.category === targetCat &&
        !altAgents.includes(a.name) &&
        !actualAgents.includes(a.name)
      );

      if (candidates.length > 0) {
        altAgents.push(candidates[Math.floor(Math.random() * candidates.length)].name);
      }
    }

    if (altAgents.length < 2) continue;

    const key = altAgents.sort().join(",");
    if (usedCombinations.has(key)) continue;
    usedCombinations.add(key);

    // 计算预估得分
    let totalEfficiency = 0;
    let totalQuality = 0;
    let totalDiversity = 0;
    const usedCats = new Set<string>();

    for (const name of altAgents) {
      const agent = agents.find(a => a.name === name);
      const cat = agent?.category || "Engineering";
      const cap = CATEGORY_CAPABILITIES[cat] || CATEGORY_CAPABILITIES["Engineering"];
      totalEfficiency += cap.efficiency;
      totalQuality += cap.quality;
      totalDiversity += cap.diversity;
      usedCats.add(cat);
    }

    const avgEfficiency = Math.round(totalEfficiency / altAgents.length);
    const avgQuality = Math.round(totalQuality / altAgents.length);
    const avgDiversity = Math.round(totalDiversity / altAgents.length) + (usedCats.size > 1 ? 10 : 0);
    const estimatedScore = Math.round(avgEfficiency * 0.3 + avgQuality * 0.4 + Math.min(avgDiversity, 100) * 0.3);

    // 生成推理依据
    const catNames = Array.from(usedCats).join(" + ");
    const reasoning = `选取 ${catNames} 类别的 Agent 组合，预计在${recommendedCats.length > 0 ? recommendedCats.slice(0, 2).join("和") : "多"}维度上提供不同视角。`;

    alternatives.push({
      agents: altAgents,
      estimatedScore,
      reasoning,
      efficiency: avgEfficiency,
      quality: avgQuality,
      diversity: Math.min(avgDiversity, 100),
    });
  }

  return alternatives.sort((a, b) => b.estimatedScore - a.estimatedScore);
}

// ── 主函数：反事实分析 / Main function: counterfactual analysis ──
export function analyzeCounterfactual(
  sessionId: string,
  topic: string,
  actualAgents: string[],
  actualScores: { efficiency: number; quality: number; diversity: number },
): CounterfactualAnalysis {
  const alternativePaths = generateAlternativePaths(topic, actualAgents, 3);

  const actualEstimated = Math.round(
    actualScores.efficiency * 0.3 + actualScores.quality * 0.4 + actualScores.diversity * 0.3
  );

  const bestAlternative = alternativePaths.length > 0 ? alternativePaths[0] : null;

  let recommendation: string;
  if (bestAlternative && bestAlternative.estimatedScore > actualEstimated + 10) {
    recommendation = `💡 发现更优组合：用「${bestAlternative.agents.join("、")}」替代当前组合，预计综合得分提升 ${bestAlternative.estimatedScore - actualEstimated} 分。${bestAlternative.reasoning}`;
  } else if (bestAlternative && bestAlternative.estimatedScore > actualEstimated) {
    recommendation = `当前 Agent 组合表现不错。「${bestAlternative.agents.join("、")}」是另一个值得尝试的组合，差异不大。`;
  } else {
    recommendation = `当前 Agent 组合「${actualAgents.join("、")}」是最优选择。继续保持！`;
  }

  return {
    sessionId,
    topic,
    actualPath: {
      agents: actualAgents,
      ...actualScores,
    },
    alternativePaths,
    bestAlternative: bestAlternative && bestAlternative.estimatedScore > actualEstimated ? bestAlternative : null,
    recommendation,
    timestamp: Date.now(),
  };
}

// ── 存储 / Storage ──
const CF_STORAGE_KEY = "counterfactual_analyses";

export function getCounterfactualHistory(): CounterfactualAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CF_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCounterfactualAnalysis(analysis: CounterfactualAnalysis): void {
  if (typeof window === "undefined") return;
  try {
    const history = getCounterfactualHistory();
    history.push(analysis);
    if (history.length > 50) history.shift();
    localStorage.setItem(CF_STORAGE_KEY, JSON.stringify(history));
  } catch {}
}