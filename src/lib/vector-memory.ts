// ═══════════════════════════════════════════════════════════════
// 向量记忆 — 语义搜索替代关键词匹配
// 轻量级 TF-IDF 向量化 + 余弦相似度 + 可选的嵌入模型搜索
// Vector Memory — semantic search replaces keyword matching
// Lightweight TF-IDF vectorization + cosine similarity + optional embedding search
// ═══════════════════════════════════════════════════════════════

import { MemoryEntry } from "./dreams";

// ── 余弦相似度 / Cosine similarity ──
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── 分词（中文 + 英文混合）/ Tokenization (Chinese + English mixed) ──
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  // 英文单词 / English words
  const englishWords = text.toLowerCase().match(/[a-z]+/g) || [];
  tokens.push(...englishWords);
  // 中文双字组合 / Chinese bigrams
  const chinese = text.replace(/[^\\u4e00-\\u9fff]/g, "");
  for (let i = 0; i < chinese.length - 1; i++) {
    tokens.push(chinese.substring(i, i + 2));
  }
  // 单字也加入 / Single chars too
  for (const ch of chinese) {
    tokens.push(ch);
  }
  return tokens.filter((t) => t.length > 0);
}

// ── 构建词汇表 / Build vocabulary ──
function buildVocabulary(texts: string[]): Map<string, number> {
  const vocab = new Map<string, number>();
  for (const text of texts) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      vocab.set(token, (vocab.get(token) || 0) + 1);
    }
  }
  // 只保留出现至少 2 次的词 / Only keep words that appear at least twice
  const filtered = new Map<string, number>();
  let idx = 0;
  for (const [word, count] of vocab) {
    if (count >= 2 && word.length > 1) {
      filtered.set(word, idx++);
    }
  }
  return filtered;
}

// ── TF-IDF 向量化 / TF-IDF vectorization ──
function tfidfVectorize(text: string, vocab: Map<string, number>, docCount: number): number[] {
  const tokens = tokenize(text);
  const vector = new Array(vocab.size).fill(0);

  // TF: term frequency in this document
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  const maxFreq = Math.max(...tf.values(), 1);

  // IDF: inverse document frequency (approximate — we use vocab count as proxy)
  for (const [word, freq] of tf) {
    const idx = vocab.get(word);
    if (idx !== undefined) {
      const tfNorm = freq / maxFreq;
      const idf = Math.log((docCount + 1) / (vocab.get(word) || 1));
      vector[idx] = tfNorm * idf;
    }
  }

  return vector;
}

