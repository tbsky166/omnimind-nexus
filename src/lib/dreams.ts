// ═══════════════════════════════════════════════════════════════════════
// Agent 记忆梦境 — 记忆巩固 + 跨领域创意联想（受海马体重放理论启发）
// Agent Memory Dreams — memory consolidation + cross-domain creativity (inspired by hippocampal replay theory)
// ═══════════════════════════════════════════════════════════════════════

/** 梦境报告 / Dream report */
export interface DreamReport {
  id: string;
  agentName: string;
  agentEmoji: string;
  timestamp: number;
  dreamContent: string;         // 梦境内容
  inspirationScore: number;     // 灵感度 0-100
  sourceMemories: string[];     // 源于哪些记忆
  tags: string[];               // 标签
  isAdopted: boolean;           // 是否被用户采纳
  crossDomain: boolean;         // 是否跨领域联想
  domainPair: string;           // 跨领域配对描述
}

/** 记忆条目 / Memory entry */
export interface MemoryEntry {
  id: string;
  sessionId: string;
  agentName: string;
  timestamp: number;
  type: "success" | "failure" | "insight" | "pattern" | "question";
  content: string;              // 记忆内容
  tags: string[];               // 自动提取的标签
  embedding: string;            // 简化版：关键词列表（用 | 分隔）
  importance: number;           // 重要性 0-100
  consolidationCount: number;   // 被巩固的次数
}

/** 知识库 / Knowledge base */
export interface KnowledgeBase {
  memories: MemoryEntry[];
  dreamReports: DreamReport[];
  lastConsolidation: number;
}

// ── 存储 / Storage ──
const KB_STORAGE_PREFIX = "agent_knowledge_base";

function getKBKey(userId: string): string {
  return `${KB_STORAGE_PREFIX}_${userId}`;
}

let currentUserId = "";

export function setDreamsUserId(userId: string): void {
  currentUserId = userId;
}

function loadKB(): KnowledgeBase {
  if (typeof window === "undefined") return { memories: [], dreamReports: [], lastConsolidation: 0 };
  try {
    const stored = localStorage.getItem(getKBKey(currentUserId || "anonymous"));
    return stored ? JSON.parse(stored) : { memories: [], dreamReports: [], lastConsolidation: 0 };
  } catch {
    return { memories: [], dreamReports: [], lastConsolidation: 0 };
  }
}

function saveKB(kb: KnowledgeBase): void {
  if (typeof window === "undefined") return;
  try {
    // 限制记忆数量
    if (kb.memories.length > 200) {
      kb.memories = kb.memories.slice(-200);
    }
    if (kb.dreamReports.length > 100) {
      kb.dreamReports = kb.dreamReports.slice(-100);
    }
    localStorage.setItem(getKBKey(currentUserId || "anonymous"), JSON.stringify(kb));
  } catch {}
}

// ── 从内容中提取标签 / Extract tags from content ──
const DOMAIN_TAGS: Record<string, string[]> = {
  "前端": ["react", "vue", "css", "html", "组件", "ui", "前端", "浏览器", "dom"],
  "后端": ["api", "数据库", "sql", "server", "后端", "服务", "接口", "rest"],
  "安全": ["漏洞", "注入", "认证", "加密", "权限", "xss", "csrf", "安全"],
  "性能": ["优化", "延迟", "吞吐", "缓存", "性能", "瓶颈", "并发"],
  "架构": ["架构", "微服务", "分层", "设计模式", "系统设计", "模块"],
  "AI/ML": ["模型", "训练", "推理", "神经网络", "机器学习", "深度学习", "ai"],
  "商业": ["市场", "ROI", "收入", "成本", "商业", "策略", "增长"],
  "用户体验": ["用户", "体验", "交互", "可用性", "设计", "ux"],
  "数据": ["数据", "分析", "统计", "清洗", "etl", "可视化"],
  "DevOps": ["部署", "ci/cd", "docker", "k8s", "监控", "运维"],
};

function extractTags(content: string): string[] {
  const lower = content.toLowerCase();
  const tags: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_TAGS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      tags.push(domain);
    }
  }
  return tags.length > 0 ? tags : ["通用"];
}

// ── 添加记忆 / Add memory ──
export function addMemory(
  agentName: string,
  sessionId: string,
  content: string,
  type: MemoryEntry["type"],
  importance: number = 50,
): MemoryEntry {
  const kb = loadKB();
  const memory: MemoryEntry = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    agentName,
    timestamp: Date.now(),
    type,
    content,
    tags: extractTags(content),
    embedding: extractTags(content).join("|"),
    importance,
    consolidationCount: 0,
  };
  kb.memories.push(memory);
  saveKB(kb);
  return memory;
}

