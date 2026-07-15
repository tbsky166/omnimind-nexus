// ═══════════════════════════════════════════════════════════════
// 审批 API — 每用户独立审批 / Per-user isolated approval API
// ═══════════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { approveApproval, denyApproval, checkApproval, pendingApprovals } from "@/lib/approval-store";

export const runtime = "nodejs";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

// GET — 查询所有待审批项或单个审批状态 / Query all pending approvals or single approval status
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const status = checkApproval(userId, id);
    const approval = pendingApprovals.get(id);
    return Response.json({
      id,
      status,
      approval: approval || null,
    });
  }

  // 列出所有 pending 状态的审批 / List all pending approvals
  const pending = Array.from(pendingApprovals.values())
    .filter((a) => a.status === "pending")
    .map((a) => ({
      id: a.id,
      filePath: a.filePath,
      oldString: a.oldString.substring(0, 200),
      newString: a.newString.substring(0, 200),
      diffLines: a.diffLines,
      createdAt: a.createdAt,
      timeout: a.timeout,
    }));

  return Response.json({ pending, count: pending.length });
}

// POST — 批准或拒绝 / Approve or deny
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { action, id } = await req.json();

    if (!id || !action) {
      return Response.json({ error: "id and action are required" }, { status: 400 });
    }

    if (action === "approve") {
      const ok = approveApproval(userId, id);
      if (!ok) {
        return Response.json({ error: "审批不存在或已处理" }, { status: 404 });
      }
      return Response.json({ id, status: "approved" });
    }

    if (action === "deny") {
      const ok = denyApproval(userId, id);
      if (!ok) {
        return Response.json({ error: "审批不存在或已处理" }, { status: 404 });
      }
      return Response.json({ id, status: "denied" });
    }

    return Response.json({ error: "Invalid action, use 'approve' or 'deny'" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}