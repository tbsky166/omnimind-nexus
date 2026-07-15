// ═══════════════════════════════════════════════════════════════════════
// 联网搜索工具 — Tavily Search API（专为 AI Agent 设计）
// Web Search Tool — Tavily Search API (designed for AI Agents)
// 免费额度：1000 次/月  |  注册：https://tavily.com
// ═══════════════════════════════════════════════════════════════════════

/** 单条搜索结果 / Single search result */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

/** 搜索响应 / Search response */
export interface SearchResponse {
  query: string;
  answer: string;
  results: SearchResult[];
  searchTime: number;
}

/** Tavily API 原始响应类型 */
interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
  response_time?: number;
}

// ── Tavily Search API 调用 ──
async function tavilySearch(query: string, apiKey: string): Promise<TavilyResponse> {
  let res: Response;
  try {
    res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new Error(
      `Tavily 搜索 API 连接失败：${e instanceof Error ? e.message : "网络错误"}。请检查网络连接，或确认 Tavily API 服务是否正常。`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const err = JSON.parse(text);
      msg = err.detail?.error || err.message || err.error || text;
    } catch {}
    throw new Error(`Tavily API error (${res.status}): ${msg}`);
  }

  return res.json();
}

// ── 主搜索函数 / Main search function ──
export async function webSearch(query: string, apiKey?: string): Promise<SearchResponse> {
  const startTime = Date.now();

  if (!apiKey) {
    throw new Error("未配置 Tavily API Key，请在设置页面填写");
  }

  const data = await tavilySearch(query, apiKey);

  const results: SearchResult[] = (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
    score: r.score,
  }));

  const searchTime = Date.now() - startTime;

  return {
    query: data.query,
    answer: data.answer || "",
    results,
    searchTime,
  };
}

// ── 格式化搜索结果给 LLM / Format search results for LLM ──
export function formatSearchResults(response: SearchResponse): string {
  const parts: string[] = [];

  if (response.answer) {
    parts.push(`📌 **AI 摘要**：${response.answer}`);
    parts.push("");
  }

  if (response.results.length > 0) {
    parts.push("📋 **搜索结果**：");
    for (let i = 0; i < response.results.length; i++) {
      const r = response.results[i];
      parts.push(`${i + 1}. [${r.title}](${r.url})`);
      parts.push(`   ${r.snippet}`);
      parts.push("");
    }
  }

  parts.push(`⏱ 搜索耗时：${response.searchTime}ms | 引擎：Tavily`);

  return parts.join("\n");
}