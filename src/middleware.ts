// ═══════════════════════════════════════════════════════════════
// 路由守卫中间件 — 未登录重定向到 /login
// Route Guard Middleware — redirect unauthenticated users to /login
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET, TOKEN_NAME } from "@/lib/jwt-secret";

const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

// 公开路由 — 不需要登录 / Public routes — no auth required
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
];

// 静态资源和内部路由 / Static assets and internal routes
const STATIC_PREFIXES = ["/_next", "/favicon.ico"];

// Cookie 同意检查 / Cookie consent check
const CONSENT_COOKIE = "cookie_consent";

function hasCookieConsent(request: NextRequest): boolean {
  return request.cookies.get(CONSENT_COOKIE)?.value === "true";
}

async function getTokenPayload(request: NextRequest) {
  const token = request.cookies.get(TOKEN_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { userId: string; email: string; username: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 允许静态资源 / Allow static assets
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 允许公开路由 / Allow public routes
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // 已登录访问 /login → 重定向到首页 / Logged in user visiting /login → redirect to home
  if (pathname === "/login") {
    const payload = await getTokenPayload(request);
    if (payload) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 检查登录状态 / Check auth status
  const payload = await getTokenPayload(request);

  // API 路由 — 检查 Cookie 同意 + 登录 / API routes — check consent + auth
  if (pathname.startsWith("/api/")) {
    if (!hasCookieConsent(request)) {
      return NextResponse.json({ error: "请先同意 Cookie 使用", needConsent: true }, { status: 403 });
    }
    if (!payload) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    // 只注入 userId，不暴露 email / Only inject userId, don't expose email
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId);
    return response;
  }

  // 页面路由 — 检查 Cookie 同意 / Page routes — check consent
  if (!hasCookieConsent(request)) {
    // 允许访问登录页，但其他页面需要先同意 Cookie
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login?needConsent=1", request.url));
    }
    return NextResponse.next();
  }

  // 页面路由 — 重定向到登录 / Page routes — redirect to login
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};