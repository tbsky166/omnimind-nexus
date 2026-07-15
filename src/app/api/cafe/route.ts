import { NextRequest, NextResponse } from "next/server";
import { agents } from "@/data/agents";
import fs from "fs";
import path from "path";

// ── 随机话题列表 / Random topic list ──
const CAFE_TOPICS = [
  "如果 AI 有感情，它们会做什么样的梦？",
  "人类和 AI 最大的区别是什么？",
  "如果让 AI 来设计一座城市，会是什么样子？",
  "时间旅行到底是悖论还是可能的？",
  "为什么咖啡因能让程序员写更多代码？",
  "宇宙中是否存在其他智慧生命？",
  "艺术到底是主观的还是客观的？",
  "如果 AI 可以互相谈恋爱，会怎样？",
  "什么是真正的创造力？",
  "为什么人类喜欢养猫？",
  "量子计算到底能改变什么？",
  "如果让你重新设计互联网，你会怎么做？",
  "音乐为什么能打动人心？",
  "AI 会不会有一天写出一部诺贝尔文学奖作品？",
  "如果可以给人类一个超能力，你会选择什么？",
  "为什么程序员喜欢深夜工作？",
  "未来的教育会是什么样子？",
  "如果 AI 来管理一个国家，会怎么样？",
  "什么是真正的智能？",
  "为什么人类对星空如此着迷？",
];

// ── 灵感卡片的 emoji 库 / Inspiration card emoji pool ──
const INSPIRATION_EMOJIS = ["💡", "✨", "🌟", "🎯", "🔮", "🌱", "🧩", "🎪", "🪄", "🌈", "💎", "🔥", "🎨", "🚀", "🦋"];

