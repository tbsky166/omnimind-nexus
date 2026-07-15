import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// ── 协作拓扑图数据 / Collaboration topology graph data ──
// 从会话历史中提取 Agent 协作关系 / Extract agent collaboration edges from session history
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "anonymous";
  try {
    const topology = await buildTopology(userId);
    return NextResponse.json(topology);
  } catch (e) {
    return NextResponse.json({ nodes: [], edges: [] });
  }
}

interface SessionMessage {
  speaker: string;
  isUser?: boolean;
  isSystem?: boolean;
}

async function buildTopology(userId: string) {
  const nodes = new Map<string, { id: string; label: string; count: number }>();
  const edges = new Map<string, { source: string; target: string; weight: number }>();

  try {
    const dir = path.join(process.cwd(), "data", "users", userId, "sessions");
    const files = await fs.readdir(dir);

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const content = await fs.readFile(path.join(dir, file), "utf-8");
      const data = JSON.parse(content);
      const messages: SessionMessage[] = data.messages || [];

      // 过滤出 Agent 消息 / Filter agent messages
      const agentSpeakers = messages
        .filter((m) => m.speaker && !m.isUser && !m.isSystem && m.speaker !== "Router" && m.speaker !== "仲裁组" && m.speaker !== "Quality Gate")
        .map((m) => m.speaker);

      // 统计节点 / Count nodes
      for (const speaker of agentSpeakers) {
        if (!nodes.has(speaker)) {
          nodes.set(speaker, { id: speaker, label: speaker, count: 0 });
        }
        nodes.get(speaker)!.count++;
      }

      // 构建边：同一会话中连续出现的 Agent 之间有协作关系 / Build edges between consecutive agents in same session
      const uniqueAgents = [...new Set(agentSpeakers)];
      for (let i = 0; i < uniqueAgents.length; i++) {
        for (let j = i + 1; j < uniqueAgents.length; j++) {
          const a = uniqueAgents[i];
          const b = uniqueAgents[j];
          const key = [a, b].sort().join("→");
          if (!edges.has(key)) {
            edges.set(key, { source: a, target: b, weight: 0 });
          }
          edges.get(key)!.weight++;
        }
      }
    }
  } catch {}

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}
