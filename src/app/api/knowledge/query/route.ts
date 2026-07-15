// ═══════════════════════════════════════════════════════════════
// 知识库问答 API — 每用户独立存储
// Knowledge Base Q&A API — Per-user isolated storage
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

interface Chunk {
  index: number;
  text: string;
  embedding: number[];
}
interface KBDocument {
  id: string;
  title: string;
  chunks: Chunk[];
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  try {
    const { question, settings: clientSettings } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }

    const apiKey = clientSettings?.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = clientSettings?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = clientSettings?.model || process.env.OPENAI_MODEL || "gpt-4o";
    const embApiKey = clientSettings?.embeddingApiKey || clientSettings?.apiKey || apiKey;
    const embBaseUrl = clientSettings?.embeddingBaseUrl || clientSettings?.baseUrl || baseUrl;
    const embModel = clientSettings?.embeddingModel || "text-embedding-3-small";

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    const kbDir = path.join(DATA_DIR, userId, "knowledge-base");
    await fs.mkdir(kbDir, { recursive: true });
    const files = (await fs.readdir(kbDir)).filter((f) => f.endsWith(".json"));
    const docs: KBDocument[] = await Promise.all(
      files.map(async (f) => JSON.parse(await fs.readFile(path.join(kbDir, f), "utf-8")))
    );

    if (docs.length === 0) {
      return NextResponse.json({ error: "知识库为空，请先上传文档" }, { status: 400 });
    }

    const questionEmbedding = await getEmbedding(question, embApiKey, embBaseUrl, embModel);

    const allChunks: Array<{ text: string; score: number; title: string }> = [];
    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        const score = cosineSimilarity(questionEmbedding, chunk.embedding);
        allChunks.push({ text: chunk.text, score, title: doc.title });
      }
    }
    allChunks.sort((a, b) => b.score - a.score);
    const topK = allChunks.slice(0, 5);

    const context = topK.map((c, i) => `[片段${i + 1} | 来源: ${c.title} | 相似度: ${(c.score * 100).toFixed(1)}%]\n${c.text}`).join("\n\n---\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        const writeSSE = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          writeSSE({ type: "sources", chunks: topK.map((c) => ({ title: c.title, score: c.score })) });

          const messages = [
            {
              role: "system",
              content: `你是知识库问答助手。根据以下知识库片段回答用户问题。如果知识库中没有相关信息，请说明。\n\n知识库片段：\n${context}`,
            },
            { role: "user", content: question },
          ];

          const chatUrl = baseUrl.endsWith("/v1")
            ? `${baseUrl}/chat/completions`
            : `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;

          const res = await fetch(chatUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model, messages, temperature: 0.3, stream: true }),
          });

          if (res.ok && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const json = JSON.parse(data);
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) writeSSE({ type: "delta", delta });
                } catch {}
              }
            }
          }

          writeSSE({ type: "done" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          writeSSE({ type: "error", error: "查询失败" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

async function getEmbedding(text: string, apiKey: string, baseUrl: string, model: string): Promise<number[]> {
  const url = baseUrl.endsWith("/v1")
    ? `${baseUrl}/embeddings`
    : `${baseUrl.replace(/\/$/, "")}/v1/embeddings`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    throw new Error("Embedding API error");
  }

  const json = await res.json();
  return json.data?.[0]?.embedding || [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}