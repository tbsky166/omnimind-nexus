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

// ---- Temp file directory (public/temp/) ----
const TEMP_DIR = path.join(process.cwd(), "public", "temp");
const WORKSPACE_DIR = path.join(process.cwd(), "public", "workspace");

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function ensureWorkspaceDir() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
}

// ---- Workspace file operations ----
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
      fileUrl: `/workspace/${safeName}`,
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

export function listWorkspaceFiles(): string[] {
  ensureWorkspaceDir();
  try {
    return fs.readdirSync(WORKSPACE_DIR).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

// ---- DOCX Generator ----
export async function generateDocxBuffer(content: string, title: string): Promise<Buffer> {
  const paragraphs = content.split("\n").filter(Boolean);

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
    if (line.startsWith("```")) {
      return new Paragraph({
        children: [new TextRun({ text: line.replace(/```\w*/, "// "), font: "Courier New", size: 18, italics: true })],
        spacing: { before: 80, after: 80 },
      });
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

// ---- XLSX Generator ----
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

// ---- Tool executor ----
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

  // Public URL path
  const fileUrl = `/temp/${fileName}`;

  return {
    success: true,
    format: ext,
    fileName,
    fileUrl,
    message: `文档已生成：${fileName}（${(buffer.length / 1024).toFixed(1)} KB）`,
  };
}