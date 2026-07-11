"use client";

// ═══════════════════════════════════════════════════════════════
// 成就 & 徽章系统 / Achievement & Badge System
// ═══════════════════════════════════════════════════════════════

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "milestone" | "skill" | "special" | "secret";
  rarity: "common" | "rare" | "epic" | "legendary";
  // 每个 Agent 独立追踪的计数器
  check: (stats: AgentStats) => boolean;
}

export interface AgentStats {
  agentName: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  totalToolsUsed: number;
  webSearches: number;
  fileGenerated: number;
  debateParticipations: number;
  debateWins: number;
  canvasActions: number;
  cafeChats: number;
  collaborationCount: number;
  // 用户全局
  isUser?: boolean;
}

export interface UnlockedAchievement {
  achievementId: string;
  agentName: string;
  unlockedAt: number;
}

// ── 成就定义库 / Achievement definitions ──
export const ACHIEVEMENTS: Achievement[] = [
  // ── 里程碑 / Milestone ──
  {
    id: "first_run",
    name: "初次登场",
    description: "完成第一次任务",
    emoji: "🎬",
    category: "milestone",
    rarity: "common",
    check: (s) => s.totalRuns >= 1,
  },
  {
    id: "ten_runs",
    name: "十全十美",
    description: "累计完成 10 次任务",
    emoji: "🔟",
    category: "milestone",
    rarity: "common",
    check: (s) => s.totalRuns >= 10,
  },
  {
    id: "fifty_runs",
    name: "半个世纪",
    description: "累计完成 50 次任务",
    emoji: "🏆",
    category: "milestone",
    rarity: "rare",
    check: (s) => s.totalRuns >= 50,
  },
  {
    id: "hundred_runs",
    name: "百战老兵",
    description: "累计完成 100 次任务",
    emoji: "💯",
    category: "milestone",
    rarity: "epic",
    check: (s) => s.totalRuns >= 100,
  },
  {
    id: "perfect_streak",
    name: "连胜神话",
    description: "连续 10 次任务成功",
    emoji: "🔥",
    category: "milestone",
    rarity: "rare",
    check: (s) => s.successRuns >= 10 && s.failedRuns === 0,
  },

  // ── 技能 / Skill ──
  {
    id: "tool_master",
    name: "工具大师",
    description: "累计使用工具 20 次",
    emoji: "🔧",
    category: "skill",
    rarity: "rare",
    check: (s) => s.totalToolsUsed >= 20,
  },
  {
    id: "web_explorer",
    name: "网络冲浪者",
    description: "完成 10 次联网搜索",
    emoji: "🌐",
    category: "skill",
    rarity: "common",
    check: (s) => s.webSearches >= 10,
  },
  {
    id: "file_factory",
    name: "文件工厂",
    description: "生成 30 个文件",
    emoji: "🏭",
    category: "skill",
    rarity: "rare",
    check: (s) => s.fileGenerated >= 30,
  },
  {
    id: "debater",
    name: "雄辩家",
    description: "参与 5 次辩论",
    emoji: "🎤",
    category: "skill",
    rarity: "common",
    check: (s) => s.debateParticipations >= 5,
  },
  {
    id: "debate_champion",
    name: "辩论冠军",
    description: "在辩论中获胜 3 次",
    emoji: "👑",
    category: "skill",
    rarity: "epic",
    check: (s) => s.debateWins >= 3,
  },
  {
    id: "social_butterfly",
    name: "社交达人",
    description: "在咖啡馆聊天 20 次",
    emoji: "🦋",
    category: "skill",
    rarity: "rare",
    check: (s) => s.cafeChats >= 20,
  },
  {
    id: "collaborator",
    name: "协作之星",
    description: "参与 15 次多人协作",
    emoji: "🤝",
    category: "skill",
    rarity: "rare",
    check: (s) => s.collaborationCount >= 15,
  },

  // ── 特殊 / Special ──
  {
    id: "phoenix",
    name: "浴火重生",
    description: "失败后立即成功完成新任务",
    emoji: "🦅",
    category: "special",
    rarity: "epic",
    check: (s) => s.failedRuns >= 1 && s.successRuns >= 1,
  },
  {
    id: "all_nighter",
    name: "不眠之夜",
    description: "单次任务中调用超过 5 个工具",
    emoji: "🌙",
    category: "special",
    rarity: "rare",
    check: (s) => s.totalToolsUsed >= 5,
  },
  {
    id: "canvas_artist",
    name: "画布艺术家",
    description: "在协作画布上绘制 10 次",
    emoji: "🎨",
    category: "special",
    rarity: "rare",
    check: (s) => s.canvasActions >= 10,
  },

  // ── 隐藏 / Secret ──
  {
    id: "speed_demon",
    name: "闪电侠",
    description: "30 秒内完成任务",
    emoji: "⚡",
    category: "secret",
    rarity: "legendary",
    check: (s) => false, // 需要额外时间戳判断
  },
  {
    id: "jack_of_all",
    name: "万能胶",
    description: "在所有类别的成就中至少获得一个",
    emoji: "🌈",
    category: "secret",
    rarity: "epic",
    check: (s) => false, // 需要跨类别判断
  },
  {
    id: "first_blood",
    name: "首杀",
    description: "第一次任务失败",
    emoji: "💀",
    category: "secret",
    rarity: "common",
    check: (s) => s.failedRuns >= 1,
  },
];