// ── 语义搜索（TF-IDF）/ Semantic search (TF-IDF) ──
export function semanticSearch(
  query: string,
  memories: MemoryEntry[],
  limit: number = 5
): Array<{ memory: MemoryEntry; score: number }> {
  if (memories.length === 0) return [];

  const texts = memories.map((m) => m.content);
  const vocab = buildVocabulary([query, ...texts]);
  const queryVec = tfidfVectorize(query, vocab, memories.length + 1);

  const results = memories.map((memory) => {
    const memoryVec = tfidfVectorize(memory.content, vocab, memories.length + 1);
    const vectorScore = cosineSimilarity(queryVec, memoryVec);

    // 标签匹配加分 / Tag match bonus
    const tagBonus = memory.tags.some((t) =>
      query.toLowerCase().includes(t.toLowerCase())
    )
      ? 0.15
      : 0;

    // 重要性加权 / Importance weighting
    const importanceWeight = memory.importance / 100;

    const score = vectorScore * 0.6 + tagBonus * 0.2 + importanceWeight * 0.2;
    return { memory, score };
  });

  return results
    .filter((r) => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ── 嵌入模型语义搜索（使用外部 embedding API）/ Embedding-based semantic search (using external embedding API) ──
export async function embeddingSearch(
  query: string,
  memories: MemoryEntry[],
  apiKey: string,
  baseUrl: string,
  model: string = "text-embedding-3-small",
  limit: number = 5
): Promise<Array<{ memory: MemoryEntry; score: number }>> {
  if (memories.length === 0) return [];

  try {
    // 获取查询的 embedding / Get query embedding
    const queryEmbedding = await getEmbedding(query, apiKey, baseUrl, model);

    const results = await Promise.all(
      memories.map(async (memory) => {
        const memoryEmbedding = await getEmbedding(memory.content, apiKey, baseUrl, model);
        const vectorScore = cosineSimilarity(queryEmbedding, memoryEmbedding);

        const tagBonus = memory.tags.some((t) =>
          query.toLowerCase().includes(t.toLowerCase())
        )
          ? 0.1
          : 0;

        const importanceWeight = memory.importance / 100;
        const score = vectorScore * 0.65 + tagBonus * 0.15 + importanceWeight * 0.2;
        return { memory, score };
      })
    );

    return results
      .filter((r) => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    // 嵌入失败时回退到 TF-IDF / Fallback to TF-IDF if embedding fails
    return semanticSearch(query, memories, limit);
  }
}

// ── 获取文本 embedding / Get text embedding ──
async function getEmbedding(
  text: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<number[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/embeddings`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: text, model }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ── 混合搜索：TF-IDF + 嵌入模型（可选）/ Hybrid search: TF-IDF + embedding (optional) ──
export async function hybridSearch(
  query: string,
  memories: MemoryEntry[],
  apiKey?: string,
  baseUrl?: string,
  embeddingModel?: string,
  limit: number = 5
): Promise<Array<{ memory: MemoryEntry; score: number }>> {
  if (apiKey && baseUrl) {
    try {
      return await embeddingSearch(query, memories, apiKey, baseUrl, embeddingModel, limit);
    } catch {
      // 失败回退 / Fallback on failure
    }
  }
  return semanticSearch(query, memories, limit);
}

// ── 聚类相关记忆 / Cluster related memories ──
export function clusterMemories(
  memories: MemoryEntry[],
  numClusters: number = 3
): Array<{ label: string; memories: MemoryEntry[]; score: number }> {
  if (memories.length < 3) return [];

  const vocab = buildVocabulary(memories.map((m) => m.content));
  const vectors = memories.map((m) => tfidfVectorize(m.content, vocab, memories.length));

  // 简单的 K-Means 启发式：选择最不相干的种子 / Simple K-Means heuristic: pick most dissimilar seeds
  const seeds: number[] = [0];
  for (let i = 1; i < Math.min(numClusters, memories.length); i++) {
    let bestIdx = -1;
    let bestMinSim = 1;
    for (let j = 0; j < vectors.length; j++) {
      if (seeds.includes(j)) continue;
      const minSimToSeeds = Math.min(...seeds.map((s) => cosineSimilarity(vectors[j], vectors[s])));
      if (minSimToSeeds < bestMinSim) {
        bestMinSim = minSimToSeeds;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) seeds.push(bestIdx);
  }

  // 分配到最近的种子 / Assign to nearest seed
  const clusters: Array<{ seedIdx: number; memories: MemoryEntry[]; totalSim: number }> = seeds.map((s) => ({
    seedIdx: s,
    memories: [] as MemoryEntry[],
    totalSim: 0,
  }));

  for (let i = 0; i < vectors.length; i++) {
    let bestCluster = 0;
    let bestSim = -1;
    for (let c = 0; c < clusters.length; c++) {
      const sim = cosineSimilarity(vectors[i], vectors[clusters[c].seedIdx]);
      if (sim > bestSim) {
        bestSim = sim;
        bestCluster = c;
      }
    }
    clusters[bestCluster].memories.push(memories[i]);
    clusters[bestCluster].totalSim += bestSim;
  }

  // 生成标签 / Generate labels
  return clusters
    .filter((c) => c.memories.length > 0)
    .map((c) => {
      const allTags = c.memories.flatMap((m) => m.tags);
      const tagCounts = new Map<string, number>();
      for (const tag of allTags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
      const topTags = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([t]) => t);

      return {
        label: topTags.join(" + ") || "混合",
        memories: c.memories,
        score: c.totalSim / c.memories.length,
      };
    });
}

// ── 生成记忆摘要（用于注入系统提示词）/ Generate memory summary (for system prompt injection) ──
export function generateMemoryContext(
  query: string,
  memories: MemoryEntry[],
  limit: number = 3
): string {
  const results = semanticSearch(query, memories, limit);
  if (results.length === 0) return "";

  const parts = results.map(
    (r) =>
      `- [${r.memory.agentName}] ${r.memory.content.substring(0, 120)} (相关度: ${(r.score * 100).toFixed(0)}%)`
  );

  return `## 相关记忆 / Related Memories\n${parts.join("\n")}`;
}