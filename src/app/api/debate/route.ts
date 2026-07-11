import { NextRequest, NextResponse } from "next/server";

// ── Agent 辩论 API / Agent debate API ──
// SSE 流式返回两个 Agent 的交替辩论 / SSE streaming for alternating debate
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { topic, agentA, agentB, rounds, settings: clientSettings } = await req.json();
    if (!topic || !agentA || !agentB) {
      return NextResponse.json({ error: "topic, agentA, agentB required" }, { status: 400 });
    }

    const apiKey = clientSettings?.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = clientSettings?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = clientSettings?.model || process.env.OPENAI_MODEL || "gpt-4o";
    const maxRounds = Math.min(rounds || 3, 5);

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const writeSSE = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // 开场白 / Opening
          writeSSE({ type: "start", topic, agentA, agentB, rounds: maxRounds });

          const history: Array<{ speaker: string; content: string }> = [];

          for (let round = 1; round <= maxRounds; round++) {
            // Agent A 立场（正方）/ Agent A — Pro
            const promptA = buildDebatePrompt(topic, agentA, "正方", history, round);
            writeSSE({ type: "round_start", round, agent: agentA, side: "pro" });

            const responseA = await fetch(`${baseUrl.endsWith("/v1") ? baseUrl : baseUrl + "/v1"}/chat/completions`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
              body: JSON.stringify({ model, messages: promptA, temperature: 0.8, stream: true }),
            });

            if (responseA.ok && responseA.body) {
              const readerA = responseA.body.getReader();
              const decoderA = new TextDecoder();
              let fullContent = "";
              let buffer = "";

              while (true) {
                const { done, value } = await readerA.read();
                if (done) break;
                buffer += decoderA.decode(value, { stream: true });
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
                      writeSSE({ type: "delta", round, agent: agentA, delta });
                    }
                  } catch {}
                }
              }
              history.push({ speaker: agentA, content: fullContent });
              writeSSE({ type: "round_end", round, agent: agentA, content: fullContent });
            }

            // Agent B 立场（反方）/ Agent B — Con
            const promptB = buildDebatePrompt(topic, agentB, "反方", history, round);
            writeSSE({ type: "round_start", round, agent: agentB, side: "con" });

            const responseB = await fetch(`${baseUrl.endsWith("/v1") ? baseUrl : baseUrl + "/v1"}/chat/completions`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
              body: JSON.stringify({ model, messages: promptB, temperature: 0.8, stream: true }),
            });

            if (responseB.ok && responseB.body) {
              const readerB = responseB.body.getReader();
              const decoderB = new TextDecoder();
              let fullContent = "";
              let buffer = "";

              while (true) {
                const { done, value } = await readerB.read();
                if (done) break;
                buffer += decoderB.decode(value, { stream: true });
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
                      writeSSE({ type: "delta", round, agent: agentB, delta });
                    }
                  } catch {}
                }
              }
              history.push({ speaker: agentB, content: fullContent });
              writeSSE({ type: "round_end", round, agent: agentB, content: fullContent });
            }
          }

          writeSSE({ type: "done", topic, agentA, agentB, rounds: maxRounds });

          // ═══════════════════════════════════════════════════════════════
          // 裁判 Agent — 100 人立场投票 + 辩论评价 / Judge Agent — 100-person vote + evaluation
          // ═══════════════════════════════════════════════════════════════
          writeSSE({ type: "judge_start" });

          const judgeMessages = buildJudgePrompt(topic, agentA, agentB, history);
          const judgeResponse = await fetch(`${baseUrl.endsWith("/v1") ? baseUrl : baseUrl + "/v1"}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages: judgeMessages, temperature: 0.7, stream: true }),
          });

          if (judgeResponse.ok && judgeResponse.body) {
            const judgeReader = judgeResponse.body.getReader();
            const judgeDecoder = new TextDecoder();
            let judgeRaw = "";
            // 收集原始 SSE 文本 / Collect raw SSE text
            while (true) {
              const { done, value } = await judgeReader.read();
              if (done) break;
              judgeRaw += judgeDecoder.decode(value, { stream: true });
            }

            // 解析 SSE 提取完整文本 / Parse SSE to extract full text
            let fullEvalText = "";
            const rawLines = judgeRaw.split("\n");
            for (const rawLine of rawLines) {
              const trimmed = rawLine.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) fullEvalText += delta;
              } catch {}
            }

            // 提取第一行作为投票结果 / Extract first line as vote results
            const newlineIdx = fullEvalText.indexOf("\n");
            const voteLine = newlineIdx !== -1 ? fullEvalText.slice(0, newlineIdx).trim() : fullEvalText.trim();
            const evalText = newlineIdx !== -1 ? fullEvalText.slice(newlineIdx + 1).trim() : "";

            // 解析投票数 / Parse vote counts
            const pm = voteLine.match(/正方[：:]\s*(\d+)\s*票.*反方[：:]\s*(\d+)\s*票.*平局[：:]\s*(\d+)\s*票/);
            if (pm) {
              writeSSE({ type: "judge_vote", proVotes: parseInt(pm[1]), conVotes: parseInt(pm[2]), drawVotes: parseInt(pm[3]) });
            } else {
              const nums = voteLine.match(/(\d+)/g);
              if (nums && nums.length >= 3) {
                writeSSE({ type: "judge_vote", proVotes: parseInt(nums[0]), conVotes: parseInt(nums[1]), drawVotes: parseInt(nums[2]) });
              } else {
                // 投票解析失败，默认 0/0/0 / Vote parse failed, default 0/0/0
                writeSSE({ type: "judge_vote", proVotes: 0, conVotes: 0, drawVotes: 0, parseError: true });
              }
            }

            // 流式推送评价文本 / Stream evaluation text
            if (evalText) {
              writeSSE({ type: "judge_delta", delta: evalText });
            }
          }

          writeSSE({ type: "judge_end" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          writeSSE({ type: "error", error: e instanceof Error ? e.message : "Unknown error" });
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
    return NextResponse.json({ error: "Debate failed" }, { status: 500 });
  }
}

// ── 构建辩论提示词 / Build debate prompt ──
function buildDebatePrompt(
  topic: string,
  agentName: string,
  side: string,
  history: Array<{ speaker: string; content: string }>,
  round: number,
) {
  const sideDesc = side === "正方"
    ? "你是正方，支持这个观点。你要提出有力的论据支持该主题。"
    : "你是反方，反对这个观点。你要提出有力的论据反驳该主题。";

  const messages = [
    {
      role: "system",
      content: `你是 ${agentName}，现在参与一场辩论赛。\n${sideDesc}\n\n辩论主题：${topic}\n\n规则：\n- 每次发言不超过 200 字\n- 直接输出你的辩论观点，不要加角色名\n- 如果是第 2 轮以后，要回应对方的论点\n- 语气有力但专业`,
    },
  ];

  if (round === 1) {
    messages.push({
      role: "user",
      content: `第 1 轮辩论开始。请就主题「${topic}」阐述你的${side}立场和核心论据。`,
    });
  } else {
    const historyText = history
      .map((h) => `${h.speaker}：${h.content}`)
      .join("\n\n");
    messages.push({
      role: "user",
      content: `辩论历史：\n\n${historyText}\n\n---\n\n第 ${round} 轮。请回应对方的论点，并进一步阐述你的${side}立场。`,
    });
  }

  return messages;
}

// ── 构建裁判评价提示词 / Build judge evaluation prompt ──
function buildJudgePrompt(
  topic: string,
  agentA: string,
  agentB: string,
  history: Array<{ speaker: string; content: string }>,
) {
  const debateText = history
    .map((h, i) => {
      const side = h.speaker === agentA ? "正方" : "反方";
      return `第 ${Math.floor(i / 2) + 1} 轮 ${side}（${h.speaker}）：\n${h.content}`;
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content: `你是一位资深的辩论裁判，同时也代表100位观众对这场辩论进行评判。

辩论主题：${topic}
正方：${agentA}
反方：${agentB}

以下是完整的辩论记录：

${debateText}

---

请完成以下任务，严格按照格式输出：

**第一行必须输出100位观众的模拟投票结果**，格式严格为：
正方：X票，反方：Y票，平局：Z票
（X+Y+Z=100，根据双方的辩论表现合理分配）

**从第二行开始，输出你的裁判评价**，包含以下内容：
1. 整体评价：双方表现概述
2. 正方亮点：${agentA} 的精彩论据
3. 反方亮点：${agentB} 的精彩论据
4. 不足之处：双方可改进的方面
5. 最终结论：谁更胜一筹及其原因

注意：第一行必须是投票结果，不要有任何其他文字。`,
    },
    {
      role: "user",
      content: `请对上述辩论进行裁判，先输出100位观众的投票结果，再输出详细评价。`,
    },
  ];
}
