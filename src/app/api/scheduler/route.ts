// ═══════════════════════════════════════════════════════════════
// 调度器 API — 定时任务管理
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { loadTasks, createTask, updateTask, deleteTask, toggleTask } from "@/lib/scheduler";

export const runtime = "nodejs";

function getUserId(req: NextRequest): string {
  return req.headers.get("x-user-id") || "anonymous";
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const tasks = loadTasks(userId);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  try {
    const body = await req.json();
    const { action, name, description, cronExpression, prompt, agents, id, updates } = body;

    switch (action) {
      case "create": {
        if (!name || !cronExpression || !prompt) {
          return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
        }
        const task = createTask(
          userId,
          name,
          description || "",
          cronExpression,
          prompt,
          agents || [],
        );
        return NextResponse.json({ task });
      }
      case "update": {
        if (!id) {
          return NextResponse.json({ error: "缺少 id" }, { status: 400 });
        }
        const task = updateTask(userId, id, updates || {});
        if (!task) {
          return NextResponse.json({ error: "任务不存在" }, { status: 404 });
        }
        return NextResponse.json({ task });
      }
      case "toggle": {
        if (!id) {
          return NextResponse.json({ error: "缺少 id" }, { status: 400 });
        }
        const task = toggleTask(userId, id);
        if (!task) {
          return NextResponse.json({ error: "任务不存在" }, { status: 404 });
        }
        return NextResponse.json({ task });
      }
      case "delete": {
        if (!id) {
          return NextResponse.json({ error: "缺少 id" }, { status: 400 });
        }
        const ok = deleteTask(userId, id);
        if (!ok) {
          return NextResponse.json({ error: "任务不存在" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}