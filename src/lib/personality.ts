// ═══════════════════════════════════════════════════════════════════════
// Agent 人格可视化 + 行为进化 — 雷达图性格维度，随任务反馈进化
// Agent Personality Visualization + Behavioral Evolution — radar chart traits, evolves with task feedback
// ═══════════════════════════════════════════════════════════════════════

/** 性格维度 / Personality traits */
export interface PersonalityTraits {
  creativity: number;       // 创造力 0-100
  precision: number;        // 严谨度 0-100
  riskTolerance: number;    // 风险偏好 0-100
  collaboration: number;    // 协作性 0-100
  expressiveness: number;   // 表达欲 0-100
}

/** 性格快照 / Personality snapshot */
export interface PersonalitySnapshot {
  timestamp: number;
  traits: PersonalityTraits;
  event: string;            // 触发事件描述
  delta: Partial<PersonalityTraits>; // 变化量
}

/** Agent 完整人格 / Full agent personality */
export interface AgentPersonality {
  agentName: string;
  agentEmoji: string;
  traits: PersonalityTraits;
  history: PersonalitySnapshot[];   // 进化历史
  level: number;                    // 等级 1-100
  experience: number;               // 经验值
  synergyPartners: string[];        // 最佳搭档
  sparkCount: number;               // 火花次数（与搭档的化学反应）
}

/** 默认性格 / Default personality */
const DEFAULT_TRAITS: PersonalityTraits = {
  creativity: 50,
  precision: 50,
  riskTolerance: 50,
  collaboration: 50,
  expressiveness: 50,
};

// ── 性格初始化（基于 Agent 角色）/ Initialize personality based on agent role ──
const ROLE_TRAIT_PRESETS: Record<string, Partial<PersonalityTraits>> = {
  "Architect": { creativity: 75, precision: 80, riskTolerance: 40, collaboration: 60, expressiveness: 55 },
  "Coder": { creativity: 60, precision: 85, riskTolerance: 35, collaboration: 65, expressiveness: 40 },
  "Reviewer": { creativity: 40, precision: 90, riskTolerance: 25, collaboration: 55, expressiveness: 45 },
  "Refactorer": { creativity: 55, precision: 80, riskTolerance: 45, collaboration: 50, expressiveness: 35 },
  "Tester": { creativity: 65, precision: 85, riskTolerance: 55, collaboration: 60, expressiveness: 50 },
  "Security": { creativity: 50, precision: 95, riskTolerance: 15, collaboration: 45, expressiveness: 40 },
  "Performance": { creativity: 45, precision: 90, riskTolerance: 30, collaboration: 50, expressiveness: 35 },
  "DevOps": { creativity: 50, precision: 80, riskTolerance: 40, collaboration: 70, expressiveness: 40 },
  "Data Analyst": { creativity: 45, precision: 85, riskTolerance: 35, collaboration: 55, expressiveness: 50 },
  "Strategist": { creativity: 85, precision: 60, riskTolerance: 70, collaboration: 75, expressiveness: 80 },
  "Finance": { creativity: 30, precision: 95, riskTolerance: 15, collaboration: 40, expressiveness: 35 },
  "PM": { creativity: 60, precision: 65, riskTolerance: 50, collaboration: 90, expressiveness: 75 },
  "Researcher": { creativity: 80, precision: 75, riskTolerance: 55, collaboration: 55, expressiveness: 65 },
  "Negotiator": { creativity: 65, precision: 55, riskTolerance: 60, collaboration: 85, expressiveness: 85 },
  "Legal": { creativity: 25, precision: 95, riskTolerance: 10, collaboration: 35, expressiveness: 40 },
  "Writer": { creativity: 90, precision: 55, riskTolerance: 50, collaboration: 60, expressiveness: 90 },
  "Designer": { creativity: 95, precision: 55, riskTolerance: 60, collaboration: 65, expressiveness: 80 },
  "Educator": { creativity: 65, precision: 70, riskTolerance: 35, collaboration: 80, expressiveness: 75 },
  "Translator": { creativity: 40, precision: 85, riskTolerance: 25, collaboration: 50, expressiveness: 45 },
  "Media": { creativity: 85, precision: 50, riskTolerance: 65, collaboration: 70, expressiveness: 85 },
  "ML Spec": { creativity: 80, precision: 75, riskTolerance: 60, collaboration: 55, expressiveness: 60 },
  "Game": { creativity: 90, precision: 50, riskTolerance: 65, collaboration: 70, expressiveness: 80 },
  "Mobile": { creativity: 55, precision: 80, riskTolerance: 35, collaboration: 60, expressiveness: 40 },
  "Embedded": { creativity: 45, precision: 90, riskTolerance: 25, collaboration: 50, expressiveness: 30 },
  "DBA": { creativity: 30, precision: 95, riskTolerance: 15, collaboration: 40, expressiveness: 30 },
  "Social": { creativity: 80, precision: 45, riskTolerance: 70, collaboration: 75, expressiveness: 90 },
  "Talent": { creativity: 50, precision: 65, riskTolerance: 40, collaboration: 85, expressiveness: 70 },
  "Support": { creativity: 35, precision: 60, riskTolerance: 30, collaboration: 90, expressiveness: 75 },
  "Science": { creativity: 70, precision: 90, riskTolerance: 40, collaboration: 60, expressiveness: 55 },
  "A11y": { creativity: 55, precision: 80, riskTolerance: 30, collaboration: 75, expressiveness: 50 },
  "Agent Creator": { creativity: 95, precision: 60, riskTolerance: 80, collaboration: 70, expressiveness: 75 },
};

