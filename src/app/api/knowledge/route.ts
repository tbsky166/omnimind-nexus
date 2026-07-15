// ═══════════════════════════════════════════════════════════════
// 知识库 API — 每用户独立存储
// Knowledge Base API — Per-user isolated storage
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id") || null;
}

function getKBPath(userId: string) {
  return path.join(DATA_DIR, userId, "knowledge-base");
}

interface KBDocument {
  id: string;
  title: string;
  chunks: Chunk[];
  createdAt: number;
}

interface Chunk {
  index: number;
  text: string;
  embedding: number[];
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const kbDir = getKBPath(userId);
    await fs.mkdir(kbDir, { recursive: true });
    const files = await fs.readdir(kbDir);
    const docs = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map(async (f) => {
        const content = await fs.readFile(path.join(kbDir, f), "utf-8");
        const data = JSON.parse(content) as KBDocument;
        return {
          id: data.id,
          title: data.title,
          chunkCount: data.chunks.length,
          createdAt: data.createdAt,
        };
      })
    );
    return NextResponse.json({ documents: docs.sort((a, b) => b.createdAt - a.createdAt) });
  } catch {
    return NextResponse.json({ documents: [] });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, title, settings: clientSettings } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const apiKey = clientSettings?.embeddingApiKey || clientSettings?.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = clientSettings?.embeddingBaseUrl || clientSettings?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const embeddingModel = clientSettings?.embeddingModel || "text-embedding-3-small";

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    const chunks = chunkText(text, 500, 50);

    const embeddings: number[][] = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk, apiKey, baseUrl, embeddingModel);
      embeddings.push(embedding);
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const doc: KBDocument = {
      id: docId,
      title: title || `文档 ${new Date().toLocaleString("zh-CN")}`,
      chunks: chunks.map((text, i) => ({ index: i, text, embedding: embeddings[i] })),
      createdAt: Date.now(),
    };

    const kbDir = getKBPath(userId);
    await fs.mkdir(kbDir, { recursive: true });
    await fs.writeFile(path.join(kbDir, `${docId}.json`), JSON.stringify(doc));

    return NextResponse.json({ ok: true, id: docId, chunks: chunks.length });
  } catch (e) {
    return NextResponse.json({ error: "知识库上传失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const kbDir = getKBPath(userId);
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    await fs.unlink(path.join(kbDir, `${safeId}.json`)).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks.length > 0 ? chunks : [text];
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
    throw new Error(`Embedding API error ${res.status}`);
  }

  const json = await res.json();
  return json.data?.[0]?.embedding || [];
}