// ── 用户全局成就 / User achievements ──
export const USER_ACHIEVEMENTS: Achievement[] = [
  {
    id: "user_spectator",
    name: "旁观者",
    description: "围观 10 次 Agent 协作",
    emoji: "👀",
    category: "milestone",
    rarity: "common",
    check: (s) => s.totalRuns >= 10,
  },
  {
    id: "user_commander",
    name: "指挥官",
    description: "发起 50 次任务",
    emoji: "🎖️",
    category: "milestone",
    rarity: "rare",
    check: (s) => s.totalRuns >= 50,
  },
  {
    id: "user_debate_host",
    name: "辩论主持人",
    description: "发起 10 次辩论",
    emoji: "📺",
    category: "skill",
    rarity: "rare",
    check: (s) => s.debateParticipations >= 10,
  },
  {
    id: "user_collector",
    name: "收藏家",
    description: "收集 5 个灵感卡片",
    emoji: "🃏",
    category: "special",
    rarity: "rare",
    check: (s) => s.cafeChats >= 5,
  },
  {
    id: "user_curator",
    name: "策展人",
    description: "在画布上创建 5 个元素",
    emoji: "🖼️",
    category: "special",
    rarity: "rare",
    check: (s) => s.canvasActions >= 5,
  },
];

// ── 成就存储 / Achievement storage ──
const STORAGE_KEY = "agent_achievements";
const USER_STORAGE_KEY = "user_achievements";
const STATS_KEY = "agent_stats";
const USER_STATS_KEY = "user_stats";
const CONSECUTIVE_KEY = "agent_consecutive";
const LAST_FAILED_KEY = "agent_last_failed";

export function getUnlockedAchievements(agentName: string): UnlockedAchievement[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const all = JSON.parse(data) as Record<string, UnlockedAchievement[]>;
    return all[agentName] || [];
  } catch { return []; }
}

export function getAllUnlockedAchievements(): Record<string, UnlockedAchievement[]> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

