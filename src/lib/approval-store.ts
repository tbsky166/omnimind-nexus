// ═══════════════════════════════════════════════════════════════
// 审批存储 — 跨请求共享的审批状态
// 参考 OpenClaw 2026.6.6 的 exec approvals fail-closed 机制
// ═══════════════════════════════════════════════════════════════

export interface PendingApproval {
  id: string;
  filePath: string;
  oldString: string;
  newString: string;
  /** 变更行数 / Lines changed */
  diffLines: number;
  /** 创建时间 / Creation time */
  createdAt: number;
  /** 状态 / Status */
  status: "pending" | "approved" | "denied";
  /** 超时时间 ms / Timeout in ms */
  timeout: number;
}

/** 每用户审批存储 / Per-user approval store */
const userApprovals = new Map<string, Map<string, PendingApproval>>();

function getUserStore(userId: string): Map<string, PendingApproval> {
  if (!userApprovals.has(userId)) {
    userApprovals.set(userId, new Map());
  }
  return userApprovals.get(userId)!;
}

/** 全局审批存储（兼容旧代码，默认用户） / Global approval store (backward compat, default user) */
export const pendingApprovals = getUserStore("__global__");

/** 审批超时默认 30 秒 / Default approval timeout: 30 seconds */
const APPROVAL_TIMEOUT = 30_000;

/** 创建审批请求 / Create an approval request */
export function createApproval(userId: string, filePath: string, oldString: string, newString: string): PendingApproval {
  const id = `approval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const approval: PendingApproval = {
    id,
    filePath,
    oldString,
    newString,
    diffLines: newString.split("\n").length - oldString.split("\n").length,
    createdAt: Date.now(),
    status: "pending",
    timeout: APPROVAL_TIMEOUT,
  };
  getUserStore(userId).set(id, approval);
  return approval;
}

/** 批准 / Approve */
export function approveApproval(userId: string, id: string): boolean {
  const store = getUserStore(userId);
  const approval = store.get(id);
  if (!approval || approval.status !== "pending") return false;
  approval.status = "approved";
  store.set(id, approval);
  return true;
}

/** 拒绝 / Deny */
export function denyApproval(userId: string, id: string): boolean {
  const store = getUserStore(userId);
  const approval = store.get(id);
  if (!approval || approval.status !== "pending") return false;
  approval.status = "denied";
  store.set(id, approval);
  return true;
}

/** 检查审批状态 / Check approval status */
export function checkApproval(userId: string, id: string): "pending" | "approved" | "denied" | "not_found" {
  const store = getUserStore(userId);
  const approval = store.get(id);
  if (!approval) return "not_found";
  if (approval.status === "pending" && Date.now() - approval.createdAt > approval.timeout) {
    approval.status = "denied";
    store.set(id, approval);
    return "denied";
  }
  return approval.status;
}

/** 清理过期审批 / Clean expired approvals */
export function cleanupApprovals(): void {
  const now = Date.now();
  for (const store of userApprovals.values()) {
    for (const [id, approval] of store) {
      if (approval.status === "pending" && now - approval.createdAt > approval.timeout) {
        store.delete(id);
      }
      if (approval.status !== "pending" && now - approval.createdAt > 60_000) {
        store.delete(id);
      }
    }
  }
}