// ═══════════════════════════════════════════════════════════════
// 学习 API — 查询、记录、导出学习记录
// Learnings API — query, record, export learning entries
// ═══════════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  loadLearnings,
  recordLearning,
  queryLearnings,
  generateLearningSummary,
  exportLearningsMarkdown,
  resetLearnings,
  extractTagsFromError,
} from "@/lib/self-improving";

export const runtime = "nodejs";

function getUserId(req: NextRequest): string {
  return req.headers.get("x-user-id") || "anonymous";
}

// GET — 查询学习记录 / Query learnings
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const action = req.nextUrl.searchParams.get("action") || "list";
  const query = req.nextUrl.searchParams.get("q") || "";
  const tags = req.nextUrl.searchParams.get("tags") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

  if (action === "summary") {
    return Response.json({ summary: generateLearningSummary(userId) });
  }

  if (action === "export") {
    const md = exportLearningsMarkdown(userId);
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="learnings-${Date.now()}.md"`,
      },
    });
  }

  if (action === "query" && query) {
    const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const results = queryLearnings(userId, query, tagList, limit);
    return Response.json({ results, count: results.length });
  }

  if (action === "reset") {
    resetLearnings(userId);
    return Response.json({ ok: true, message: "学习记录已重置" });
  }

  // 默认：列出所有学习记录 / Default: list all learnings
  const store = loadLearnings(userId);
  const sorted = [...store.entries].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, limit);
  return Response.json({
    entries: sorted,
    total: store.totalLearnings,
    patterns: store.patterns,
    successRate: store.successRate,
    lastUpdated: store.lastUpdated,
  });
}

// POST — 记录学习 / Record a learning
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  try {
    const body = await req.json();
    const { type, agentName, context, observation, rootCause, solution, tags } = body;

    if (!type || !agentName || !observation) {
      return Response.json({ error: "type, agentName, and observation are required" }, { status: 400 });
    }

    const validTypes = ["error", "success", "pattern", "fix"];
    if (!validTypes.includes(type)) {
      return Response.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const entryTags = tags && Array.isArray(tags) ? tags : extractTagsFromError(observation, context || "");

    const entry = recordLearning(userId, {
      type,
      agentName: agentName || "System",
      context: context || "",
      observation,
      rootCause: rootCause || undefined,
      solution: solution || undefined,
      tags: entryTags,
      confidence: body.confidence || 0.5,
    });

    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}