import { NextResponse } from "next/server";
import { globalKnowledgeGraph } from "@/lib/kg-store";
import { generateGraphSummary } from "@/lib/knowledge-graph";

export async function GET() {
  const entities = Array.from(globalKnowledgeGraph.entities.values()).map((e) => ({
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

  const relations = globalKnowledgeGraph.relations.map((r) => ({
    id: r.id,
    from: r.from,
    to: r.to,
    type: r.type,
    weight: r.weight,
    confidence: r.confidence,
    context: r.context,
  }));

  const summary = entities.length > 0 ? generateGraphSummary(globalKnowledgeGraph) : "";

  return NextResponse.json({
    stats: {
      totalEntities: globalKnowledgeGraph.stats.totalEntities,
      totalRelations: globalKnowledgeGraph.stats.totalRelations,
      avgConfidence: globalKnowledgeGraph.stats.avgConfidence,
      lastUpdated: globalKnowledgeGraph.stats.lastUpdated,
      sessionCount: globalKnowledgeGraph.stats.sessionCount,
    },
    entities,
    relations,
    summary,
  });
}