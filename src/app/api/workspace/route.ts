import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// ── 工作区文件列表 / Workspace file listing ──
export async function GET() {
  try {
    const workspaceDir = path.join(process.cwd(), "public", "workspace");
    const tempDir = path.join(process.cwd(), "public", "temp");

    const [workspaceFiles, tempFiles] = await Promise.all([
      listFiles(workspaceDir, "workspace"),
      listFiles(tempDir, "temp"),
    ]);

    return NextResponse.json({ workspace: workspaceFiles, temp: tempFiles });
  } catch (e) {
    return NextResponse.json({ workspace: [], temp: [] });
  }
}

async function listFiles(dir: string, source: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const fullPath = path.join(dir, e.name);
          const stat = await fs.stat(fullPath);
          return {
            name: e.name,
            source,
            size: stat.size,
            sizeText: formatSize(stat.size),
            modified: stat.mtime.toISOString(),
            downloadUrl: source === "workspace" ? `/api/files/${e.name}?ws=1` : `/api/files/${e.name}`,
          };
        })
    );
    return files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  } catch {
    return [];
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
