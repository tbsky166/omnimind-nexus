// ═══════════════════════════════════════════════════════════════
// 当前用户 API / Current user API
// ═══════════════════════════════════════════════════════════════
import { getCurrentUser, TOKEN_NAME } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }
  return Response.json({ user });
}

// 注销 / Logout
export async function DELETE() {
  // 仅当明确设置 COOKIE_SECURE=true 时才添加 Secure 标志（HTTPS 环境）
  const isSecure = process.env.COOKIE_SECURE === "true";
  const response = Response.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${TOKEN_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`
  );
  return response;
}