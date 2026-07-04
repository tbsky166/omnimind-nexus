import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse DOCX
    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({
        type: "docx",
        fileName: file.name,
        content: result.value,
        warnings: result.messages,
      });
    }

    // Parse XLSX / XLS
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets: Record<string, string[][]> = {};

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
        sheets[sheetName] = data;
      }

      // Convert to markdown table format for easy reading
      let markdown = "";
      for (const [name, rows] of Object.entries(sheets)) {
        markdown += `## ${name}\n\n`;
        if (rows.length === 0) {
          markdown += "(空表)\n\n";
          continue;
        }
        // Build markdown table
        const maxCols = Math.max(...rows.map((r) => r.length));
        markdown += "| " + Array.from({ length: maxCols }, (_, i) => rows[0]?.[i] || `列${i + 1}`).join(" | ") + " |\n";
        markdown += "| " + Array.from({ length: maxCols }, () => "---").join(" | ") + " |\n";
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          markdown += "| " + Array.from({ length: maxCols }, (_, i) => row[i] || "").join(" | ") + " |\n";
        }
        markdown += "\n";
      }

      return NextResponse.json({
        type: "xlsx",
        fileName: file.name,
        content: markdown,
        sheetNames: workbook.SheetNames,
        rawData: sheets,
      });
    }

    return NextResponse.json({ error: "Unsupported file type. Supported: .docx, .doc, .xlsx, .xls" }, { status: 400 });
  } catch (e) {
    console.error("Upload parse error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parse failed" },
      { status: 500 }
    );
  }
}