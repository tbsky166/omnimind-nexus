import { NextRequest, NextResponse } from "next/server";

// ── 协作报告导出 / Collaboration report export ──
// POST { messages, sessionId, title } → Markdown 文件下载
export async function POST(req: NextRequest) {
  try {
    const { messages, title } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const reportTitle = title || messages.find((m: { isUser?: boolean }) => m.isUser)?.content?.slice(0, 50) || "协作报告";
    const date = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

    // 统计参与 Agent / Collect participating agents
    const speakers = new Set<string>();
    const toolCalls: Array<{ name: string; action: string }> = [];
    for (const msg of messages) {
      if (msg.speaker && !msg.isUser && !msg.isSystem) speakers.add(msg.speaker);
      if (msg.toolName) toolCalls.push({ name: msg.toolName, action: msg.toolAction || "" });
    }

    // 构建 Markdown / Build Markdown
    const md = buildMarkdown(reportTitle, date, messages, Array.from(speakers), toolCalls);

    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${Date.now()}.md"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function buildMarkdown(
  title: string,
  date: string,
  messages: Array<Record<string, unknown>>,
  speakers: string[],
  toolCalls: Array<{ name: string; action: string }>,
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`> 导出时间：${date}`);
  lines.push(`> 参与 Agent：${speakers.join("、") || "—"}`);
  lines.push(`> 消息总数：${messages.length}`);
  lines.push("");

  // 工具调用摘要 / Tool call summary
  if (toolCalls.length > 0) {
    lines.push("## 工具调用");
    lines.push("");
    const toolCounts: Record<string, number> = {};
    for (const t of toolCalls) {
      toolCounts[t.name] = (toolCounts[t.name] || 0) + 1;
    }
    for (const [name, count] of Object.entries(toolCounts)) {
      lines.push(`- **${name}**: ${count} 次`);
    }
    lines.push("");
  }

  // 完整对话 / Full conversation
  lines.push("## 协作过程");
  lines.push("");

  for (const msg of messages) {
    const speaker = (msg.speaker as string) || "Unknown";
    const emoji = (msg.emoji as string) || "";
    const content = (msg.content as string) || "";
    const isUser = msg.isUser as boolean;
    const isSystem = msg.isSystem as boolean;
    const layer = (msg.a2aLayer as string) || "";
    const fileUrl = (msg.fileUrl as string) || "";
    const downloadName = (msg.downloadName as string) || "";

    const prefix = isUser ? "👤" : emoji;
    const layerTag = layer ? ` \`${layer}\`` : "";
    const systemTag = isSystem ? " `[系统]`" : "";

    lines.push(`### ${prefix} ${speaker}${layerTag}${systemTag}`);
    lines.push("");
    lines.push(content);
    lines.push("");

    if (fileUrl && downloadName) {
      lines.push(`> 📎 文件：[${downloadName}](${fileUrl})`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("*由 OmniMind Nexus 生成*");

  return lines.join("\n");
}
