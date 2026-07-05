// ═══════════════════════════════════════════════════════════════════════
// 知识图谱 — 语义记忆 + 关系推理 + 跨会话持久化
// Knowledge Graph — semantic memory + relational reasoning + cross-session persistence
// ═══════════════════════════════════════════════════════════════════════

// ── 核心概念 / Core Concepts ──
// 实体（Entity）：知识图谱中的节点，代表一个概念、对象或抽象
// 关系（Relation）：实体之间的有向边，表示语义关联
// 上下文（Context）：实体所在的会话/任务上下文
// 置信度（Confidence）：知识的可信度，随验证次数增减
// 遗忘曲线（Forgetting Curve）：长期未访问的知识会衰减

/** 知识实体 / Knowledge entity */
export interface Entity {
  id: string;              // 唯一标识
  name: string;            // 名称
  type: string;            // 类型：concept | person | tool | file | decision | error | pattern
  description: string;     // 描述
  embeddings: number[];    // 向量嵌入（语义表示）
  confidence: number;      // 置信度：0.0 ~ 1.0
  createdAt: number;       // 创建时间
  lastAccessed: number;    // 最后访问时间
  accessCount: number;     // 访问次数
  tags: string[];          // 标签
  source: string;          // 来源：session_id | agent_name | user
  metadata: Record<string, unknown>; // 额外元数据
  decayed: boolean;        // 是否已衰减到低于阈值
}

/** 知识关系 / Knowledge relation */
export interface Relation {
  id: string;              // 唯一标识
  from: string;            // 源实体 ID
  to: string;              // 目标实体 ID
  type: string;            // 关系类型：depends_on | produces | contradicts | supports | extends | replaces | relates_to | caused_by | prevents | example_of
  weight: number;          // 关系权重：-1.0（矛盾）~ 1.0（强支持）
  confidence: number;      // 置信度：0.0 ~ 1.0
  createdAt: number;       // 创建时间
  context: string;         // 上下文（会话 ID）
  evidence: string;        // 证据（为什么建立此关系）
}

/** 知识图谱 / Knowledge graph */
export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relations: Relation[];
  stats: {
    totalEntities: number;
    totalRelations: number;
    avgConfidence: number;
    lastUpdated: number;
    sessionCount: number;
  };
}

/** 图谱查询 / Graph query */
export interface GraphQuery {
  startEntity?: string;    // 起始实体 ID
  relationType?: string;   // 关系类型过滤
  maxDepth: number;        // 最大遍历深度
  minConfidence: number;   // 最小置信度
  minWeight: number;       // 最小关系权重
  limit: number;           // 返回结果数上限
}

/** 查询结果 / Query result */
export interface GraphQueryResult {
  entities: Entity[];
  relations: Relation[];
  path: string[];          // 遍历路径（实体 ID 列表）
  relevance: number;       // 相关性得分
}

// ── 图谱操作 / Graph Operations ──

/** 创建知识图谱 / Create knowledge graph */
export function createKnowledgeGraph(): KnowledgeGraph {
  return {
    entities: new Map(),
    relations: [],
    stats: {
      totalEntities: 0,
      totalRelations: 0,
      avgConfidence: 0,
      lastUpdated: Date.now(),
      sessionCount: 0,
    },
  };
}

/** 添加实体 / Add entity */
export function addEntity(
  graph: KnowledgeGraph,
  entity: Omit<Entity, "id" | "createdAt" | "lastAccessed" | "accessCount" | "decayed">,
): Entity {
  const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newEntity: Entity = {
    ...entity,
    id,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    accessCount: 0,
    decayed: false,
  };
  graph.entities.set(id, newEntity);
  graph.stats.totalEntities++;
  graph.stats.lastUpdated = Date.now();
  return newEntity;
}

/** 添加关系 / Add relation */
export function addRelation(
  graph: KnowledgeGraph,
  relation: Omit<Relation, "id" | "createdAt">,
): Relation {
  const id = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newRelation: Relation = { ...relation, id, createdAt: Date.now() };
  graph.relations.push(newRelation);
  graph.stats.totalRelations++;
  graph.stats.lastUpdated = Date.now();
  return newRelation;
}

/** 获取实体 / Get entity */
export function getEntity(graph: KnowledgeGraph, id: string): Entity | undefined {
  const entity = graph.entities.get(id);
  if (entity) {
    entity.lastAccessed = Date.now();
    entity.accessCount++;
  }
  return entity;
}

/** 更新实体置信度 / Update entity confidence */
export function updateConfidence(
  graph: KnowledgeGraph,
  entityId: string,
  delta: number,
  reason: string,
): void {
  const entity = graph.entities.get(entityId);
  if (entity) {
    entity.confidence = Math.max(0, Math.min(1, entity.confidence + delta));
    entity.lastAccessed = Date.now();
    // 记录变更 / Record change
    if (!entity.metadata.confidenceHistory) {
      entity.metadata.confidenceHistory = [];
    }
    (entity.metadata.confidenceHistory as Array<{ delta: number; reason: string; time: number }>).push({
      delta, reason, time: Date.now(),
    });
  }
}

