import { NextRequest, NextResponse } from "next/server";
import { generateDocxBuffer, generateXlsxBuffer } from "@/lib/document";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { format, content, title } = await req.json();

    if (!content || !format) {
      return NextResponse.json({ error: "format and content are required" }, { status: 400 });
    }

    const docTitle = title || "OmniMind Nexus Output";

    if (format === "docx") {
      const buffer = await generateDocxBuffer(content, docTitle);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(docTitle)}.docx"`,
        },
      });
    }

    if (format === "xlsx") {
      const buffer = generateXlsxBuffer(content, docTitle);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(docTitle)}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format. Supported: docx, xlsx" }, { status: 400 });
  } catch (e) {
    console.error("Generate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}