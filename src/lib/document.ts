import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// 文件操作与文档生成 — 提供工作区文件读写、DOCX/XLSX 文档生成能力 / File operations and document generation — provides workspace file read/write and DOCX/XLSX document generation

// ---- 临时文件目录 (public/temp/) / Temp file directory (public/temp/) ----
// 临时文件目录 — 存放生成的 DOCX/XLSX 等文档 / Temp file directory — stores generated DOCX/XLSX documents
const TEMP_DIR = path.join(process.cwd(), "public", "temp");
// 工作区目录 — 存放用户文件读写操作的文件 / Workspace directory — stores files from user file read/write operations
const WORKSPACE_DIR = path.join(process.cwd(), "public", "workspace");

// 确保临时文件目录存在，不存在则递归创建 / Ensure temp directory exists, create recursively if missing
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

// 确保工作区目录存在，不存在则递归创建 / Ensure workspace directory exists, create recursively if missing
function ensureWorkspaceDir() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
}

// ---- 工作区文件操作 / Workspace file operations ----
// 工作区文件写入 — 支持 create（创建/覆盖）、append（追加）和 edit（覆盖）三种模式 / Workspace file write — supports create (overwrite), append, and edit (overwrite) modes
export async function executeFileWrite(args: Record<string, unknown>): Promise<{
  success: boolean;
  fileName: string;
  fileUrl: string;
  action: string;
  message: string;
}> {
  const filePath = (args.path as string) || "";
  const content = (args.content as string) || "";
  const action = (args.action as string) || "create"; // create | append | edit

  if (!filePath) {
    return { success: false, fileName: "", fileUrl: "", action, message: "Missing file path" };
  }

  // Security: only allow files inside workspace
  const safeName = filePath.replace(/[\\/:*?"<>|]/g, "_").replace(/^\.+/, "");
  ensureWorkspaceDir();
  const fullPath = path.join(WORKSPACE_DIR, safeName);

  try {
    if (action === "append" && fs.existsSync(fullPath)) {
      const existing = fs.readFileSync(fullPath, "utf-8");
      fs.writeFileSync(fullPath, existing + "\n" + content);
    } else {
      // create or edit (overwrite)
      fs.writeFileSync(fullPath, content);
    }

    const stat = fs.statSync(fullPath);
    return {
      success: true,
      fileName: safeName,
      fileUrl: `/api/files/${safeName}?ws=1`,
      action,
      message: `${action === "append" ? "追加" : "写入"}文件：${safeName}（${(stat.size / 1024).toFixed(1)} KB）`,
    };
  } catch (e) {
    return {
      success: false,
      fileName: safeName,
      fileUrl: "",
      action,
      message: `文件操作失败: ${e instanceof Error ? e.message : "Unknown"}`,
    };
  }
}

// 工作区文件读取 — 读取工作区中的文件内容 / Workspace file read — reads the content of a file in the workspace
export async function executeFileRead(filePath: string): Promise<{
  success: boolean;
  content: string;
  message: string;
}> {
  const safeName = filePath.replace(/[\\/:*?"<>|]/g, "_").replace(/^\.+/, "");
  const fullPath = path.join(WORKSPACE_DIR, safeName);

  if (!fs.existsSync(fullPath)) {
    return { success: false, content: "", message: `文件不存在: ${safeName}` };
  }

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return { success: true, content, message: `读取文件：${safeName}（${content.length} 字符）` };
  } catch (e) {
    return { success: false, content: "", message: `读取失败: ${e instanceof Error ? e.message : "Unknown"}` };
  }
}

// 列出工作区中的所有文件（排除隐藏文件） / List all files in the workspace (excluding hidden files)
export function listWorkspaceFiles(): string[] {
  ensureWorkspaceDir();
  try {
    return fs.readdirSync(WORKSPACE_DIR).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

// ---- 代码库文件操作 / Codebase file operations ----
// 允许 Agent 读取整个项目代码库的文件（排除敏感文件/目录） / Allow agents to read any file in the project codebase (excluding sensitive files/dirs)

// 禁止访问的目录和文件 / Forbidden directories and files
const CODEBASE_BLACKLIST = [
  /^node_modules\//,
  /^\.git\//,
  /^\.next\//,
  /^\.env/,
  /^\.env\./,
  /\.env\.local$/,
  /\.env\.production$/,
  /\.env\.development$/,
  /^\.DS_Store$/,
  /^\.gitignore$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^bun\.lockb$/,
  /^public\/temp\//,
  /^public\/workspace\//,
  /\.log$/,
  /^coverage\//,
  /^\.vscode\//,
  /^\.idea\//,
  /^\.turbo\//,
  /\.map$/,
  /\.tsbuildinfo$/,
];

function isPathBlacklisted(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return CODEBASE_BLACKLIST.some((pattern) => pattern.test(normalized));
}

/** 代码库文件读取 — 读取项目中的任意源文件（排除敏感文件） / Codebase file read — read any source file in the project (excluding sensitive files) */
export async function executeCodebaseRead(
  filePath: string,
  cwd: string,
): Promise<{ success: boolean; content: string; filePath: string; size: number; message: string }> {
  // 清理路径，防止路径穿越 / Clean path to prevent path traversal
  const safePath = filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");

  if (isPathBlacklisted(safePath)) {
    return {
      success: false,
      content: "",
      filePath: safePath,
      size: 0,
      message: `拒绝访问：${safePath} 属于受保护文件/目录，不允许读取。`,
    };
  }

  const fullPath = path.join(cwd, safePath);

  // 确保路径在项目目录内 / Ensure path is within project directory
  if (!fullPath.startsWith(cwd)) {
    return {
      success: false,
      content: "",
      filePath: safePath,
      size: 0,
      message: `拒绝访问：路径越界，只允许读取项目目录内的文件。`,
    };
  }

  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      content: "",
      filePath: safePath,
      size: 0,
      message: `文件不存在：${safePath}`,
    };
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return {
      success: false,
      content: "",
      filePath: safePath,
      size: 0,
      message: `${safePath} 是一个目录，请使用 codebase_list 查看目录内容。`,
    };
  }

  // 限制单文件大小 500KB / Limit single file size to 500KB
  const MAX_SIZE = 500 * 1024;
  if (stat.size > MAX_SIZE) {
    return {
      success: false,
      content: "",
      filePath: safePath,
      size: stat.size,
      message: `文件过大：${safePath}（${(stat.size / 1024).toFixed(1)} KB），超过 ${(MAX_SIZE / 1024).toFixed(0)} KB 限制。`,
    };
  }

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return {
      success: true,
      content,
      filePath: safePath,
      size: stat.size,
      message: `读取成功：${safePath}（${(stat.size / 1024).toFixed(1)} KB，${content.length} 字符）`,
    };
  } catch (e) {
    return {
      success: false,
      content: "",
      filePath: safePath,
      size: 0,
      message: `读取失败: ${e instanceof Error ? e.message : "Unknown"}`,
    };
  }
}

/** 代码库目录列表 — 列出项目中的文件和子目录 / Codebase directory listing — list files and subdirectories in the project */
export function executeCodebaseList(
  dirPath: string,
  cwd: string,
): { success: boolean; entries: string[]; dirPath: string; message: string } {
  const safePath = dirPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/").replace(/\/$/, "");

  if (safePath && isPathBlacklisted(safePath)) {
    return {
      success: false,
      entries: [],
      dirPath: safePath,
      message: `拒绝访问：${safePath} 属于受保护目录，不允许列出。`,
    };
  }

  const fullPath = safePath ? path.join(cwd, safePath) : cwd;

  if (!fullPath.startsWith(cwd)) {
    return {
      success: false,
      entries: [],
      dirPath: safePath,
      message: "拒绝访问：路径越界。",
    };
  }

  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      entries: [],
      dirPath: safePath,
      message: `目录不存在：${safePath || "/"}`,
    };
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    return {
      success: false,
      entries: [],
      dirPath: safePath,
      message: `${safePath} 不是目录，请使用 codebase_read 读取文件内容。`,
    };
  }

  try {
    const allEntries = fs.readdirSync(fullPath, { withFileTypes: true });
    const filtered = allEntries
      .filter((entry) => {
        const entryPath = safePath ? `${safePath}/${entry.name}` : entry.name;
        return !isPathBlacklisted(entryPath) && !entry.name.startsWith(".");
      })
      .map((entry) => {
        const suffix = entry.isDirectory() ? "/" : "";
        return `${entry.name}${suffix}`;
      })
      .sort((a, b) => {
        const aIsDir = a.endsWith("/");
        const bIsDir = b.endsWith("/");
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });

    return {
      success: true,
      entries: filtered,
      dirPath: safePath || "/",
      message: `${safePath || "项目根目录"}：${filtered.length} 个条目`,
    };
  } catch (e) {
    return {
      success: false,
      entries: [],
      dirPath: safePath,
      message: `列出失败: ${e instanceof Error ? e.message : "Unknown"}`,
    };
  }
}

