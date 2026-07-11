// ═══════════════════════════════════════════════════════════════════════
// 联网搜索工具 — DuckDuckGo Instant Answer API（免费，无需 API Key）
// Web Search Tool — DuckDuckGo Instant Answer API (free, no API key required)
// ═══════════════════════════════════════════════════════════════════════

/** 单条搜索结果 / Single search result */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** 搜索响应 / Search response */
export interface SearchResponse {
  query: string;
  abstract: string;           // DuckDuckGo 摘要
  abstractSource: string;     // 摘要来源
  answer: string;             // 即时答案（如计算、定义）
  results: SearchResult[];    // 相关结果列表
  relatedTopics: string[];    // 相关主题
  searchTime: number;         // 搜索耗时 ms
}

// ── DuckDuckGo Instant Answer API 调用 / DuckDuckGo Instant Answer API call ──
async function duckduckgoInstantAnswer(query: string): Promise<{
  Abstract: string;
  AbstractText: string;
  AbstractSource: string;
  AbstractURL: string;
  Answer: string;
  AnswerType: string;
  Heading: string;
  RelatedTopics: Array<{ Text: string; FirstURL: string; Result?: string }>;
  Results: Array<{ Text: string; FirstURL: string }>;
}> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "OmniMind-Nexus/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`DuckDuckGo API error: ${res.status}`);
  return res.json();
}

// ── 也尝试从 DuckDuckGo HTML 搜索获取更丰富的结果 / Also try HTML search for richer results ──
async function duckduckgoHTMLSearch(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // 解析搜索结果 / Parse search results
    const results: SearchResult[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      results.push({
        title: match[2].trim(),
        url: match[1].trim(),
        snippet: match[3].trim(),
      });
    }
    return results.slice(0, 8);
  } catch {
    return [];
  }
}

// ── 主搜索函数 / Main search function ──
export async function webSearch(query: string): Promise<SearchResponse> {
  const startTime = Date.now();

  // 并行调用两个 API / Parallel calls to both APIs
  const [instantResult, htmlResults] = await Promise.allSettled([
    duckduckgoInstantAnswer(query),
    duckduckgoHTMLSearch(query),
  ]);

  const instant = instantResult.status === "fulfilled" ? instantResult.value : null;
  const html = htmlResults.status === "fulfilled" ? htmlResults.value : [];

  // 合并结果 / Merge results
  const results: SearchResult[] = [];

  // 从 Instant Answer 提取结果
  if (instant?.Results) {
    for (const r of instant.Results) {
      results.push({
        title: r.Text.split(" - ")[0] || r.Text,
        url: r.FirstURL,
        snippet: r.Text,
      });
    }
  }

  // 从 RelatedTopics 提取
  if (instant?.RelatedTopics) {
    for (const topic of instant.RelatedTopics) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(" - ")[0] || topic.Text,
          url: topic.FirstURL,
          snippet: topic.Result || topic.Text,
        });
      }
    }
  }

  // 合并 HTML 搜索结果
  for (const hr of html) {
    if (!results.some(r => r.url === hr.url)) {
      results.push(hr);
    }
  }

  const searchTime = Date.now() - startTime;

  return {
    query,
    abstract: instant?.AbstractText || instant?.Abstract || "",
    abstractSource: instant?.AbstractSource || "",
    answer: instant?.Answer || "",
    results: results.slice(0, 10),
    relatedTopics: instant?.RelatedTopics
      ?.filter((t: { Text: string }) => t.Text && !t.Text.includes("category"))
      .map((t: { Text: string }) => t.Text.split(" - ")[0])
      .slice(0, 5) || [],
    searchTime,
  };
}

// ── 格式化搜索结果给 LLM / Format search results for LLM ──
export function formatSearchResults(response: SearchResponse): string {
  const parts: string[] = [];

  if (response.answer) {
    parts.push(`📌 即时答案：${response.answer}`);
  }
  if (response.abstract) {
    parts.push(`📖 摘要：${response.abstract}${response.abstractSource ? `（来源：${response.abstractSource}）` : ""}`);
  }
  if (response.relatedTopics.length > 0) {
    parts.push(`🔗 相关主题：${response.relatedTopics.join("、")}`);
  }
  if (response.results.length > 0) {
    parts.push("\n📋 搜索结果：");
    for (let i = 0; i < response.results.length; i++) {
      const r = response.results[i];
      parts.push(`${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`);
    }
  }

  parts.push(`\n⏱ 搜索耗时：${response.searchTime}ms | 引擎：DuckDuckGo`);

  return parts.join("\n");
}