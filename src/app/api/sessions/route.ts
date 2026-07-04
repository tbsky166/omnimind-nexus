import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

const SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface SessionData {
  id: string;
  title: string;
  messages: unknown[];
  createdAt: number;
  updatedAt: number;
}

// GET /api/sessions — list all (or load one with ?id=xxx&load=1)
// POST /api/sessions — save session
// DELETE /api/sessions?id=xxx — delete session

export async function GET(req: NextRequest) {
  ensureDir();

  // Load single session
  const loadId = req.nextUrl.searchParams.get("id");
  const load = req.nextUrl.searchParams.get("load");
  if (loadId && load === "1") {
    const safeId = loadId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(SESSIONS_DIR, `${safeId}.json`);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const session = JSON.parse(raw);
      return Response.json({ session });
    } catch {
      return Response.json({ error: "Failed to load session" }, { status: 500 });
    }
  }

  // List all
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
    const sessions: SessionMeta[] = files
      .map((f) => {
        try {
          const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), "utf-8");
          const data = JSON.parse(raw) as SessionData;
          return {
            id: data.id,
            title: data.title,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            messageCount: data.messages.length,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as SessionMeta[];

    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return Response.json({ sessions });
  } catch {
    return Response.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  ensureDir();
  try {
    const body = await req.json();
    const { id, title, messages } = body;

    if (!id || !title || !messages) {
      return Response.json({ error: "id, title, and messages are required" }, { status: 400 });
    }

    const existing = fs.existsSync(path.join(SESSIONS_DIR, `${id}.json`));
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    const now = Date.now();

    let existingData: SessionData | null = null;
    if (existing) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch { /* ignore */ }
    }

    const data: SessionData = {
      id,
      title,
      messages,
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return Response.json({ success: true, id });
  } catch {
    return Response.json({ error: "Failed to save session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  ensureDir();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const filePath = path.join(SESSIONS_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
  if (!fs.existsSync(filePath)) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    fs.unlinkSync(filePath);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to delete session" }, { status: 500 });
  }
}