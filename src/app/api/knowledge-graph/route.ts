import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeGraph } from "@/lib/kg-store";
import { generateGraphSummary } from "@/lib/knowledge-graph";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const kg = getKnowledgeGraph(userId);

  const entities = Array.from(kg.entities.values()).map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    confidence: e.confidence,
    accessCount: e.accessCount,
    tags: e.tags,
    createdAt: e.createdAt,
    lastAccessed: e.lastAccessed,
    decayed: e.decayed,
  }));

  const relations = kg.relations.map((r) => ({
    id: r.id,
    from: r.from,
    to: r.to,
    type: r.type,
    weight: r.weight,
    confidence: r.confidence,
    context: r.context,
  }));

  const summary = entities.length > 0 ? generateGraphSummary(kg) : "";

  return NextResponse.json({
    stats: {
      totalEntities: kg.stats.totalEntities,
      totalRelations: kg.stats.totalRelations,
      avgConfidence: kg.stats.avgConfidence,
      lastUpdated: kg.stats.lastUpdated,
      sessionCount: kg.stats.sessionCount,
    },
    entities,
    relations,
    summary,
  });
}