// ═══════════════════════════════════════════════════════════════
// 统计数据 API — 每用户独立统计
// Stats API — Per-user isolated stats
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { agents } from "@/data/agents";

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

interface SessionInfo {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  messages?: Array<{ speaker: string; isUser?: boolean; isSystem?: boolean }>;
}

async function getSessionsStats(userId: string) {
  try {
    const dir = path.join(DATA_DIR, userId, "sessions");
    const files = await fs.readdir(dir);
    const allSessions = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const content = await fs.readFile(path.join(dir, f), "utf-8");
          const data = JSON.parse(content);
          return {
            id: data.id,
            title: data.title || "Untitled",
            createdAt: data.createdAt || 0,
            updatedAt: data.updatedAt || 0,
            messageCount: data.messages?.length || 0,
            messages: data.messages || [],
          } as SessionInfo;
        })
    );
    return {
      total: allSessions.length,
      recent: allSessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10)
        .map((s) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt, messageCount: s.messageCount })),
      allSessions,
    };
  } catch {
    return { total: 0, recent: [], allSessions: [] as SessionInfo[] };
  }
}

async function getWorkspaceFileCount(userId: string) {
  try {
    const dir = path.join(process.cwd(), "public", "workspace", userId);
    const files = await fs.readdir(dir);
    return files.filter((f) => !f.startsWith(".")).length;
  } catch {
    return 0;
  }
}

function getAgentUsage(sessions: SessionInfo[]) {
  const usage: Record<string, number> = {};
  for (const session of sessions) {
    for (const msg of session.messages || []) {
      if (msg.speaker && !msg.isUser && !msg.isSystem && msg.speaker !== "Router" && msg.speaker !== "仲裁组" && msg.speaker !== "Quality Gate") {
        usage[msg.speaker] = (usage[msg.speaker] || 0) + 1;
      }
    }
  }
  return Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const [sessions, workspaceFiles] = await Promise.all([
      getSessionsStats(userId),
      getWorkspaceFileCount(userId),
    ]);

    const agentUsage = getAgentUsage(sessions.allSessions);

    return NextResponse.json({
      sessions: { total: sessions.total, recent: sessions.recent },
      workspaceFiles,
      agentUsage,
      totalAgents: agents.length,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}