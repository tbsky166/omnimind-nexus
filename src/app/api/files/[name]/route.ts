import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

const TEMP_DIR = path.join(process.cwd(), "public", "temp");
const WORKSPACE_DIR = path.join(process.cwd(), "public", "workspace");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Security: prevent path traversal
  const safeName = name.replace(/[\\/:*?"<>|]/g, "_").replace(/^\.+/, "");

  // Check both temp and workspace directories
  const dir = req.nextUrl.searchParams.get("ws") === "1" ? WORKSPACE_DIR : TEMP_DIR;
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

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}