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