// ═══════════════════════════════════════════════════════════════
// 工作流 API — 每用户独立工作流 / Per-user isolated workflow API
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { loadWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, getExecutionOrder } from "@/lib/workflow";

export const runtime = "nodejs";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const workflows = loadWorkflows(userId);
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, name, description, id, updates } = body;

    switch (action) {
      case "create": {
        if (!name) {
          return NextResponse.json({ error: "缺少工作流名称" }, { status: 400 });
        }
        const workflow = createWorkflow(userId, name, description || "");
        return NextResponse.json({ workflow });
      }
      case "update": {
        if (!id) {
          return NextResponse.json({ error: "缺少 id" }, { status: 400 });
        }
        const workflow = updateWorkflow(userId, id, updates || {});
        if (!workflow) {
          return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
        }
        return NextResponse.json({ workflow });
      }
      case "delete": {
        if (!id) {
          return NextResponse.json({ error: "缺少 id" }, { status: 400 });
        }
        const ok = deleteWorkflow(userId, id);
        if (!ok) {
          return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }
      case "execute_order": {
        if (!id) {
          return NextResponse.json({ error: "缺少 id" }, { status: 400 });
        }
        const workflows = loadWorkflows(userId);
        const workflow = workflows.find((w) => w.id === id);
        if (!workflow) {
          return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
        }
        const order = getExecutionOrder(workflow);
        return NextResponse.json({ order });
      }
      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}