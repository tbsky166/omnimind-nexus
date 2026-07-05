// ═══════════════════════════════════════════════════════════════════════
// 元认知层 — 自我反思 + 思维链可视化 + 置信度校准 + 认知偏差检测
// Metacognition Layer — self-reflection + thinking chain visualization + confidence calibration + cognitive bias detection
// ═══════════════════════════════════════════════════════════════════════

// ── 核心概念 / Core Concepts ──
// 思维链（ThinkingChain）：Agent 的推理步骤序列，可回溯、可审查
// 置信度校准（Confidence Calibration）：评估 Agent 对其答案的自信程度是否准确
// 认知偏差（Cognitive Bias）：系统化的思维错误模式，如确认偏误、锚定效应等
// 反思提示（Reflection Prompt）：基于自我评估生成的改进建议
// 元注意力（Meta-Attention）：监控 Agent 在推理过程中注意力的分配

/** 思维步骤 / Thinking step */
export interface ThinkingStep {
  id: string;                    // 唯一标识
  stepNumber: number;            // 步骤序号
  type: "observation" | "hypothesis" | "analysis" | "evaluation" | "conclusion" | "question" | "assumption" | "revision";
  content: string;               // 步骤内容
  confidence: number;            // 该步骤的置信度：0.0 ~ 1.0
  assumptions: string[];         // 该步骤基于的假设
  evidence: string[];            // 支持该步骤的证据
  counterEvidence: string[];     // 反证
  timestamp: number;             // 时间戳
  duration: number;              // 耗时（毫秒）
  parentId?: string;             // 父步骤 ID（分支推理）
  alternatives: string[];        // 考虑过但未采纳的替代方案
  biases: string[];              // 检测到的认知偏差
}

/** 思维链 / Thinking chain */
export interface ThinkingChain {
  id: string;                    // 链 ID
  sessionId: string;             // 会话 ID
  agentId: string;               // Agent ID
  agentName: string;             // Agent 名称
  task: string;                  // 任务描述
  steps: ThinkingStep[];         // 步骤列表
  startTime: number;             // 开始时间
  endTime: number;               // 结束时间
  totalDuration: number;         // 总耗时
  finalConclusion: string;       // 最终结论
  selfRating: number;            // 自我评分：0.0 ~ 1.0
  improvementSuggestions: string[]; // 自我改进建议
}

/** 置信度校准记录 / Confidence calibration record */
export interface CalibrationRecord {
  id: string;
  agentId: string;
  prediction: string;            // 预测内容
  predictedConfidence: number;   // 预测时的置信度
  actualOutcome: boolean;        // 实际结果是否正确
  timestamp: number;
  category: string;              // 领域分类
  taskComplexity: number;        // 任务复杂度：0.0 ~ 1.0
}

/** 校准统计 / Calibration statistics */
export interface CalibrationStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;              // 实际准确率
  avgConfidence: number;         // 平均预测置信度
  calibrationError: number;      // 校准误差（|置信度 - 准确率|）
  isOverconfident: boolean;      // 是否过度自信
  isUnderconfident: boolean;     // 是否自信不足
  reliabilityCurve: Array<{      // 可靠性曲线
    confidenceBin: string;       // 置信度区间
    count: number;               // 预测数
    accuracy: number;            // 该区间实际准确率
  }>;
  byCategory: Record<string, { accuracy: number; avgConfidence: number; count: number }>;
}

/** 认知偏差类型 / Cognitive bias types */
export enum CognitiveBias {
  CONFIRMATION = "confirmation",           // 确认偏误：寻找支持已有观点的证据
  ANCHORING = "anchoring",                 // 锚定效应：过度依赖第一个信息
  OVERCONFIDENCE = "overconfidence",       // 过度自信
  AVAILABILITY = "availability",           // 可得性启发：依赖容易想到的例子
  FRAMING = "framing",                     // 框架效应：受表述方式影响
  SUNK_COST = "sunk_cost",                 // 沉没成本：继续投入已失败的方案
  HALO_EFFECT = "halo_effect",             // 光环效应：因一个优点而高估整体
  RECENCY = "recency",                     // 近因效应：过度重视最近信息
  GROUPTHINK = "groupthink",               // 群体思维：为和谐而压制异议
  DUNNING_KRUGER = "dunning_kruger",       // 达克效应：低能力者高估自己
  BASE_RATE_NEGLECT = "base_rate_neglect", // 忽视基础概率
  SURVIVORSHIP = "survivorship",           // 幸存者偏差：只看到成功案例
}

