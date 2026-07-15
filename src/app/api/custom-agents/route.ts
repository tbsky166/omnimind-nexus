// ═══════════════════════════════════════════════════════════════
// 自定义 Agent 持久化 API — 每用户独立存储
// Custom Agent persistence API — Per-user isolated storage
// ═══════════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "users");

// 自定义 Agent 元数据 / Custom Agent metadata
export interface CustomAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  category: string;
  personality: string;
  description: string;
  dslSource?: string;
  createdAt: number;
}

function getUserFile(userId: string) {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "custom-agents.json");
}

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

function readAll(userId: string): CustomAgent[] {
  const filePath = getUserFile(userId);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    }
  } catch { /* ignore */ }
  return [];
}

function writeAll(userId: string, list: CustomAgent[]) {
  const filePath = getUserFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
}

// GET /api/custom-agents — 列出所有自定义 Agent
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }
  const list = readAll(userId);
  list.sort((a, b) => b.createdAt - a.createdAt);
  return Response.json({ agents: list });
}

// POST /api/custom-agents — 新增一个自定义 Agent
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, emoji, role, category, personality, description, dslSource } = body;

    if (!name || !role || !category || !description) {
      return Response.json({ error: "name, role, category, description 为必填" }, { status: 400 });
    }

    const list = readAll(userId);

    const existingIdx = list.findIndex((a) => a.name === name);
    const agent: CustomAgent = {
      id: existingIdx >= 0 ? list[existingIdx].id : `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      emoji: emoji || "🤖",
      role,
      category,
      personality: personality || "",
      description,
      dslSource,
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : Date.now(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = agent;
    } else {
      list.push(agent);
    }

    writeAll(userId, list);
    return Response.json({ success: true, agent });
  } catch {
    return Response.json({ error: "保存自定义 Agent 失败" }, { status: 500 });
  }
}

// DELETE /api/custom-agents?id=xxx — 删除一个自定义 Agent
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id 为必填" }, { status: 400 });
  }

  const list = readAll(userId);
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) {
    return Response.json({ error: "Agent 不存在" }, { status: 404 });
  }

  list.splice(idx, 1);
  writeAll(userId, list);
  return Response.json({ success: true });
}