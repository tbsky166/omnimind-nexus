// 每用户知识图谱存储 — 跨 API 路由访问 / Per-user knowledge graph store — cross-API-route access
import { createKnowledgeGraph, type KnowledgeGraph } from "@/lib/knowledge-graph";

const userGraphs = new Map<string, KnowledgeGraph>();

export function getKnowledgeGraph(userId: string): KnowledgeGraph {
  if (!userGraphs.has(userId)) {
    userGraphs.set(userId, createKnowledgeGraph());
  }
  return userGraphs.get(userId)!;
}

// 兼容旧引用 / Backward compat
export const globalKnowledgeGraph = getKnowledgeGraph("__global__");
export const lastForgettingCurve = { value: Date.now() };