/** 偏差检测规则 / Bias detection rules */
export interface BiasRule {
  bias: CognitiveBias;
  description: string;
  detectionPattern: RegExp;      // 检测模式（匹配思维步骤内容）
  severity: number;              // 严重程度：0.0 ~ 1.0
  suggestion: string;            // 纠正建议
}

/** 反思报告 / Reflection report */
export interface ReflectionReport {
  id: string;
  agentId: string;
  agentName: string;
  threadId: string;              // 思维链 ID
  timestamp: number;
  overallScore: number;          // 综合评分：0.0 ~ 1.0
  strengths: string[];           // 优势
  weaknesses: string[];          // 不足
  detectedBiases: Array<{        // 检测到的偏差
    bias: CognitiveBias;
    severity: number;
    evidence: string;            // 证据（在哪一步）
    suggestion: string;
  }>;
  calibration: CalibrationStats;
  improvementPlan: string[];     // 改进计划
  blindSpots: string[];          // 认知盲点
  alternativePaths: string[];    // 未考虑的替代路径
}

/** 元认知配置 / Metacognition config */
export interface MetacognitionConfig {
  enabled: boolean;
  trackThinking: boolean;        // 是否记录思维链
  detectBiases: boolean;         // 是否检测认知偏差
  calibrateConfidence: boolean;  // 是否校准置信度
  autoReflect: boolean;          // 是否自动反思
  reflectInterval: number;       // 反思间隔（轮次）
  minConfidenceForAction: number; // 最低置信度阈值
  biasSeverityThreshold: number; // 偏差严重度阈值
  maxThinkingChainLength: number; // 最大思维链长度
}

// ── 认知偏差检测规则库 / Cognitive Bias Detection Rule Base ──

