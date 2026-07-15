// ═══════════════════════════════════════════════════════════════
// 共享 JWT 密钥 — Edge Runtime 兼容
// Shared JWT Secret — Edge Runtime compatible
// ═══════════════════════════════════════════════════════════════

// 优先使用环境变量，否则使用固定回退值（生产环境必须设置 JWT_SECRET）
// Prefer env var, otherwise use fixed fallback (production MUST set JWT_SECRET)
export const JWT_SECRET = process.env.JWT_SECRET || "omnimind-nexus-secret-change-in-production";
export const TOKEN_NAME = "omnimind_token";