// ── 记忆巩固 / Memory consolidation ──
// 将短期记忆提炼为长期知识
export function consolidateMemories(agentName?: string): MemoryEntry[] {
  const kb = loadKB();
  const targetMemories = agentName
    ? kb.memories.filter(m => m.agentName === agentName)
    : kb.memories;

  const consolidated: MemoryEntry[] = [];
  for (const memory of targetMemories) {
    if (memory.consolidationCount < 3) {
      memory.consolidationCount++;
      // 每巩固一次，重要性略微提升
      memory.importance = Math.min(100, memory.importance + 5);
      consolidated.push(memory);
    }
  }

  kb.lastConsolidation = Date.now();
  saveKB(kb);
  return consolidated;
}

// ── 生成梦境 / Generate dream ──
// 随机组合两个不同领域的记忆，产生跨领域创意联想
export function generateDream(agentName: string, agentEmoji: string): DreamReport | null {
  const kb = loadKB();
  const agentMemories = kb.memories.filter(m => m.agentName === agentName);
  if (agentMemories.length < 2) return null;

  // 选两个不同领域的记忆
  const shuffled = [...agentMemories].sort(() => Math.random() - 0.5);
  const memA = shuffled[0];
  const memB = shuffled.find(m => m.tags.some(t => !memA.tags.includes(t)));
  if (!memB) return null;

  const crossDomain = true;
  const domainPair = `${memA.tags[0] || "未知"} × ${memB.tags[0] || "未知"}`;

  // 生成梦境叙事
  const dreamTemplates = [
    `梦见将「${memA.tags[0]}」领域的经验应用到「${memB.tags[0]}」...\n\n💡 灵感：${memA.content.slice(0, 60)}... 与 ${memB.content.slice(0, 60)}... 之间可能存在意想不到的联系。也许可以用 ${memA.tags[0]} 的方法论来解决 ${memB.tags[0]} 的问题？`,
    `在梦中，${memA.tags[0]} 和 ${memB.tags[0]} 奇妙地融合在了一起...\n\n🔮 启示：从「${memA.content.slice(0, 50)}」中获得的经验，或许可以跨界应用到「${memB.content.slice(0, 50)}」的场景中。`,
    `梦到了一个奇特的场景：${memA.tags[0]} 的底层逻辑被用来重构 ${memB.tags[0]}...\n\n✨ 联想：${memA.content.slice(0, 50)} → 这个思路如果迁移到 ${memB.tags[0]}，可能会产生全新的解决方案。`,
  ];

  const dreamContent = dreamTemplates[Math.floor(Math.random() * dreamTemplates.length)];

  const inspirationScore = Math.round(
    (memA.importance + memB.importance) / 2 * (Math.random() * 0.4 + 0.6)
  );

  const dream: DreamReport = {
    id: `dream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    agentName,
    agentEmoji,
    timestamp: Date.now(),
    dreamContent,
    inspirationScore,
    sourceMemories: [memA.id, memB.id],
    tags: [...new Set([...memA.tags, ...memB.tags])],
    isAdopted: false,
    crossDomain,
    domainPair,
  };

  kb.dreamReports.push(dream);
  saveKB(kb);
  return dream;
}

// ── 批量生成梦境（所有 Agent）/ Batch generate dreams (all agents) ──
export function generateAllDreams(agentNames: Array<{ name: string; emoji: string }>): DreamReport[] {
  const dreams: DreamReport[] = [];
  for (const agent of agentNames) {
    const dream = generateDream(agent.name, agent.emoji);
    if (dream) dreams.push(dream);
  }
  return dreams;
}

// ── 获取梦境报告 / Get dream reports ──
export function getDreamReports(agentName?: string): DreamReport[] {
  const kb = loadKB();
  return agentName
    ? kb.dreamReports.filter(d => d.agentName === agentName)
    : kb.dreamReports;
}

// ── 采纳梦境 / Adopt dream ──
export function adoptDream(dreamId: string): DreamReport | null {
  const kb = loadKB();
  const dream = kb.dreamReports.find(d => d.id === dreamId);
  if (dream) {
    dream.isAdopted = true;
    saveKB(kb);
  }
  return dream || null;
}

// ── 获取高灵感梦境 / Get high-inspiration dreams ──
export function getTopDreams(count: number = 5): DreamReport[] {
  const kb = loadKB();
  return kb.dreamReports
    .filter(d => !d.isAdopted)
    .sort((a, b) => b.inspirationScore - a.inspirationScore)
    .slice(0, count);
}

// ── 获取知识库统计 / Get knowledge base stats ──
export function getKBStats(): { totalMemories: number; totalDreams: number; adoptedDreams: number; lastConsolidation: number } {
  const kb = loadKB();
  return {
    totalMemories: kb.memories.length,
    totalDreams: kb.dreamReports.length,
    adoptedDreams: kb.dreamReports.filter(d => d.isAdopted).length,
    lastConsolidation: kb.lastConsolidation,
  };
}

// ── 清除旧记忆 / Clear old memories ──
export function clearOldMemories(daysOld: number = 30): number {
  const kb = loadKB();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const before = kb.memories.length;
  kb.memories = kb.memories.filter(m => m.importance > 60 || m.timestamp > cutoff);
  saveKB(kb);
  return before - kb.memories.length;
}