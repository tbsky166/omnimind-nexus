// ═══════════════════════════════════════════════════════════════
// 登录 API / Login API
// ═══════════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { loginUser, TOKEN_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const result = await loginUser(email, password);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 401 });
    }

    // 仅当明确设置 COOKIE_SECURE=true 时才添加 Secure 标志（HTTPS 环境）
    const isSecure = process.env.COOKIE_SECURE === "true";
    const response = Response.json({ user: result.user });
    response.headers.set(
      "Set-Cookie",
      `${TOKEN_NAME}=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${isSecure ? "; Secure" : ""}`
    );
    return response;
  } catch {
    return Response.json({ error: "请求无效" }, { status: 400 });
  }
}