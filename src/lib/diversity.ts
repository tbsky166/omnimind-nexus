// ═══════════════════════════════════════════════════════════════════════
// 认知多样性指数 — 度量 Agent 团队的思维多样性，检测群体思维风险
// Cognitive Diversity Index — measures team thinking diversity, detects groupthink
// ═══════════════════════════════════════════════════════════════════════

/** 多样性指标 / Diversity metrics */
export interface DiversityMetrics {
  overallScore: number;           // 总体多样性得分 0-100，越高越多样
  semanticSpread: number;         // 语义散布度
  perspectiveCount: number;       // 识别到的不同视角数
  groupthinkRisk: "low" | "medium" | "high";  // 群体思维风险等级
  agentContributions: AgentDiversityScore[];
  recommendations: string[];      // 改进建议
  timestamp: number;
}

/** 单个 Agent 的多样性贡献 / Individual agent diversity contribution */
export interface AgentDiversityScore {
  agentName: string;
  uniquenessScore: number;        // 独特性得分 0-100
  overlapWithOthers: number;      // 与其他 Agent 的重叠度 0-100
  contributionRank: number;       // 贡献排名
}

// ── 停用词 / Stop words ──
const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个",
  "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好",
  "自己", "这", "他", "她", "它", "们", "那", "些", "这个", "那个", "可以", "能",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have",
  "has", "had", "having", "do", "does", "did", "doing", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "i", "you", "he", "she", "it",
  "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its",
  "our", "their", "this", "that", "these", "those", "and", "but", "or", "nor",
  "for", "so", "yet", "with", "about", "into", "through", "during", "before",
  "after", "above", "below", "from", "up", "down", "of", "off", "over", "under",
]);

// ── 简单分词 / Simple tokenization ──
function tokenize(text: string): string[] {
  // 中英文混合分词
  const cleaned = text.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0 && !STOP_WORDS.has(t));
  return tokens;
}