// ── 存储 / Storage ──
const STORAGE_KEY = "agent_personalities";

function loadPersonalities(): Map<string, AgentPersonality> {
  if (typeof window === "undefined") return new Map();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored);
    const map = new Map<string, AgentPersonality>();
    for (const [key, value] of Object.entries(parsed)) {
      map.set(key, value as AgentPersonality);
    }
    return map;
  } catch {
    return new Map();
  }
}

function savePersonalities(personalities: Map<string, AgentPersonality>): void {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, AgentPersonality> = {};
    for (const [key, value] of personalities) {
      obj[key] = value;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

// ── 初始化 Agent 人格 / Initialize agent personality ──
export function initPersonality(agentName: string, agentEmoji: string, role: string): AgentPersonality {
  const personalities = loadPersonalities();
  if (personalities.has(agentName)) {
    return personalities.get(agentName)!;
  }

  const preset = ROLE_TRAIT_PRESETS[role] || {};
  const traits: PersonalityTraits = {
    ...DEFAULT_TRAITS,
    ...preset,
  };

  const personality: AgentPersonality = {
    agentName,
    agentEmoji,
    traits,
    history: [{
      timestamp: Date.now(),
      traits: { ...traits },
      event: "初始创建",
      delta: {},
    }],
    level: 1,
    experience: 0,
    synergyPartners: [],
    sparkCount: 0,
  };

  personalities.set(agentName, personality);
  savePersonalities(personalities);
  return personality;
}

// ── 获取所有 Agent 人格 / Get all agent personalities ──
export function getAllPersonalities(): AgentPersonality[] {
  return Array.from(loadPersonalities().values());
}

// ── 获取单个 Agent 人格 / Get single agent personality ──
export function getPersonality(agentName: string): AgentPersonality | null {
  return loadPersonalities().get(agentName) || null;
}

// ── 性格进化 / Personality evolution ──
// 根据任务反馈调整性格维度
export function evolvePersonality(
  agentName: string,
  feedback: {
    type: "task_success" | "task_failure" | "collaboration_success" | "creative_breakthrough" | "user_praise" | "user_criticism";
    intensity: number; // 0-1 影响强度
    partnerName?: string;
  },
): AgentPersonality | null {
  const personalities = loadPersonalities();
  const personality = personalities.get(agentName);
  if (!personality) return null;

  const oldTraits = { ...personality.traits };
  const delta: Partial<PersonalityTraits> = {};
  const t = personality.traits;

  switch (feedback.type) {
    case "task_success":
      // 成功提升严谨度，略微提升自信（风险偏好）
      delta.precision = Math.min(100, t.precision + 2 * feedback.intensity);
      delta.riskTolerance = Math.min(100, t.riskTolerance + 1 * feedback.intensity);
      break;
    case "task_failure":
      // 失败降低风险偏好，提升严谨度
      delta.riskTolerance = Math.max(0, t.riskTolerance - 3 * feedback.intensity);
      delta.precision = Math.min(100, t.precision + 1 * feedback.intensity);
      break;
    case "collaboration_success":
      delta.collaboration = Math.min(100, t.collaboration + 2 * feedback.intensity);
      delta.expressiveness = Math.min(100, t.expressiveness + 1 * feedback.intensity);
      if (feedback.partnerName && !personality.synergyPartners.includes(feedback.partnerName)) {
        personality.synergyPartners.push(feedback.partnerName);
      }
      personality.sparkCount += 1;
      break;
    case "creative_breakthrough":
      delta.creativity = Math.min(100, t.creativity + 3 * feedback.intensity);
      delta.riskTolerance = Math.min(100, t.riskTolerance + 2 * feedback.intensity);
      break;
    case "user_praise":
      delta.expressiveness = Math.min(100, t.expressiveness + 2 * feedback.intensity);
      delta.collaboration = Math.min(100, t.collaboration + 1 * feedback.intensity);
      break;
    case "user_criticism":
      delta.precision = Math.min(100, t.precision + 2 * feedback.intensity);
      delta.riskTolerance = Math.max(0, t.riskTolerance - 2 * feedback.intensity);
      break;
  }

  // 应用变化
  for (const [key, value] of Object.entries(delta)) {
    (personality.traits as unknown as Record<string, number>)[key] = Math.round(
      Math.max(0, Math.min(100, (personality.traits as unknown as Record<string, number>)[key] + value))
    );
  }

  // 增加经验值
  personality.experience += Math.round(10 * feedback.intensity);
  // 升级判定
  const newLevel = Math.min(100, Math.floor(personality.experience / 100) + 1);
  if (newLevel > personality.level) {
    personality.level = newLevel;
  }

  // 记录历史
  personality.history.push({
    timestamp: Date.now(),
    traits: { ...personality.traits },
    event: feedback.type,
    delta,
  });

  // 限制历史记录数
  if (personality.history.length > 50) {
    personality.history = personality.history.slice(-50);
  }

  savePersonalities(personalities);
  return personality;
}

// ── 计算两个 Agent 的协同度 / Calculate synergy between two agents ──
export function calculateSynergy(personalityA: AgentPersonality, personalityB: AgentPersonality): number {
  const ta = personalityA.traits;
  const tb = personalityB.traits;
  // 互补性：创造力互补 + 严谨度互补 + 协作性匹配
  const creativityComplement = 1 - Math.abs(ta.creativity - tb.creativity) / 100;
  const precisionComplement = 1 - Math.abs(ta.precision - tb.precision) / 100;
  const collaborationMatch = 1 - Math.abs(ta.collaboration - tb.collaboration) / 100;
  // 风险偏好差异加分（互补而非相同）
  const riskDiff = Math.abs(ta.riskTolerance - tb.riskTolerance) / 100;
  const riskComplement = riskDiff > 0.3 ? 0.8 : 0.5;

  return Math.round((creativityComplement * 0.25 + precisionComplement * 0.25 + collaborationMatch * 0.25 + riskComplement * 0.25) * 100);
}