/** 遗忘衰减 / Forgetting decay */
export function applyForgettingCurve(graph: KnowledgeGraph, halfLifeMs = 7 * 24 * 3600 * 1000): void {
  const now = Date.now();
  for (const entity of graph.entities.values()) {
    const elapsed = now - entity.lastAccessed;
    const decay = Math.exp(-Math.log(2) * elapsed / halfLifeMs);
    entity.confidence *= decay;
    if (entity.confidence < 0.1) {
      entity.decayed = true;
    }
  }
  // 移除已衰减实体 / Remove decayed entities
  for (const [id, entity] of graph.entities) {
    if (entity.decayed && entity.confidence < 0.05) {
      graph.entities.delete(id);
      graph.relations = graph.relations.filter((r) => r.from !== id && r.to !== id);
      graph.stats.totalEntities--;
    }
  }
  graph.stats.avgConfidence = calculateAvgConfidence(graph);
}

/** 计算平均置信度 / Calculate average confidence */
function calculateAvgConfidence(graph: KnowledgeGraph): number {
  if (graph.entities.size === 0) return 0;
  let sum = 0;
  for (const entity of graph.entities.values()) {
    sum += entity.confidence;
  }
  return sum / graph.entities.size;
}

// ── 图谱查询引擎 / Graph Query Engine ──

/** BFS 遍历图谱 / BFS traverse graph */
export function queryGraph(graph: KnowledgeGraph, query: GraphQuery): GraphQueryResult[] {
  const results: GraphQueryResult[] = [];
  const visited = new Set<string>();

  // 起始节点 / Start nodes
  let frontier: string[] = [];
  if (query.startEntity) {
    frontier = [query.startEntity];
  } else {
    // 从所有实体开始 / Start from all entities
    frontier = Array.from(graph.entities.keys());
  }

  const pathMap = new Map<string, string[]>(); // entityId → path
  for (const id of frontier) pathMap.set(id, [id]);

  for (let depth = 0; depth < query.maxDepth && frontier.length > 0; depth++) {
    const nextFrontier: string[] = [];

    for (const entityId of frontier) {
      if (visited.has(entityId)) continue;
      visited.add(entityId);

      const entity = graph.entities.get(entityId);
      if (!entity || entity.confidence < query.minConfidence) continue;

      const path = pathMap.get(entityId) || [entityId];

      // 查找相关关系 / Find relevant relations
      const relatedRelations = graph.relations.filter(
        (r) =>
          (r.from === entityId || r.to === entityId) &&
          (!query.relationType || r.type === query.relationType) &&
          r.confidence >= query.minConfidence &&
          Math.abs(r.weight) >= query.minWeight,
      );

      for (const rel of relatedRelations) {
        const neighborId = rel.from === entityId ? rel.to : rel.from;
        if (visited.has(neighborId)) continue;

        const neighbor = graph.entities.get(neighborId);
        if (!neighbor || neighbor.confidence < query.minConfidence) continue;

        const newPath = [...path, neighborId];
        pathMap.set(neighborId, newPath);

        // 相关性得分 / Relevance score
        const relevance = entity.confidence * neighbor.confidence * Math.abs(rel.weight);

        results.push({
          entities: [entity, neighbor],
          relations: [rel],
          path: newPath,
          relevance,
        });

        nextFrontier.push(neighborId);
      }
    }

    frontier = nextFrontier;
  }

  // 按相关性排序 / Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, query.limit);
}

/** 查找两个实体之间的最短路径 / Find shortest path between two entities */
export function findPath(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string,
  maxDepth: number,
): GraphQueryResult | null {
  const results = queryGraph(graph, {
    startEntity: fromId,
    maxDepth,
    minConfidence: 0,
    minWeight: 0,
    limit: 100,
  });

  return results.find((r) => r.path.includes(toId)) || null;
}

/** 查找矛盾关系 / Find contradictory relations */
export function findContradictions(graph: KnowledgeGraph): Array<{ entity1: Entity; entity2: Entity; relation: Relation }> {
  const contradictions: Array<{ entity1: Entity; entity2: Entity; relation: Relation }> = [];
  for (const rel of graph.relations) {
    if (rel.type === "contradicts" || rel.weight < -0.5) {
      const e1 = graph.entities.get(rel.from);
      const e2 = graph.entities.get(rel.to);
      if (e1 && e2) {
        contradictions.push({ entity1: e1, entity2: e2, relation: rel });
      }
    }
  }
  return contradictions;
}

// ── 图谱摘要 / Graph Summary ──

/** 生成图谱摘要 / Generate graph summary */
export function generateGraphSummary(graph: KnowledgeGraph): string {
  const entities = Array.from(graph.entities.values());
  const typeDistribution: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const sources: Record<string, number> = {};

  for (const entity of entities) {
    typeDistribution[entity.type] = (typeDistribution[entity.type] || 0) + 1;
    for (const tag of entity.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    sources[entity.source] = (sources[entity.source] || 0) + 1;
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const relationTypes = graph.relations.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `
## 知识图谱摘要
- 总实体: ${graph.stats.totalEntities}
- 总关系: ${graph.stats.totalRelations}
- 平均置信度: ${graph.stats.avgConfidence.toFixed(2)}
- 会话数: ${graph.stats.sessionCount}

### 实体类型分布
${Object.entries(typeDistribution).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

### 热门标签
${topTags.map(([k, v]) => `- ${k}: ${v}`).join("\n")}

### 关系类型分布
${Object.entries(relationTypes).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

### 知识来源
${Object.entries(sources).map(([k, v]) => `- ${k}: ${v}`).join("\n")}
`.trim();
}