export const BIAS_DETECTION_RULES: BiasRule[] = [
  {
    bias: CognitiveBias.CONFIRMATION,
    description: "倾向于寻找支持已有观点的证据，忽略反面证据",
    detectionPattern: /(must be|definitely|obviously|without doubt|clearly the.*best|only.*option)/i,
    severity: 0.7,
    suggestion: "请考虑反面证据：有没有什么情况会使你的结论不成立？列出至少 3 个可能的反例。",
  },
  {
    bias: CognitiveBias.ANCHORING,
    description: "过度依赖第一个收到的信息或初始估计",
    detectionPattern: /(initially|first.*thought|starting.*point|baseline|original.*estimate)/i,
    severity: 0.6,
    suggestion: "尝试从不同角度重新评估：如果你收到的第一个信息是错误的，你的结论会如何改变？",
  },
  {
    bias: CognitiveBias.OVERCONFIDENCE,
    description: "对自己的判断过度自信",
    detectionPattern: /(100%|absolutely certain|zero doubt|guaranteed|foolproof|perfect|always|never)/i,
    severity: 0.8,
    suggestion: "请量化你的不确定性：给出 90% 置信区间，而不是点估计。你的判断有多大可能出错？",
  },
  {
    bias: CognitiveBias.AVAILABILITY,
    description: "过度依赖容易回忆的例子，忽视统计概率",
    detectionPattern: /(recently|in my experience|I've seen|common.*example|typical.*case|usually)/i,
    severity: 0.5,
    suggestion: "请考虑基础概率：这种情况在整体数据中出现的频率是多少？有没有更系统的数据支持？",
  },
  {
    bias: CognitiveBias.FRAMING,
    description: "受问题表述方式影响判断",
    detectionPattern: /(positive.*framing|negative.*framing|gain.*loss|risk.*reward|opportunity.*threat)/i,
    severity: 0.5,
    suggestion: "请从另一个角度重新表述问题：如果问题是相反的，你的结论会变吗？",
  },
  {
    bias: CognitiveBias.SUNK_COST,
    description: "因已投入资源而继续坚持错误方向",
    detectionPattern: /(already.*invested|too much.*time|might as well|can't.*stop.*now|wasted.*effort|come.*this.*far)/i,
    severity: 0.7,
    suggestion: "沉没成本不应影响决策：如果从零开始，你现在会做出同样的选择吗？",
  },
  {
    bias: CognitiveBias.HALO_EFFECT,
    description: "因一个正面特质而高估整体",
    detectionPattern: /(excellent.*reputation|top.*expert|leading.*authority|best.*in.*field|world.*class)/i,
    severity: 0.4,
    suggestion: "请独立评估每个维度：这个人的专业能力在具体问题上是否真的适用？",
  },
  {
    bias: CognitiveBias.RECENCY,
    description: "过度重视最近发生的事件",
    detectionPattern: /(just.*happened|latest.*trend|most.*recent|current.*hot|nowadays|these.*days)/i,
    severity: 0.5,
    suggestion: "请考虑长期趋势：最近的变化是长期趋势还是短期波动？查看更长时间范围的数据。",
  },
  {
    bias: CognitiveBias.GROUPTHINK,
    description: "为保持和谐而压制异议",
    detectionPattern: /(everyone.*agrees|consensus.*view|team.*decision|we.*all.*think|no.*disagreement|unanimous)/i,
    severity: 0.6,
    suggestion: "请刻意寻找异议：有没有人持不同意见？他们的理由是什么？扮演魔鬼代言人。",
  },
  {
    bias: CognitiveBias.DUNNING_KRUGER,
    description: "低能力者高估自己，高能力者低估自己",
    detectionPattern: /(easy.*task|simple.*solution|anyone.*can|trivial|basic.*stuff|no.*challenge)/i,
    severity: 0.5,
    suggestion: "请评估你的实际能力水平：这个领域你有什么资格？有什么是你不知道的？",
  },
  {
    bias: CognitiveBias.BASE_RATE_NEGLECT,
    description: "忽视基础概率，过度关注具体信息",
    detectionPattern: /(specific.*case|this.*particular|unique.*situation|special.*circumstance|exception)/i,
    severity: 0.6,
    suggestion: "请考虑基础概率：在类似情况下，一般的成功率 / 发生率是多少？",
  },
  {
    bias: CognitiveBias.SURVIVORSHIP,
    description: "只看到成功案例，忽略失败案例",
    detectionPattern: /(success.*story|case.*study|best.*practice|proven.*method|tried.*and.*tested)/i,
    severity: 0.5,
    suggestion: "请考虑失败案例：有多少类似的尝试失败了？它们失败的原因是什么？",
  },
];

// ── 思维链引擎 / Thinking Chain Engine ──

/** 创建思维链 / Create thinking chain */
export function createThinkingChain(
  sessionId: string,
  agentId: string,
  agentName: string,
  task: string,
): ThinkingChain {
  return {
    id: `think_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    agentId,
    agentName,
    task,
    steps: [],
    startTime: Date.now(),
    endTime: 0,
    totalDuration: 0,
    finalConclusion: "",
    selfRating: 0,
    improvementSuggestions: [],
  };
}

/** 添加思维步骤 / Add thinking step */
export function addThinkingStep(
  chain: ThinkingChain,
  step: Omit<ThinkingStep, "id" | "timestamp" | "duration">,
): ThinkingStep {
  const startTime = Date.now();
  const id = `step_${chain.steps.length + 1}_${Math.random().toString(36).slice(2, 6)}`;

  const newStep: ThinkingStep = {
    ...step,
    id,
    stepNumber: chain.steps.length + 1,
    timestamp: startTime,
    duration: 0,
    alternatives: step.alternatives || [],
    biases: step.biases || [],
  };

  chain.steps.push(newStep);
  return newStep;
}

/** 完成思维步骤 / Complete thinking step (set duration) */
export function completeStep(step: ThinkingStep): void {
  step.duration = Date.now() - step.timestamp;
}

/** 完成思维链 / Complete thinking chain */
export function completeThinkingChain(
  chain: ThinkingChain,
  finalConclusion: string,
  selfRating: number,
  suggestions: string[],
): void {
  chain.endTime = Date.now();
  chain.totalDuration = chain.endTime - chain.startTime;
  chain.finalConclusion = finalConclusion;
  chain.selfRating = Math.min(1, Math.max(0, selfRating));
  chain.improvementSuggestions = suggestions;
}

/** 获取思维链摘要 / Get thinking chain summary */
export function getThinkingChainSummary(chain: ThinkingChain): string {
  const stepTypes = chain.steps.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgConfidence = chain.steps.length > 0
    ? chain.steps.reduce((s, step) => s + step.confidence, 0) / chain.steps.length
    : 0;

  const totalBiases = chain.steps.reduce((s, step) => s + step.biases.length, 0);

  return `
## 思维链摘要 — ${chain.agentName}
- 任务：${chain.task}
- 总步骤：${chain.steps.length}
- 总耗时：${(chain.totalDuration / 1000).toFixed(1)}s
- 步骤类型分布：${Object.entries(stepTypes).map(([k, v]) => `${k}: ${v}`).join(", ")}
- 平均置信度：${avgConfidence.toFixed(2)}
- 检测到的偏差：${totalBiases} 个
- 自我评分：${chain.selfRating.toFixed(2)}
- 最终结论：${chain.finalConclusion.slice(0, 200)}${chain.finalConclusion.length > 200 ? "..." : ""}
`.trim();
}

// ── 置信度校准 / Confidence Calibration ──

/** 创建校准记录 / Create calibration record */
export function createCalibrationRecord(
  agentId: string,
  prediction: string,
  predictedConfidence: number,
  category: string,
  taskComplexity: number,
): CalibrationRecord {
  return {
    id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    agentId,
    prediction,
    predictedConfidence: Math.min(1, Math.max(0, predictedConfidence)),
    actualOutcome: false, // 将在验证后更新
    timestamp: Date.now(),
    category,
    taskComplexity: Math.min(1, Math.max(0, taskComplexity)),
  };
}

/** 验证预测并更新校准记录 / Verify prediction and update calibration record */
export function verifyPrediction(record: CalibrationRecord, wasCorrect: boolean): void {
  record.actualOutcome = wasCorrect;
}

/** 计算校准统计 / Calculate calibration statistics */
export function calculateCalibrationStats(records: CalibrationRecord[]): CalibrationStats {
  if (records.length === 0) {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      avgConfidence: 0,
      calibrationError: 0,
      isOverconfident: false,
      isUnderconfident: false,
      reliabilityCurve: [],
      byCategory: {},
    };
  }

  const totalPredictions = records.length;
  const correctPredictions = records.filter((r) => r.actualOutcome).length;
  const accuracy = correctPredictions / totalPredictions;
  const avgConfidence = records.reduce((s, r) => s + r.predictedConfidence, 0) / totalPredictions;
  const calibrationError = Math.abs(accuracy - avgConfidence);

  // 可靠性曲线 / Reliability curve
  const bins = [
    { label: "0-50%", min: 0, max: 0.5 },
    { label: "50-70%", min: 0.5, max: 0.7 },
    { label: "70-80%", min: 0.7, max: 0.8 },
    { label: "80-90%", min: 0.8, max: 0.9 },
    { label: "90-100%", min: 0.9, max: 1.0 },
  ];

  const reliabilityCurve = bins.map((bin) => {
    const inBin = records.filter(
      (r) => r.predictedConfidence >= bin.min && r.predictedConfidence < bin.max,
    );
    return {
      confidenceBin: bin.label,
      count: inBin.length,
      accuracy: inBin.length > 0
        ? inBin.filter((r) => r.actualOutcome).length / inBin.length
        : 0,
    };
  });

  // 按类别统计 / By category
  const byCategory: Record<string, { accuracy: number; avgConfidence: number; count: number }> = {};
  for (const record of records) {
    if (!byCategory[record.category]) {
      byCategory[record.category] = { accuracy: 0, avgConfidence: 0, count: 0 };
    }
    byCategory[record.category].count++;
  }
  for (const cat of Object.keys(byCategory)) {
    const catRecords = records.filter((r) => r.category === cat);
    byCategory[cat].accuracy = catRecords.filter((r) => r.actualOutcome).length / catRecords.length;
    byCategory[cat].avgConfidence = catRecords.reduce((s, r) => s + r.predictedConfidence, 0) / catRecords.length;
  }

  return {
    totalPredictions,
    correctPredictions,
    accuracy,
    avgConfidence,
    calibrationError,
    isOverconfident: avgConfidence > accuracy + 0.1,
    isUnderconfident: accuracy > avgConfidence + 0.1,
    reliabilityCurve,
    byCategory,
  };
}

// ── 认知偏差检测 / Cognitive Bias Detection ──

/** 检测思维步骤中的认知偏差 / Detect cognitive biases in a thinking step */
export function detectBiases(step: ThinkingStep): Array<{ bias: CognitiveBias; severity: number; suggestion: string }> {
  const results: Array<{ bias: CognitiveBias; severity: number; suggestion: string }> = [];

  for (const rule of BIAS_DETECTION_RULES) {
    if (rule.detectionPattern.test(step.content)) {
      results.push({
        bias: rule.bias,
        severity: rule.severity,
        suggestion: rule.suggestion,
      });
    }
  }

  return results;
}

/** 检测整个思维链中的偏差 / Detect biases in the entire thinking chain */
export function detectChainBiases(chain: ThinkingChain): Array<{
  bias: CognitiveBias;
  severity: number;
  count: number;
  steps: number[];
  suggestion: string;
}> {
  const biasMap = new Map<CognitiveBias, {
    severity: number;
    count: number;
    steps: number[];
    suggestion: string;
  }>();

  for (const step of chain.steps) {
    const biases = detectBiases(step);
    for (const b of biases) {
      const existing = biasMap.get(b.bias);
      if (existing) {
        existing.count++;
        existing.severity = Math.max(existing.severity, b.severity);
        existing.steps.push(step.stepNumber);
      } else {
        biasMap.set(b.bias, {
          severity: b.severity,
          count: 1,
          steps: [step.stepNumber],
          suggestion: b.suggestion,
        });
      }
    }
  }

  return Array.from(biasMap.entries()).map(([bias, data]) => ({
    bias,
    ...data,
  }));
}

// ── 反思引擎 / Reflection Engine ──

/** 生成反思报告 / Generate reflection report */
export function generateReflectionReport(
  chain: ThinkingChain,
  calibrationRecords: CalibrationRecord[],
  config: MetacognitionConfig,
): ReflectionReport {
  const biases = detectChainBiases(chain);
  const calibration = calculateCalibrationStats(calibrationRecords);

  // 评估优势 / Assess strengths
  const strengths: string[] = [];
  const avgConfidence = chain.steps.reduce((s, step) => s + step.confidence, 0) / Math.max(1, chain.steps.length);
  const evidenceSteps = chain.steps.filter((s) => s.evidence.length > 0);
  const revisionSteps = chain.steps.filter((s) => s.type === "revision");

  if (evidenceSteps.length > chain.steps.length * 0.5) {
    strengths.push("善于引用证据支持推理");
  }
  if (revisionSteps.length > 0) {
    strengths.push("能够自我修正，具有迭代改进意识");
  }
  if (avgConfidence < 0.8) {
    strengths.push("保持适度的不确定性，避免过度自信");
  }
  if (chain.steps.some((s) => s.alternatives.length > 0)) {
    strengths.push("考虑多种替代方案，思维开放");
  }
  if (chain.steps.some((s) => s.counterEvidence.length > 0)) {
    strengths.push("主动寻找反证，避免确认偏误");
  }

  // 评估不足 / Assess weaknesses
  const weaknesses: string[] = [];
  const assumptionSteps = chain.steps.filter((s) => s.assumptions.length > 0 && s.evidence.length === 0);

  if (assumptionSteps.length > 0) {
    weaknesses.push(`有 ${assumptionSteps.length} 个步骤依赖未经验证的假设`);
  }
  if (biases.length > 0) {
    weaknesses.push(`检测到 ${biases.length} 种认知偏差`);
  }
  if (calibration.isOverconfident) {
    weaknesses.push("存在过度自信倾向，需要校准置信度");
  }
  if (calibration.isUnderconfident) {
    weaknesses.push("自信不足，可能低估了自己的判断能力");
  }
  if (chain.steps.filter((s) => s.type === "evaluation").length < 2 && chain.steps.length > 5) {
    weaknesses.push("缺少足够的评估步骤，可能过早得出结论");
  }

  // 检测到的偏差 / Detected biases
  const detectedBiases = biases
    .filter((b) => b.severity >= config.biasSeverityThreshold)
    .map((b) => ({
      bias: b.bias,
      severity: b.severity,
      evidence: `步骤 ${b.steps.join(", ")}：共出现 ${b.count} 次`,
      suggestion: b.suggestion,
    }));

  // 认知盲点 / Blind spots
  const blindSpots: string[] = [];
  if (!chain.steps.some((s) => s.type === "question")) {
    blindSpots.push("未提出任何质疑性问题，可能缺少批判性思维");
  }
  if (!chain.steps.some((s) => s.counterEvidence.length > 0)) {
    blindSpots.push("未考虑反证，可能存在确认偏误盲区");
  }
  const uniqueTypes = new Set(chain.steps.map((s) => s.type));
  if (uniqueTypes.size < 4 && chain.steps.length > 3) {
    blindSpots.push("思维类型单一，缺少多角度分析");
  }

  // 替代路径 / Alternative paths
  const alternativePaths: string[] = [];
  if (!chain.steps.some((s) => s.type === "hypothesis")) {
    alternativePaths.push("尝试形成多个假设，而不是直接跳到结论");
  }
  if (chain.steps.filter((s) => s.type === "analysis").length < 2 && chain.steps.length > 3) {
    alternativePaths.push("增加分析步骤，深入探索问题的不同维度");
  }

  // 改进计划 / Improvement plan
  const improvementPlan: string[] = [];
  for (const b of detectedBiases) {
    improvementPlan.push(b.suggestion);
  }
  if (calibration.isOverconfident) {
    improvementPlan.push("降低预测置信度 10-15%，使用区间估计代替点估计");
  }
  if (blindSpots.includes("未提出任何质疑性问题，可能缺少批判性思维")) {
    improvementPlan.push("在每次分析后，强制提出至少一个质疑性问题");
  }

  // 综合评分 / Overall score
  const biasPenalty = biases.reduce((s, b) => s + b.severity * 0.15, 0);
  const calibrationPenalty = calibration.calibrationError * 0.5;
  const evidenceBonus = Math.min(0.2, evidenceSteps.length / Math.max(1, chain.steps.length) * 0.2);
  const revisionBonus = Math.min(0.1, revisionSteps.length * 0.05);
  let overallScore = 0.5 + evidenceBonus + revisionBonus - biasPenalty - calibrationPenalty;
  overallScore = Math.min(1, Math.max(0, overallScore));

  return {
    id: `refl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    agentId: chain.agentId,
    agentName: chain.agentName,
    threadId: chain.id,
    timestamp: Date.now(),
    overallScore,
    strengths,
    weaknesses,
    detectedBiases,
    calibration,
    improvementPlan,
    blindSpots,
    alternativePaths,
  };
}

// ── 元注意力监控 / Meta-Attention Monitoring ──

/** 注意力分配 / Attention allocation */
export interface AttentionAllocation {
  topic: string;               // 关注主题
  timeSpent: number;           // 时间占比
  depth: number;               // 分析深度：0.0 ~ 1.0
  steps: number;               // 涉及步骤数
  isDistraction: boolean;      // 是否可能是注意力分散
}

/** 分析注意力分配 / Analyze attention allocation */
export function analyzeAttention(chain: ThinkingChain): AttentionAllocation[] {
  // 简单基于关键词聚类 / Simple keyword-based clustering
  const topicMap = new Map<string, { time: number; steps: number; depth: number }>();

  const topicKeywords: Record<string, RegExp[]> = {
    "技术实现": [/implement|code|technical|algorithm|function|api/i],
    "架构设计": [/architect|design|pattern|structure|system|component/i],
    "风险评估": [/risk|threat|vulnerability|danger|failure|error/i],
    "用户体验": [/user|experience|interface|ux|usability|accessible/i],
    "性能优化": [/performance|optimize|speed|latency|efficient|scal/i],
    "数据安全": [/security|privacy|encrypt|auth|protect|complian/i],
    "成本分析": [/cost|budget|resource|expensive|cheap|price/i],
    "替代方案": [/alternative|option|choice|tradeoff|instead|versus/i],
    "元推理": [/think|reflect|reason|logic|assume|conclude/i],
  };

  for (const step of chain.steps) {
    for (const [topic, patterns] of Object.entries(topicKeywords)) {
      if (patterns.some((p) => p.test(step.content))) {
        const existing = topicMap.get(topic) || { time: 0, steps: 0, depth: 0 };
        existing.time += step.duration;
        existing.steps++;
        existing.depth = Math.max(existing.depth, step.confidence * (step.evidence.length / 5));
        topicMap.set(topic, existing);
      }
    }
  }

  const totalTime = chain.steps.reduce((s, step) => s + step.duration, 0) || 1;
  const allocations: AttentionAllocation[] = [];

  for (const [topic, data] of topicMap) {
    allocations.push({
      topic,
      timeSpent: data.time / totalTime,
      depth: Math.min(1, data.depth),
      steps: data.steps,
      isDistraction: data.time / totalTime < 0.05 && data.steps < 2,
    });
  }

  return allocations.sort((a, b) => b.timeSpent - a.timeSpent);
}

// ── 元认知管理器 / Metacognition Manager ──

/** 元认知会话状态 / Metacognition session state */
export interface MetacognitionState {
  config: MetacognitionConfig;
  currentChain: ThinkingChain | null;
  chains: ThinkingChain[];
  calibrationRecords: CalibrationRecord[];
  reports: ReflectionReport[];
  reflectCount: number;
  lastReflectTime: number;
}

/** 创建元认知管理器 / Create metacognition manager */
export function createMetacognitionManager(config: Partial<MetacognitionConfig> = {}): MetacognitionState {
  return {
    config: {
      enabled: true,
      trackThinking: true,
      detectBiases: true,
      calibrateConfidence: true,
      autoReflect: true,
      reflectInterval: 5,
      minConfidenceForAction: 0.7,
      biasSeverityThreshold: 0.4,
      maxThinkingChainLength: 50,
      ...config,
    },
    currentChain: null,
    chains: [],
    calibrationRecords: [],
    reports: [],
    reflectCount: 0,
    lastReflectTime: 0,
  };
}

/** 开始新的思维链 / Start new thinking chain */
export function startThinking(
  state: MetacognitionState,
  sessionId: string,
  agentId: string,
  agentName: string,
  task: string,
): ThinkingChain {
  const chain = createThinkingChain(sessionId, agentId, agentName, task);
  state.currentChain = chain;
  return chain;
}

/** 记录思维步骤 / Record thinking step */
export function recordThinking(
  state: MetacognitionState,
  step: Omit<ThinkingStep, "id" | "timestamp" | "duration">,
): ThinkingStep | null {
  if (!state.currentChain || !state.config.trackThinking) return null;
  if (state.currentChain.steps.length >= state.config.maxThinkingChainLength) return null;

  const newStep = addThinkingStep(state.currentChain, step);

  // 实时偏差检测 / Real-time bias detection
  if (state.config.detectBiases) {
    const biases = detectBiases(newStep);
    newStep.biases = biases.map((b) => b.bias);
  }

  completeStep(newStep);
  return newStep;
}

/** 结束思维链 / End thinking chain */
export function endThinking(
  state: MetacognitionState,
  finalConclusion: string,
  selfRating: number,
): ThinkingChain | null {
  if (!state.currentChain) return null;

  const chain = state.currentChain;
  const improvementSuggestions = generateQuickSuggestions(chain);

  completeThinkingChain(chain, finalConclusion, selfRating, improvementSuggestions);
  state.chains.push(chain);
  state.currentChain = null;

  // 自动反思 / Auto-reflect
  state.reflectCount++;
  if (
    state.config.autoReflect &&
    state.reflectCount >= state.config.reflectInterval
  ) {
    const report = generateReflectionReport(chain, state.calibrationRecords, state.config);
    state.reports.push(report);
    state.reflectCount = 0;
    state.lastReflectTime = Date.now();
  }

  return chain;
}

/** 快速生成改进建议 / Generate quick improvement suggestions */
function generateQuickSuggestions(chain: ThinkingChain): string[] {
  const suggestions: string[] = [];
  const biases = detectChainBiases(chain);

  if (biases.length > 0) {
    suggestions.push(`检测到 ${biases.length} 种认知偏差，建议审视推理过程`);
  }

  const assumptionSteps = chain.steps.filter((s) => s.assumptions.length > 0 && s.evidence.length === 0);
  if (assumptionSteps.length > 0) {
    suggestions.push(`${assumptionSteps.length} 个步骤依赖未验证的假设，建议收集证据验证`);
  }

  if (chain.steps.filter((s) => s.type === "revision").length === 0 && chain.steps.length > 5) {
    suggestions.push("建议在推理过程中加入自我修正步骤");
  }

  return suggestions;
}

/** 格式化反思报告为 Markdown / Format reflection report as Markdown */
export function formatReflectionReport(report: ReflectionReport): string {
  const lines = [
    `# 元认知反思报告 — ${report.agentName}`,
    `- 综合评分：${(report.overallScore * 100).toFixed(0)}/100`,
    `- 时间：${new Date(report.timestamp).toISOString()}`,
    "",
    `## 优势`,
    ...report.strengths.map((s) => `- ✅ ${s}`),
    "",
    `## 不足`,
    ...report.weaknesses.map((w) => `- ⚠️ ${w}`),
    "",
    `## 检测到的认知偏差`,
    ...report.detectedBiases.map((b) => `- **${b.bias}** (严重度: ${b.severity.toFixed(2)})：${b.evidence}\n  > ${b.suggestion}`),
    "",
    `## 置信度校准`,
    `- 准确率：${(report.calibration.accuracy * 100).toFixed(1)}%`,
    `- 平均置信度：${(report.calibration.avgConfidence * 100).toFixed(1)}%`,
    `- 校准误差：${(report.calibration.calibrationError * 100).toFixed(1)}%`,
    `- ${report.calibration.isOverconfident ? "⚠️ 过度自信" : report.calibration.isUnderconfident ? "⚠️ 自信不足" : "✅ 校准良好"}`,
    "",
    `## 认知盲点`,
    ...report.blindSpots.map((b) => `- 🔍 ${b}`),
    "",
    `## 替代路径`,
    ...report.alternativePaths.map((p) => `- 💡 ${p}`),
    "",
    `## 改进计划`,
    ...report.improvementPlan.map((p, i) => `${i + 1}. ${p}`),
  ];

  return lines.join("\n");
}

/** 格式化置信度校准统计为可视化文本 / Format calibration stats as visual text */
export function formatCalibrationVisual(stats: CalibrationStats): string {
  const lines = [
    "┌─────────────────────────────────────┐",
    "│        置信度校准报告               │",
    "├─────────────────────────────────────┤",
    `│ 总预测数：${stats.totalPredictions.toString().padEnd(24)}│`,
    `│ 正确数：${stats.correctPredictions.toString().padEnd(26)}│`,
    `│ 准确率：${(stats.accuracy * 100).toFixed(1).padEnd(25)}%│`,
    `│ 平均置信度：${(stats.avgConfidence * 100).toFixed(1).padEnd(21)}%│`,
    `│ 校准误差：${(stats.calibrationError * 100).toFixed(1).padEnd(23)}%│`,
    `│ 状态：${(stats.isOverconfident ? "⚠️ 过度自信" : stats.isUnderconfident ? "⚠️ 自信不足" : "✅ 校准良好").padEnd(30)}│`,
    "├─────────────────────────────────────┤",
    "│ 可靠性曲线：                        │",
  ];

  for (const bin of stats.reliabilityCurve) {
    const bar = "█".repeat(Math.round(bin.accuracy * 20));
    lines.push(`│ ${bin.confidenceBin.padEnd(8)} ${bar.padEnd(20)} ${(bin.accuracy * 100).toFixed(0).padEnd(3)}%│`);
  }

  lines.push("└─────────────────────────────────────┘");
  return lines.join("\n");
}