// ── 计算 Jaccard 相似度 / Calculate Jaccard similarity ──
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// ── 计算余弦相似度（基于词频向量）/ Cosine similarity (TF-based) ──
function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  const allKeys = new Set([...vecA.keys(), ...vecB.keys()]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (const key of allKeys) {
    const a = vecA.get(key) || 0;
    const b = vecB.get(key) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── 构建 TF 向量 / Build TF vector ──
function buildTFVector(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  // 归一化
  const total = tokens.length || 1;
  for (const [k, v] of tf) {
    tf.set(k, v / total);
  }
  return tf;
}

// ── 检测不同视角 / Detect distinct perspectives ──
const PERSPECTIVE_KEYWORDS: Record<string, string[]> = {
  "技术实现": ["代码", "架构", "实现", "技术", "开发", "编程", "算法", "系统", "code", "implementation"],
  "用户体验": ["用户", "体验", "交互", "界面", "UI", "UX", "设计", "可用", "user", "experience"],
  "商业价值": ["商业", "市场", "收入", "ROI", "成本", "盈利", "增长", "business", "revenue", "market"],
  "安全合规": ["安全", "合规", "风险", "漏洞", "隐私", "审计", "security", "compliance", "privacy"],
  "性能效率": ["性能", "效率", "速度", "延迟", "吞吐", "优化", "performance", "efficiency", "latency"],
  "可维护性": ["维护", "测试", "文档", "重构", "质量", "maintain", "test", "documentation", "refactor"],
  "创新探索": ["创新", "探索", "突破", "前沿", "创新", "实验", "innovate", "explore", "breakthrough"],
  "数据驱动": ["数据", "分析", "指标", "统计", "数据驱动", "data", "analytics", "metrics", "statistics"],
};

function detectPerspectives(allTexts: string[]): string[] {
  const combined = allTexts.join(" ").toLowerCase();
  const perspectives: string[] = [];
  for (const [perspective, keywords] of Object.entries(PERSPECTIVE_KEYWORDS)) {
    const matchCount = keywords.filter(kw => combined.includes(kw.toLowerCase())).length;
    if (matchCount >= 2) {
      perspectives.push(perspective);
    }
  }
  return perspectives.length > 0 ? perspectives : ["综合视角"];
}

// ── 主函数：计算多样性 / Main function: calculate diversity ──
export function calculateDiversity(
  agentOutputs: Array<{ agentName: string; content: string }>,
): DiversityMetrics {
  if (agentOutputs.length < 2) {
    return {
      overallScore: 100,
      semanticSpread: 100,
      perspectiveCount: 1,
      groupthinkRisk: "low",
      agentContributions: agentOutputs.map(a => ({
        agentName: a.agentName,
        uniquenessScore: 100,
        overlapWithOthers: 0,
        contributionRank: 1,
      })),
      recommendations: ["Agent 数量不足，无法评估多样性"],
      timestamp: Date.now(),
    };
  }

  // 分词和向量化
  const tokenSets = agentOutputs.map(a => new Set(tokenize(a.content)));
  const tfVectors = agentOutputs.map(a => buildTFVector(tokenize(a.content)));

  // 计算两两相似度
  const similarities: number[] = [];
  for (let i = 0; i < agentOutputs.length; i++) {
    for (let j = i + 1; j < agentOutputs.length; j++) {
      const jaccard = jaccardSimilarity(tokenSets[i], tokenSets[j]);
      const cosine = cosineSimilarity(tfVectors[i], tfVectors[j]);
      similarities.push((jaccard + cosine) / 2);
    }
  }

  // 整体相似度 = 平均两两相似度
  const avgSimilarity = similarities.length > 0
    ? similarities.reduce((a, b) => a + b, 0) / similarities.length
    : 0;

  // 语义散布度 = (1 - 平均相似度) * 100
  const semanticSpread = Math.round((1 - avgSimilarity) * 100);

  // 计算每个 Agent 的独特性
  const agentContributions: AgentDiversityScore[] = agentOutputs.map((agent, i) => {
    const otherSimilarities = agentOutputs
      .map((_, j) => {
        if (i === j) return 0;
        const jac = jaccardSimilarity(tokenSets[i], tokenSets[j]);
        const cos = cosineSimilarity(tfVectors[i], tfVectors[j]);
        return (jac + cos) / 2;
      });
    const avgOtherSim = otherSimilarities.length > 0
      ? otherSimilarities.reduce((a, b) => a + b, 0) / otherSimilarities.length
      : 0;
    return {
      agentName: agent.agentName,
      uniquenessScore: Math.round((1 - avgOtherSim) * 100),
      overlapWithOthers: Math.round(avgOtherSim * 100),
      contributionRank: 0,
    };
  });

  // 按独特性排序分配排名
  const sorted = [...agentContributions].sort((a, b) => b.uniquenessScore - a.uniquenessScore);
  sorted.forEach((item, idx) => {
    item.contributionRank = idx + 1;
  });

  // 检测视角
  const allTexts = agentOutputs.map(a => a.content);
  const perspectives = detectPerspectives(allTexts);

  // 群体思维风险
  let groupthinkRisk: "low" | "medium" | "high";
  if (avgSimilarity > 0.7) {
    groupthinkRisk = "high";
  } else if (avgSimilarity > 0.45) {
    groupthinkRisk = "medium";
  } else {
    groupthinkRisk = "low";
  }

  // 总体得分 = 语义散布度 * 0.4 + 视角广度 * 0.3 + 个体独特性均值 * 0.3
  const avgUniqueness = agentContributions.reduce((a, b) => a + b.uniquenessScore, 0) / agentContributions.length;
  const perspectiveBreadth = Math.min(perspectives.length / 8, 1) * 100;
  const overallScore = Math.round(semanticSpread * 0.4 + perspectiveBreadth * 0.3 + avgUniqueness * 0.3);

  // 生成建议
  const recommendations: string[] = [];
  if (groupthinkRisk === "high") {
    recommendations.push("⚠️ 高风险：团队思维高度同质化，建议引入对立视角的 Agent");
    recommendations.push("建议加入「魔鬼代言人」角色来挑战共识");
  } else if (groupthinkRisk === "medium") {
    recommendations.push("关注：存在一定程度的群体思维，可考虑引入不同领域的 Agent");
  }
  if (perspectives.length < 3) {
    recommendations.push("视角覆盖不足，建议补充商业/安全/用户体验等维度的 Agent");
  }
  const lowUniquenessAgents = agentContributions.filter(a => a.uniquenessScore < 30);
  if (lowUniquenessAgents.length > 0) {
    recommendations.push(`以下 Agent 贡献相似度过高：${lowUniquenessAgents.map(a => a.agentName).join("、")}`);
  }

  return {
    overallScore,
    semanticSpread,
    perspectiveCount: perspectives.length,
    groupthinkRisk,
    agentContributions,
    recommendations,
    timestamp: Date.now(),
  };
}

// ── 多样性趋势 / Diversity trend ──
export interface DiversityTrend {
  sessionId: string;
  timestamp: number;
  overallScore: number;
  groupthinkRisk: string;
}

const TREND_STORAGE_KEY = "diversity_trends";

export function getDiversityTrends(): DiversityTrend[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TREND_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addDiversityTrend(trend: DiversityTrend): void {
  if (typeof window === "undefined") return;
  try {
    const trends = getDiversityTrends();
    trends.push(trend);
    // 只保留最近 50 条
    const trimmed = trends.slice(-50);
    localStorage.setItem(TREND_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}