// ---- DOCX 生成器 / DOCX Generator ----
// 将 Markdown 风格的内容转换为 DOCX 格式的 Buffer，支持标题、代码块、粗体等 / Convert Markdown-style content to DOCX format Buffer, supporting headings, code blocks, bold text, etc.
export async function generateDocxBuffer(content: string, title: string): Promise<Buffer> {
  const paragraphs = content.split("\n");

  const children = paragraphs.map((line) => {
    if (line.startsWith("# ")) {
      return new Paragraph({
        text: line.replace(/^# /, ""),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      });
    }
    if (line.startsWith("## ")) {
      return new Paragraph({
        text: line.replace(/^## /, ""),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      });
    }
    if (line.startsWith("### ")) {
      return new Paragraph({
        text: line.replace(/^### /, ""),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      });
    }
    if (line.trim().startsWith("```")) {
      return new Paragraph({
        children: [new TextRun({ text: line.replace(/```\w*/, ""), font: "Courier New", size: 18, color: "888888" })],
        spacing: { before: 40, after: 40 },
      });
    }
    if (!line.trim()) {
      return new Paragraph({ spacing: { before: 60, after: 60 } });
    }
    if (line.includes("**")) {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return new Paragraph({
        children: parts.map((part) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return new TextRun({ text: part.slice(2, -2), bold: true, size: 22 });
          }
          return new TextRun({ text: part, size: 22 });
        }),
        spacing: { before: 60, after: 60 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: line, size: 22 })],
      spacing: { before: 60, after: 60 },
    });
  });

  const doc = new Document({
    title,
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "Generated by OmniMind Nexus A2A Agent Team", size: 20, color: "888888", italics: true }),
          ],
        }),
        ...children,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

// ---- XLSX 生成器 / XLSX Generator ----
// 将 Markdown 风格的内容转换为 XLSX 格式的 Buffer，生成"内容摘要"和"详细内容"两个工作表 / Convert Markdown-style content to XLSX format Buffer, generating two sheets: "内容摘要" (summary) and "详细内容" (details)
export function generateXlsxBuffer(content: string, title: string): Buffer {
  const wb = XLSX.utils.book_new();
  const sections = content.split(/(?=^#{1,3} )/m).filter(Boolean);

  const summaryData = [["序号", "章节", "内容摘要"]];
  sections.forEach((section, i) => {
    const lines = section.trim().split("\n");
    const sectionTitle = lines[0].replace(/^#+\s*/, "");
    const body = lines.slice(1).join(" ").trim().slice(0, 200);
    summaryData.push([String(i + 1), sectionTitle, body]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "内容摘要");

  const detailData = [["章节", "完整内容"]];
  sections.forEach((section) => {
    const lines = section.trim().split("\n");
    const sectionTitle = lines[0].replace(/^#+\s*/, "");
    const body = lines.slice(1).join("\n").trim();
    detailData.push([sectionTitle, body]);
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet["!cols"] = [{ wch: 30 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, detailSheet, "详细内容");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ---- 工具执行器 / Tool executor ----
// 统一的文档生成入口 — 根据 format 参数调用对应的生成器，将结果保存到临时目录并返回下载 URL / Unified document generation entry — dispatches to the appropriate generator based on format, saves to temp directory and returns a download URL
export async function executeGenerateDocument(args: Record<string, unknown>): Promise<{
  success: boolean;
  format: string;
  fileName: string;
  fileUrl: string;
  message: string;
}> {
  const format = args.format as string;
  const title = (args.title as string) || "OmniMind Nexus Output";
  const content = args.content as string;

  if (!format || !content) {
    return { success: false, format: "", fileName: "", fileUrl: "", message: "Missing format or content" };
  }

  let buffer: Buffer;
  let ext: string;

  if (format === "docx") {
    buffer = await generateDocxBuffer(content, title);
    ext = "docx";
  } else if (format === "xlsx") {
    buffer = generateXlsxBuffer(content, title);
    ext = "xlsx";
  } else {
    return { success: false, format: "", fileName: "", fileUrl: "", message: `Unsupported format: ${format}` };
  }

  // Save to public/temp/
  ensureTempDir();
  const timestamp = Date.now();
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50);
  const fileName = `${safeTitle}_${timestamp}.${ext}`;
  const filePath = path.join(TEMP_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  // API route for download (works in both dev & production)
  const fileUrl = `/api/files/${fileName}`;

  return {
    success: true,
    format: ext,
    fileName,
    fileUrl,
    message: `文档已生成：${fileName}（${(buffer.length / 1024).toFixed(1)} KB）`,
  };
}