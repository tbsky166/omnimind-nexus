// ═══════════════════════════════════════════════════════════════
// 自我改进引擎 — 错题本 + 经验学习
// 参考 OpenClaw self-improving-agent：记录错误、模式识别、经验复用
// Self-improving engine — error notebook + experience learning
// ═══════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";

// ── 学习记录 / Learning entry ──
export interface LearningEntry {
  id: string;
  type: "error" | "success" | "pattern" | "fix";
  agentName: string;
  /** 任务上下文 / Task context */
  context: string;
  /** 观察结果 / Observation */
  observation: string;
  /** 根因分析 / Root cause */
  rootCause?: string;
  /** 解决方案 / Solution */
  solution?: string;
  /** 标签 / Tags */
  tags: string[];
  /** 置信度 / Confidence */
  confidence: number;
  /** 发生次数 / Occurrence count */
  occurrences: number;
  /** 首次出现 / First seen */
  firstSeen: number;
  /** 最近出现 / Last seen */
  lastSeen: number;
  /** 关联学习 ID / Related learning IDs */
  relatedIds: string[];
}

// ── 学习存储 / Learning store ──
export interface LearningStore {
  entries: LearningEntry[];
  /** 已识别的模式 / Identified patterns */
  patterns: { pattern: string; tag: string; count: number; entries: string[] }[];
  /** 总学习数 / Total learnings */
  totalLearnings: number;
  /** 成功率趋势 / Success rate trend */
  successRate: number;
  /** 最后更新时间 / Last updated */
  lastUpdated: number;
}

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getLearningsFile(userId: string): string {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "learnings.json");
}

// ── 加载学习存储 / Load learning store ──
export function loadLearnings(userId: string): LearningStore {
  try {
    const filePath = getLearningsFile(userId);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return { entries: [], patterns: [], totalLearnings: 0, successRate: 1, lastUpdated: Date.now() };
}

// ── 保存学习存储 / Save learning store ──
function saveLearnings(userId: string, store: LearningStore): void {
  const filePath = getLearningsFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
}

// ── 语义相似度（简单 Jaccard 相似度）/ Semantic similarity (simple Jaccard) ──
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ── 标签重叠度 / Tag overlap ──
function tagOverlap(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 || tagsB.length === 0) return 0;
  const intersection = tagsA.filter((t) => tagsB.includes(t));
  return intersection.length / Math.max(tagsA.length, tagsB.length);
}

// ── 记录学习 / Record a learning ──
export function recordLearning(userId: string, entry: Omit<LearningEntry, "id" | "firstSeen" | "lastSeen" | "occurrences" | "relatedIds">): LearningEntry {
  const store = loadLearnings(userId);

  // 查找相似的历史学习 / Find similar past learnings
  const similar = store.entries
    .map((e) => ({
      entry: e,
      similarity: jaccardSimilarity(e.observation, entry.observation) * 0.5 + tagOverlap(e.tags, entry.tags) * 0.5,
    }))
    .filter((s) => s.similarity > 0.4)
    .sort((a, b) => b.similarity - a.similarity);

  const now = Date.now();

  if (similar.length > 0 && similar[0].similarity > 0.7) {
    // 高度相似 → 更新已有记录 / High similarity → update existing
    const existing = similar[0].entry;
    existing.occurrences++;
    existing.lastSeen = now;
    existing.confidence = Math.min(1, existing.confidence + 0.05);
    if (entry.solution && !existing.solution) {
      existing.solution = entry.solution;
    }
    if (entry.rootCause && !existing.rootCause) {
      existing.rootCause = entry.rootCause;
    }
    // 合并标签 / Merge tags
    for (const tag of entry.tags) {
      if (!existing.tags.includes(tag)) existing.tags.push(tag);
    }
    saveLearnings(userId, store);
    return existing;
  }

  // 新建记录 / New entry
  const newEntry: LearningEntry = {
    id: `learn_${now}_${Math.random().toString(36).substring(2, 6)}`,
    ...entry,
    occurrences: 1,
    firstSeen: now,
    lastSeen: now,
    relatedIds: similar.slice(0, 3).map((s) => s.entry.id),
  };

  store.entries.push(newEntry);
  store.totalLearnings = store.entries.length;

  // 更新成功率 / Update success rate
  const totalErrors = store.entries.filter((e) => e.type === "error").length;
  const totalSuccesses = store.entries.filter((e) => e.type === "success").length;
  store.successRate = totalSuccesses / Math.max(1, totalErrors + totalSuccesses);

  // 检测模式 / Detect patterns
  detectPatterns(store);

  store.lastUpdated = now;
  saveLearnings(userId, store);

  return newEntry;
}

// ── 检测模式：重复出现 3 次以上的错误 / Detect patterns: errors occurring 3+ times ──
function detectPatterns(store: LearningStore): void {
  const errors = store.entries.filter((e) => e.type === "error");
  const patterns: LearningStore["patterns"] = [];

  // 按标签分组 / Group by tag
  const tagGroups = new Map<string, LearningEntry[]>();
  for (const err of errors) {
    for (const tag of err.tags) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, []);
      tagGroups.get(tag)!.push(err);
    }
  }

  for (const [tag, entries] of tagGroups) {
    if (entries.length >= 3) {
      patterns.push({
        pattern: `频繁出现 ${tag} 相关错误（${entries.length} 次）`,
        tag,
        count: entries.length,
        entries: entries.map((e) => e.id),
      });
    }
  }

  store.patterns = patterns;
}

