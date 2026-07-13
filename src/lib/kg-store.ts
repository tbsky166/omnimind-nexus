// 共享知识图谱存储 — 跨 API 路由访问 / Shared knowledge graph store — cross-API-route access
import { createKnowledgeGraph, type KnowledgeGraph } from "@/lib/knowledge-graph";

export const globalKnowledgeGraph: KnowledgeGraph = createKnowledgeGraph();
export const lastForgettingCurve = { value: Date.now() };