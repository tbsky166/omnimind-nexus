// 自定义 Agent 持久化 API — 存储 Creator Agent 通过 DSL 创建的 Agent
// Custom Agent persistence API — stores agents created by Creator Agent via DSL
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "custom-agents.json");

// 自定义 Agent 元数据 / Custom Agent metadata
export interface CustomAgent {
  id: string;            // 唯一 ID
  name: string;          // Agent 名称
  emoji: string;         // Emoji 图标
  role: string;          // 角色描述
  category: string;      // 分类
  personality: string;   // 性格描述
  description: string;   // 详细描述
  dslSource?: string;    // 原始 DSL 代码（可选）
  createdAt: number;     // 创建时间戳
}

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

function readAll(): CustomAgent[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list: CustomAgent[]) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

// GET /api/custom-agents — 列出所有自定义 Agent
export async function GET() {
  const list = readAll();
  list.sort((a, b) => b.createdAt - a.createdAt);
  return Response.json({ agents: list });
}

// POST /api/custom-agents — 新增一个自定义 Agent
// body: { name, emoji, role, category, personality, description, dslSource? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, emoji, role, category, personality, description, dslSource } = body;

    if (!name || !role || !category || !description) {
      return Response.json({ error: "name, role, category, description 为必填" }, { status: 400 });
    }

    const list = readAll();

    // 同名去重：若已存在则更新 / Dedup by name: update if exists
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

    writeAll(list);
    return Response.json({ success: true, agent });
  } catch {
    return Response.json({ error: "保存自定义 Agent 失败" }, { status: 500 });
  }
}

// DELETE /api/custom-agents?id=xxx — 删除一个自定义 Agent
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id 为必填" }, { status: 400 });
  }

  const list = readAll();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) {
    return Response.json({ error: "Agent 不存在" }, { status: 404 });
  }

  list.splice(idx, 1);
  writeAll(list);
  return Response.json({ success: true });
}
