// ═══════════════════════════════════════════════════════════════
// 文件下载 API — 每用户独立工作区 / Per-user isolated file download API
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const TEMP_DIR = path.join(process.cwd(), "public", "temp");
const WORKSPACE_BASE = path.join(process.cwd(), "public", "workspace");

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const safeName = name.replace(/[\\/:*?"<>|]/g, "_").replace(/^\.+/, "");

  const isWorkspace = req.nextUrl.searchParams.get("ws") === "1";
  const userId = getUserId(req);

  if (isWorkspace && !userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const dir = isWorkspace
    ? path.join(WORKSPACE_BASE, userId!)
    : TEMP_DIR;
  const filePath = path.join(dir, safeName);

  if (!fs.existsSync(filePath)) {
    return new Response("404 Not Found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = safeName.split(".").pop()?.toLowerCase();

  const contentType =
    ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
    ext === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
    "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}