export function getUserAchievements(): UnlockedAchievement[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function getAgentStats(agentName: string): AgentStats {
  if (typeof window === "undefined") {
    return { agentName, totalRuns: 0, successRuns: 0, failedRuns: 0, totalToolsUsed: 0, webSearches: 0, fileGenerated: 0, debateParticipations: 0, debateWins: 0, canvasActions: 0, cafeChats: 0, collaborationCount: 0 };
  }
  try {
    const data = localStorage.getItem(STATS_KEY);
    const all = data ? JSON.parse(data) as Record<string, AgentStats> : {};
    return all[agentName] || { agentName, totalRuns: 0, successRuns: 0, failedRuns: 0, totalToolsUsed: 0, webSearches: 0, fileGenerated: 0, debateParticipations: 0, debateWins: 0, canvasActions: 0, cafeChats: 0, collaborationCount: 0 };
  } catch {
    return { agentName, totalRuns: 0, successRuns: 0, failedRuns: 0, totalToolsUsed: 0, webSearches: 0, fileGenerated: 0, debateParticipations: 0, debateWins: 0, canvasActions: 0, cafeChats: 0, collaborationCount: 0 };
  }
}

export function getUserStats(): AgentStats {
  if (typeof window === "undefined") {
    return { agentName: "USER", totalRuns: 0, successRuns: 0, failedRuns: 0, totalToolsUsed: 0, webSearches: 0, fileGenerated: 0, debateParticipations: 0, debateWins: 0, canvasActions: 0, cafeChats: 0, collaborationCount: 0, isUser: true };
  }
  try {
    const data = localStorage.getItem(USER_STATS_KEY);
    return data ? JSON.parse(data) : { agentName: "USER", totalRuns: 0, successRuns: 0, failedRuns: 0, totalToolsUsed: 0, webSearches: 0, fileGenerated: 0, debateParticipations: 0, debateWins: 0, canvasActions: 0, cafeChats: 0, collaborationCount: 0, isUser: true };
  } catch {
    return { agentName: "USER", totalRuns: 0, successRuns: 0, failedRuns: 0, totalToolsUsed: 0, webSearches: 0, fileGenerated: 0, debateParticipations: 0, debateWins: 0, canvasActions: 0, cafeChats: 0, collaborationCount: 0, isUser: true };
  }
}

function saveStats(agentName: string, stats: AgentStats) {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STATS_KEY);
    const all = data ? JSON.parse(data) as Record<string, AgentStats> : {};
    all[agentName] = stats;
    localStorage.setItem(STATS_KEY, JSON.stringify(all));
  } catch {}
}

function saveUserStats(stats: AgentStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function saveAchievements(agentName: string, achievements: UnlockedAchievement[]) {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const all = data ? JSON.parse(data) as Record<string, UnlockedAchievement[]> : {};
    all[agentName] = achievements;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function saveUserAchievements(achievements: UnlockedAchievement[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(achievements));
  } catch {}
}

// ── 解锁成就队列（用于动画展示）/ Unlock queue ──
let pendingUnlocks: { achievement: Achievement; agentName: string }[] = [];
let unlockListener: ((a: Achievement, agentName: string) => void) | null = null;

export function onAchievementUnlock(cb: (a: Achievement, agentName: string) => void) {
  unlockListener = cb;
  // 处理积压的解锁
  while (pendingUnlocks.length > 0) {
    const u = pendingUnlocks.shift()!;
    cb(u.achievement, u.agentName);
  }
}

// ── 跟踪 Agent 运行 / Track agent run ──
export function trackAgentRun(agentName: string, success: boolean, toolsUsed: number, webSearches: number, filesGenerated: number) {
  const stats = getAgentStats(agentName);
  stats.totalRuns++;
  if (success) stats.successRuns++;
  else stats.failedRuns++;
  stats.totalToolsUsed += toolsUsed;
  stats.webSearches += webSearches;
  stats.fileGenerated += filesGenerated;

  // 连胜追踪
  if (success) {
    const consecutive = getConsecutive(agentName) + 1;
    setConsecutive(agentName, consecutive);
  } else {
    setConsecutive(agentName, 0);
    setLastFailed(agentName, Date.now());
  }

  saveStats(agentName, stats);
  checkAndUnlock(agentName, stats);

  // 用户统计
  const userStats = getUserStats();
  userStats.totalRuns++;
  userStats.totalToolsUsed += toolsUsed;
  saveUserStats(userStats);
  checkAndUnlockUser(userStats);
}

export function trackDebateParticipation(agentName: string, won: boolean) {
  const stats = getAgentStats(agentName);
  stats.debateParticipations++;
  if (won) stats.debateWins++;
  saveStats(agentName, stats);
  checkAndUnlock(agentName, stats);

  const userStats = getUserStats();
  userStats.debateParticipations++;
  saveUserStats(userStats);
  checkAndUnlockUser(userStats);
}

export function trackCanvasAction(agentName: string) {
  const stats = getAgentStats(agentName);
  stats.canvasActions++;
  saveStats(agentName, stats);
  checkAndUnlock(agentName, stats);

  const userStats = getUserStats();
  userStats.canvasActions++;
  saveUserStats(userStats);
  checkAndUnlockUser(userStats);
}

export function trackCafeChat(agentName: string) {
  const stats = getAgentStats(agentName);
  stats.cafeChats++;
  saveStats(agentName, stats);
  checkAndUnlock(agentName, stats);

  const userStats = getUserStats();
  userStats.cafeChats++;
  saveUserStats(userStats);
  checkAndUnlockUser(userStats);
}

export function trackCollaboration(agentName: string) {
  const stats = getAgentStats(agentName);
  stats.collaborationCount++;
  saveStats(agentName, stats);
}

// ── 连胜追踪 / Consecutive streak ──
function getConsecutive(agentName: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const data = localStorage.getItem(CONSECUTIVE_KEY);
    const all = data ? JSON.parse(data) as Record<string, number> : {};
    return all[agentName] || 0;
  } catch { return 0; }
}

