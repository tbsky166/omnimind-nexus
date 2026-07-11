import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// ── 知识库 API / Knowledge Base API ──
// POST: 上传文档 → 分块 → 嵌入 → 存储 / Upload doc → chunk → embed → store
// GET: 列出知识库文档 / List KB documents
// DELETE: 删除文档 / Delete document

const KB_DIR = path.join(process.cwd(), "data", "knowledge-base");

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

export async function GET() {
  try {
    await fs.mkdir(KB_DIR, { recursive: true });
    const files = await fs.readdir(KB_DIR);
    const docs = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map(async (f) => {
        const content = await fs.readFile(path.join(KB_DIR, f), "utf-8");
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
  } catch (e) {
    return NextResponse.json({ documents: [] });
  }
}

export async function POST(req: NextRequest) {
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

    // 分块 / Chunk text (每块约 500 字符，重叠 50 字符) / Chunk (~500 chars, 50 overlap)
    const chunks = chunkText(text, 500, 50);

    // 嵌入每个块 / Embed each chunk
    const embeddings: number[][] = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk, apiKey, baseUrl, embeddingModel);
      embeddings.push(embedding);
    }

    // 存储到文件 / Store to file
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const doc: KBDocument = {
      id: docId,
      title: title || `文档 ${new Date().toLocaleString("zh-CN")}`,
      chunks: chunks.map((text, i) => ({ index: i, text, embedding: embeddings[i] })),
      createdAt: Date.now(),
    };

    await fs.mkdir(KB_DIR, { recursive: true });
    await fs.writeFile(path.join(KB_DIR, `${docId}.json`), JSON.stringify(doc));

    return NextResponse.json({ ok: true, id: docId, chunks: chunks.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    await fs.unlink(path.join(KB_DIR, `${safeId}.json`)).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

// ── 分块 / Chunk text ──
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

// ── 获取嵌入 / Get embedding ──
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
    const err = await res.text();
    throw new Error(`Embedding API 错误 ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.data?.[0]?.embedding || [];
}