// ── 查询相关学习 / Query related learnings ──
export function queryLearnings(userId: string, context: string, tags: string[], limit = 5): LearningEntry[] {
  const store = loadLearnings(userId);
  return store.entries
    .map((e) => ({
      entry: e,
      score: jaccardSimilarity(e.observation + " " + e.context, context) * 0.4 +
        tagOverlap(e.tags, tags) * 0.4 +
        (e.confidence * 0.2),
    }))
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

// ── 生成学习摘要（可注入系统提示词）/ Generate learning summary (can be injected into system prompt) ──
export function generateLearningSummary(userId: string): string {
  const store = loadLearnings(userId);

  if (store.entries.length === 0) return "";

  const recentErrors = store.entries
    .filter((e) => e.type === "error")
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 5);

  const recentFixes = store.entries
    .filter((e) => e.type === "fix" && e.solution)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 3);

  const parts: string[] = [];

  parts.push(`## 自我改进引擎 / Self-Improving Engine`);
  parts.push(`总学习记录：${store.totalLearnings} | 成功率：${(store.successRate * 100).toFixed(0)}%`);

  if (store.patterns.length > 0) {
    parts.push(`\n### 已识别的错误模式 / Identified Patterns`);
    for (const p of store.patterns.slice(0, 3)) {
      parts.push(`- ${p.pattern}`);
    }
  }

  if (recentErrors.length > 0) {
    parts.push(`\n### 最近错误 / Recent Errors`);
    for (const e of recentErrors) {
      parts.push(`- [${e.agentName}] ${e.observation.substring(0, 100)}`);
      if (e.solution) parts.push(`  解决：${e.solution.substring(0, 100)}`);
    }
  }

  if (recentFixes.length > 0) {
    parts.push(`\n### 已验证的修复方案 / Verified Fixes`);
    for (const f of recentFixes) {
      parts.push(`- [${f.agentName}] ${f.solution!.substring(0, 120)}`);
    }
  }

  return parts.join("\n");
}

// ── 从错误中提取标签 / Extract tags from error ──
export function extractTagsFromError(error: string, context: string): string[] {
  const tags: string[] = [];
  const combined = (error + " " + context).toLowerCase();

  const tagPatterns: [RegExp, string][] = [
    [/timeout|超时|timed?\s*out/i, "timeout"],
    [/api\s*error|api\s*错误|401|403|404|500|rate.?limit/i, "api-error"],
    [/parse|解析|json|syntax|语法/i, "parse-error"],
    [/tool|工具|function.?call/i, "tool-error"],
    [/auth|认证|unauthorized|key/i, "auth-error"],
    [/file|文件|not.?found|enoent/i, "file-error"],
    [/memory|内存|heap|stack/i, "memory-error"],
    [/network|网络|fetch|connect|econnrefused/i, "network-error"],
    [/stream|流|sse|event.?stream/i, "stream-error"],
    [/type|类型|undefined|null|reference/i, "type-error"],
    [/import|模块|module|require/i, "import-error"],
    [/build|编译|compile|构建/i, "build-error"],
    [/llm|model|模型|generate|completion/i, "llm-error"],
    [/dsl|agent.?dsl|creator/i, "dsl-error"],
    [/search|搜索|tavily|web.?search/i, "search-error"],
    [/approval|审批|approve|deny/i, "approval-error"],
    [/workflow|工作流|pipeline|编排/i, "workflow-error"],
  ];

  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(combined)) tags.push(tag);
  }

  if (tags.length === 0) tags.push("unknown");
  return tags;
}

// ── 导出学习为 Markdown / Export learnings as Markdown ──
export function exportLearningsMarkdown(userId: string): string {
  const store = loadLearnings(userId);

  const lines: string[] = [
    "# OmniMind Nexus — 自我改进学习记录",
    "",
    `> 总记录：${store.totalLearnings} | 成功率：${(store.successRate * 100).toFixed(0)}% | 最后更新：${new Date(store.lastUpdated).toISOString()}`,
    "",
  ];

  if (store.patterns.length > 0) {
    lines.push("## 错误模式", "");
    for (const p of store.patterns) {
      lines.push(`- **${p.tag}**：${p.pattern}`);
    }
    lines.push("");
  }

  const byType = {
    error: store.entries.filter((e) => e.type === "error"),
    fix: store.entries.filter((e) => e.type === "fix"),
    success: store.entries.filter((e) => e.type === "success"),
    pattern: store.entries.filter((e) => e.type === "pattern"),
  };

  for (const [type, entries] of Object.entries(byType)) {
    if (entries.length === 0) continue;
    lines.push(`## ${type.toUpperCase()} (${entries.length})`, "");
    for (const e of entries.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 20)) {
      lines.push(`### ${e.agentName} — ${new Date(e.lastSeen).toLocaleDateString()}`);
      lines.push(`- 上下文：${e.context.substring(0, 100)}`);
      lines.push(`- 观察：${e.observation.substring(0, 150)}`);
      if (e.rootCause) lines.push(`- 根因：${e.rootCause}`);
      if (e.solution) lines.push(`- 解决：${e.solution}`);
      lines.push(`- 标签：${e.tags.join(", ")} | 置信度：${(e.confidence * 100).toFixed(0)}% | 出现 ${e.occurrences} 次`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ── 重置学习 / Reset learnings ──
export function resetLearnings(userId: string): void {
  const empty: LearningStore = { entries: [], patterns: [], totalLearnings: 0, successRate: 1, lastUpdated: Date.now() };
  saveLearnings(userId, empty);
}