function setConsecutive(agentName: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(CONSECUTIVE_KEY);
    const all = data ? JSON.parse(data) as Record<string, number> : {};
    all[agentName] = value;
    localStorage.setItem(CONSECUTIVE_KEY, JSON.stringify(all));
  } catch {}
}

function setLastFailed(agentName: string, ts: number) {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(LAST_FAILED_KEY);
    const all = data ? JSON.parse(data) as Record<string, number> : {};
    all[agentName] = ts;
    localStorage.setItem(LAST_FAILED_KEY, JSON.stringify(all));
  } catch {}
}

// ── 检查并解锁 / Check and unlock ──
function checkAndUnlock(agentName: string, stats: AgentStats) {
  const unlocked = getUnlockedAchievements(agentName);
  const unlockedIds = new Set(unlocked.map(u => u.achievementId));

  for (const ach of ACHIEVEMENTS) {
    if (unlockedIds.has(ach.id)) continue;
    if (ach.check(stats)) {
      unlocked.push({ achievementId: ach.id, agentName, unlockedAt: Date.now() });
      saveAchievements(agentName, unlocked);
      if (unlockListener) {
        unlockListener(ach, agentName);
      } else {
        pendingUnlocks.push({ achievement: ach, agentName });
      }
    }
  }
}

function checkAndUnlockUser(stats: AgentStats) {
  const unlocked = getUserAchievements();
  const unlockedIds = new Set(unlocked.map(u => u.achievementId));

  for (const ach of USER_ACHIEVEMENTS) {
    if (unlockedIds.has(ach.id)) continue;
    if (ach.check(stats)) {
      unlocked.push({ achievementId: ach.id, agentName: "USER", unlockedAt: Date.now() });
      saveUserAchievements(unlocked);
      if (unlockListener) {
        unlockListener(ach, "USER");
      } else {
        pendingUnlocks.push({ achievement: ach, agentName: "USER" });
      }
    }
  }
}

// ── 获取成就详情 / Get achievement detail ──
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id) || USER_ACHIEVEMENTS.find(a => a.id === id);
}

// ── 稀有度颜色 / Rarity colors ──
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "common": return "#6b7280";
    case "rare": return "#3b82f6";
    case "epic": return "#8b5cf6";
    case "legendary": return "#f59e0b";
    default: return "#6b7280";
  }
}

export function getRarityBg(rarity: string): string {
  switch (rarity) {
    case "common": return "#f3f4f6";
    case "rare": return "#eff6ff";
    case "epic": return "#f5f3ff";
    case "legendary": return "#fffbeb";
    default: return "#f3f4f6";
  }
}