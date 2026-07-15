// ═══════════════════════════════════════════════════════════════
// PouchDB 封装 — 每用户独立数据库
// PouchDB Wrapper — Per-user isolated databases
// ═══════════════════════════════════════════════════════════════

// ── 懒加载 PouchDB（避免 SSR 时 self is not defined）/ Lazy load PouchDB (avoid SSR self is not defined) ──
let PouchDBCtor: any = null;
async function getPouchDB(): Promise<any> {
  if (!PouchDBCtor) {
    const mod = await import("pouchdb-browser");
    PouchDBCtor = mod.default;
  }
  return PouchDBCtor;
}

// ── 数据库名称前缀 / Database name prefix ──
const DB_PREFIX = "omnimind_";

// ── 数据库类型 / Database types ──
export type DBType = "sessions" | "settings" | "memories" | "learnings" | "workflows" | "custom_agents";

// ── PouchDB 实例缓存 / PouchDB instance cache ──
const dbCache = new Map<string, any>();

// ── 获取当前用户 ID / Get current user ID ──
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
  if (!userId) {
    for (const db of dbCache.values()) {
      db.close().catch(() => {});
    }
    dbCache.clear();
  }
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

// ── 获取数据库实例 / Get database instance ──
export async function getDB(type: DBType, userId?: string): Promise<any> {
  const uid = userId || currentUserId;
  if (!uid) throw new Error("No user ID available. Please login first.");

  const dbName = `${DB_PREFIX}${uid}_${type}`;
  if (!dbCache.has(dbName)) {
    const PouchDB = await getPouchDB();
    const db = new PouchDB(dbName);
    dbCache.set(dbName, db);
    return db;
  }
  return dbCache.get(dbName)!;
}

// ── 关闭数据库 / Close database ──
export function closeDB(type: DBType, userId?: string): void {
  const uid = userId || currentUserId;
  if (!uid) return;
  const dbName = `${DB_PREFIX}${uid}_${type}`;
  const db = dbCache.get(dbName);
  if (db) {
    db.close().catch(() => {});
    dbCache.delete(dbName);
  }
}

// ── 销毁数据库 / Destroy database ──
export async function destroyDB(type: DBType, userId?: string): Promise<void> {
  const uid = userId || currentUserId;
  if (!uid) return;
  const dbName = `${DB_PREFIX}${uid}_${type}`;
  const db = dbCache.get(dbName);
  if (db) {
    await db.close().catch(() => {});
    dbCache.delete(dbName);
  }
  const PouchDB = await getPouchDB();
  await new PouchDB(dbName).destroy();
}

// ── 通用 CRUD 操作 / Generic CRUD operations ──

// 保存文档 / Save document
export async function saveDoc<T extends { _id: string }>(
  type: DBType,
  doc: T
): Promise<T> {
  const db = await getDB(type);
  try {
    const existing: any = await db.get(doc._id);
    const updated = { ...existing, ...doc, _rev: existing._rev };
    const result = await db.put(updated);
    return { ...updated, _rev: result.rev } as T;
  } catch {
    const result = await db.put(doc);
    return { ...doc, _rev: result.rev } as T;
  }
}

// 获取文档 / Get document
export async function getDoc<T>(type: DBType, id: string): Promise<T | null> {
  const db = await getDB(type);
  try {
    return (await db.get(id)) as T;
  } catch {
    return null;
  }
}

// 删除文档 / Delete document
export async function deleteDoc(type: DBType, id: string): Promise<boolean> {
  const db = await getDB(type);
  try {
    const doc = await db.get(id);
    await db.remove(doc);
    return true;
  } catch {
    return false;
  }
}

// 查询所有文档 / Query all documents
export async function queryAll<T>(
  type: DBType,
  options?: { limit?: number; descending?: boolean; startkey?: string; endkey?: string }
): Promise<T[]> {
  const db = await getDB(type);
  const result = await db.allDocs({
    include_docs: true,
    limit: options?.limit,
    descending: options?.descending || false,
    startkey: options?.startkey,
    endkey: options?.endkey,
  });
  return result.rows.map((row: any) => row.doc as unknown as T);
}

// 批量保存 / Bulk save
export async function bulkSave<T extends { _id: string }>(
  type: DBType,
  docs: T[]
): Promise<void> {
  const db = await getDB(type);
  await db.bulkDocs(docs as any);
}

// ── 会话专用操作 / Session-specific operations ──
export interface SessionDoc {
  _id: string;
  title: string;
  messages: unknown[];
  createdAt: number;
  updatedAt: number;
}

export async function saveSession(session: SessionDoc): Promise<SessionDoc> {
  return saveDoc<SessionDoc>("sessions", session);
}

export async function getSession(id: string): Promise<SessionDoc | null> {
  return getDoc<SessionDoc>("sessions", id);
}

export async function deleteSession(id: string): Promise<boolean> {
  return deleteDoc("sessions", id);
}

export async function listSessions(): Promise<SessionDoc[]> {
  return queryAll<SessionDoc>("sessions", { descending: true });
}

// ── 设置专用操作 / Settings-specific operations ──
export interface SettingsDoc {
  _id: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  embeddingApiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  tavilyApiKey: string;
  darkMode: boolean;
}

const SETTINGS_ID = "app_settings";

export async function saveSettings(settings: Omit<SettingsDoc, "_id">): Promise<SettingsDoc> {
  return saveDoc<SettingsDoc>("settings", { _id: SETTINGS_ID, ...settings });
}

export async function getSettings(): Promise<SettingsDoc | null> {
  return getDoc<SettingsDoc>("settings", SETTINGS_ID);
}

// ── 记忆专用操作 / Memory-specific operations ──
export interface MemoryDoc {
  _id: string;
  content: string;
  agentName: string;
  tags: string[];
  importance: number;
  createdAt: number;
}

export async function saveMemory(memory: MemoryDoc): Promise<MemoryDoc> {
  return saveDoc<MemoryDoc>("memories", memory);
}

export async function listMemories(): Promise<MemoryDoc[]> {
  return queryAll<MemoryDoc>("memories", { descending: true });
}