// ── Cafe API / Agent 咖啡馆闲聊 API ──
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const userId = req.headers.get("x-user-id") || "anonymous";

  try {
    const { settings: clientSettings } = await req.json();

    const apiKey = clientSettings?.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = clientSettings?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = clientSettings?.model || process.env.OPENAI_MODEL || "gpt-4o";

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    // 随机选择 2-3 个 Agent / Randomly select 2-3 agents
    const numAgents = Math.random() < 0.5 ? 2 : 3;
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    const selectedAgents = shuffled.slice(0, numAgents);

    // 随机选择话题 / Random topic
    const topic = CAFE_TOPICS[Math.floor(Math.random() * CAFE_TOPICS.length)];

    const stream = new ReadableStream({
      async start(controller) {
        const writeSSE = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ── 开场 / Opening ──
          writeSSE({
            type: "cafe_start",
            agents: selectedAgents.map((a) => a.name),
            topic,
          });

          const agentNames = selectedAgents.map((a) => a.name).join("、");
          const agentPersonalities = selectedAgents
            .map((a) => `${a.name}（${a.role}，性格：${a.personality}）`)
            .join("\n");

          const conversationPrompt = buildCafePrompt(selectedAgents, topic);

          const response = await fetch(
            `${baseUrl.endsWith("/v1") ? baseUrl : baseUrl + "/v1"}/chat/completions`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: conversationPrompt,
                temperature: 0.9,
                max_tokens: 2048,
                stream: true,
              }),
            }
          );

          if (!response.ok || !response.body) {
            writeSSE({ type: "cafe_error", error: "LLM 调用失败" });
            writeSSE({ type: "cafe_end" });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";
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
                if (delta) {
                  fullContent += delta;
                }
              } catch {}
            }
          }

          // ── 解析 LLM 输出 / Parse LLM output ──
          const parsed = parseCafeConversation(fullContent, selectedAgents);

          // 流式推送对话消息 / Stream conversation messages
          for (const msg of parsed.messages) {
            const agent = selectedAgents.find((a) => a.name === msg.speaker);
            writeSSE({
              type: "cafe_message",
              speaker: msg.speaker,
              content: msg.content,
              emoji: agent?.emoji || "🤖",
            });
            // 模拟延迟，让动画更自然 / Simulate delay for natural animation
            await sleep(600 + Math.random() * 400);
          }

          // ── 灵感卡片 / Inspiration card ──
          if (parsed.inspiration) {
            const inspEmoji =
              INSPIRATION_EMOJIS[Math.floor(Math.random() * INSPIRATION_EMOJIS.length)];
            writeSSE({
              type: "cafe_inspiration",
              title: parsed.inspiration.title,
              content: parsed.inspiration.content,
              emoji: inspEmoji,
            });

            // 保存到 JSON 文件 / Save to JSON file
            saveInspiration(userId, {
              title: parsed.inspiration.title,
              content: parsed.inspiration.content,
              emoji: inspEmoji,
              agents: selectedAgents.map((a) => a.name),
              topic,
              timestamp: Date.now(),
            });
          }

          writeSSE({ type: "cafe_end" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          writeSSE({
            type: "cafe_error",
            error: e instanceof Error ? e.message : "Unknown error",
          });
          writeSSE({ type: "cafe_end" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
  } catch (e) {
    return NextResponse.json({ error: "Cafe chat failed" }, { status: 500 });
  }
}

// ── 构建咖啡馆对话提示词 / Build cafe conversation prompt ──
function buildCafePrompt(
  selectedAgents: Array<{ name: string; role: string; personality: string; emoji: string }>,
  topic: string
) {
  const agentList = selectedAgents
    .map((a, i) => `${i + 1}. ${a.name}（${a.role}）— 性格：${a.personality}`)
    .join("\n");

  const agentNames = selectedAgents.map((a) => a.name).join("、");

  return [
    {
      role: "system",
      content: `你是一个对话生成器，负责模拟一群 AI Agent 在咖啡馆里的闲聊。

参与聊天的 Agent：
${agentList}

当前他们正在咖啡馆里喝咖啡（或虚拟咖啡），聊一个共同话题：**${topic}**

你的任务：
1. 生成一段自然、有趣、有温度的对话。每个 Agent 轮流发言，共 4-6 轮。
2. 让每个 Agent 都展现自己的性格特点。比如：
   - 架构师可能喜欢从结构角度分析
   - 编码 Agent 可能务实直接
   - 设计 Agent 注重审美
   - 财务 Agent 可能算账
   - 写作 Agent 可能文采飞扬
   - 等等
3. 对话要轻松、幽默，偶尔可以有俏皮话或吐槽，就像真正在咖啡馆聊天那样。
4. 对话末尾，如果他们聊出了什么有趣的创意或想法，在最后生成一个"灵感卡片"。

**输出格式要求（严格遵循）：**

每行一条对话，格式为：
**Agent名称**：说话内容

对话结束后，如果有灵感，另起一行输出：
---INSPIRATION---
标题：灵感标题
内容：灵感描述（1-2句话）

如果没有灵感，不要输出 ---INSPIRATION--- 部分。`,
    },
    {
      role: "user",
      content: `请生成 ${agentNames} 在咖啡馆里关于「${topic}」的闲聊对话。要求自然有趣，展现各自性格，4-6 轮对话。`,
    },
  ];
}

// ── 解析咖啡馆对话 / Parse cafe conversation ──
function parseCafeConversation(
  raw: string,
  selectedAgents: Array<{ name: string }>
): {
  messages: Array<{ speaker: string; content: string }>;
  inspiration: { title: string; content: string } | null;
} {
  const messages: Array<{ speaker: string; content: string }> = [];
  let inspiration: { title: string; content: string } | null = null;

  const agentNames = selectedAgents.map((a) => a.name);
  const inspIdx = raw.indexOf("---INSPIRATION---");

  const conversationPart = inspIdx !== -1 ? raw.slice(0, inspIdx) : raw;
  const inspirationPart = inspIdx !== -1 ? raw.slice(inspIdx + "---INSPIRATION---".length) : "";

  // 解析对话行 / Parse conversation lines
  const lines = conversationPart.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const name of agentNames) {
      const prefix = `**${name}**：`;
      const colonPrefix = `${name}：`;
      const colonPrefix2 = `${name}:`;

      let content = "";
      if (trimmed.startsWith(prefix)) {
        content = trimmed.slice(prefix.length).trim();
      } else if (trimmed.startsWith(colonPrefix)) {
        content = trimmed.slice(colonPrefix.length).trim();
      } else if (trimmed.startsWith(colonPrefix2)) {
        content = trimmed.slice(colonPrefix2.length).trim();
      }

      if (content) {
        messages.push({ speaker: name, content });
        break;
      }
    }
  }

  // 解析灵感卡片 / Parse inspiration card
  if (inspirationPart) {
    const inspLines = inspirationPart.split("\n");
    let title = "";
    let content = "";

    for (const line of inspLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("标题：") || trimmed.startsWith("标题:")) {
        title = trimmed.replace(/^标题[：:]\s*/, "").trim();
      } else if (trimmed.startsWith("内容：") || trimmed.startsWith("内容:")) {
        content = trimmed.replace(/^内容[：:]\s*/, "").trim();
      } else if (title && !content) {
        // 可能是标题的延续
        title += " " + trimmed;
      } else if (content) {
        content += " " + trimmed;
      }
    }

    if (title || content) {
      inspiration = { title: title || "灵感闪现", content: content || title };
    }
  }

  // 如果解析失败，创建一个 fallback 对话 / Create fallback if parsing fails
  if (messages.length === 0) {
    // 尝试把整个内容当成第一个 Agent 的发言
    const firstAgent = selectedAgents[0].name;
    const cleaned = raw.replace(/---INSPIRATION---[\s\S]*$/, "").trim();
    if (cleaned) {
      messages.push({ speaker: firstAgent, content: cleaned.slice(0, 200) });
    } else {
      messages.push({
        speaker: firstAgent,
        content: `今天的咖啡真不错！我们聊聊「${CAFE_TOPICS[0]}」吧？`,
      });
    }
  }

  return { messages, inspiration };
}

// ── 保存灵感卡片到 JSON 文件（按用户隔离）/ Save inspiration card to JSON (per-user) ──
function saveInspiration(userId: string, card: {
  title: string;
  content: string;
  emoji: string;
  agents: string[];
  topic: string;
  timestamp: number;
}) {
  try {
    const dataDir = path.join(process.cwd(), "data", "users", userId);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, "cafe_inspirations.json");

    let existing: typeof card[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        existing = JSON.parse(raw);
      } catch {
        existing = [];
      }
    }

    existing.push(card);
    // 只保留最近 50 条
    if (existing.length > 50) existing = existing.slice(-50);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
  } catch {
    // 静默失败，不影响主流程 / Fail silently, don't break main flow
  }
}

// ── 辅助：延迟 / Helper: sleep ──
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}