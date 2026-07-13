"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { agents } from "@/data/agents";
import EmojiSVG from "@/components/EmojiSVG";
import { useSettings } from "@/lib/settings";

interface DebateRound {
  round: number;
  agent: string;
  side: "pro" | "con";
  content: string;
}

export default function DebatePage() {
  const { settings } = useSettings();
  const [topic, setTopic] = useState("");
  const [agentA, setAgentA] = useState("架构师 Agent");
  const [agentB, setAgentB] = useState("编码 Agent");
  const [rounds, setRounds] = useState(3);
  const [debating, setDebating] = useState(false);
  const [roundsData, setRoundsData] = useState<DebateRound[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streamingAgent, setStreamingAgent] = useState("");
  const [vote, setVote] = useState<string>("");
  const decoderRef = useRef(new TextDecoder());
  const [judgeVote, setJudgeVote] = useState<{ proVotes: number; conVotes: number; drawVotes: number } | null>(null);
  const [judgeEval, setJudgeEval] = useState("");
  const [judging, setJudging] = useState(false);

  const handleDebate = async () => {
    if (!topic.trim() || !settings.apiKey) return;
    setDebating(true);
    setRoundsData([]);
    setStreamingText("");
    setVote("");
    setJudgeVote(null);
    setJudgeEval("");
    setJudging(false);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic, agentA, agentB, rounds,
          settings: { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model },
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoderRef.current.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "round_end") {
              setRoundsData((prev) => [...prev, {
                round: parsed.round, agent: parsed.agent,
                side: parsed.agent === agentA ? "pro" : "con",
                content: parsed.content,
              }]);
              setStreamingText("");
            } else if (parsed.type === "delta") {
              setStreamingAgent(parsed.agent);
              setStreamingText((prev) => prev + parsed.delta);
            } else if (parsed.type === "judge_start") {
              setJudging(true);
            } else if (parsed.type === "judge_vote") {
              setJudgeVote({ proVotes: parsed.proVotes, conVotes: parsed.conVotes, drawVotes: parsed.drawVotes });
            } else if (parsed.type === "judge_delta") {
              setJudgeEval((prev) => prev + parsed.delta);
            } else if (parsed.type === "judge_end") {
              setJudging(false);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
    }
    setDebating(false);
    setStreamingText("");
  };

  const proRounds = roundsData.filter((r) => r.agent === agentA);
  const conRounds = roundsData.filter((r) => r.agent === agentB);

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pixel-grid-bg" />
      

      {/* 顶部导航 */}
      <nav className="nav-bar relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回首页</Link>
          <span className="nav-link nav-link-active flex items-center gap-1.5">
            <EmojiSVG emoji="⚔️" size={12} /> 辩论场
          </span>
          <Link href="/settings" className="nav-link">设置 →</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        {/* 页面标题 */}
        <div className="page-header">
          <p className="page-label">Debate Arena</p>
          <h1>Agent 辩论赛</h1>
          <p>两个 Agent 就对立观点展开辩论，你来做裁判。</p>
        </div>

        {/* 配置区 */}
        <div className="pixel-area pixel-area-hover p-6 mb-8">
          <h2 className="section-title">
            <span>⚙️</span> 辩论配置
          </h2>

          <div className="mb-5">
            <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-muted block mb-2">辩论主题</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：TypeScript 比 JavaScript 更适合大型项目"
              disabled={debating}
              className="input-pixel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-success/80 block mb-2">
                <EmojiSVG emoji="✅" size={12} /> 正方 Agent
              </label>
              <select
                value={agentA}
                onChange={(e) => setAgentA(e.target.value)}
                disabled={debating}
                className="input-pixel"
              >
                {agents.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-danger/80 block mb-2">
                <EmojiSVG emoji="✕" size={12} /> 反方 Agent
              </label>
              <select
                value={agentB}
                onChange={(e) => setAgentB(e.target.value)}
                disabled={debating}
                className="input-pixel"
              >
                {agents.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-5 p-4 border-2 border-[#e5e5e5]">
            <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-muted block mb-2">
              辩论轮次：<span className="text-ink font-bold">{rounds}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={rounds}
              onChange={(e) => setRounds(parseInt(e.target.value))}
              className="w-full accent-ink"
              disabled={debating}
            />
            <div className="flex justify-between mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`pixel-text text-[9px] ${n <= rounds ? "text-ink/60" : "text-muted"}`}>
                  {n}轮
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDebate}
              disabled={debating || !topic.trim() || !settings.apiKey}
              className="btn-pixel-dark"
            >
              {debating ? "辩论中..." : "⚔️ 开始辩论"}
            </button>
            {!settings.apiKey && (
              <span className="badge-pixel text-danger">
                ⚠ 请先在设置页面配置 API Key
              </span>
            )}
          </div>
        </div>

        {/* 辩论过程 */}
        {(roundsData.length > 0 || streamingText) && (
          <div className="grid grid-cols-2 gap-5 mb-8">
            {/* 正方 */}
            <div className="pixel-area pixel-area-hover p-5">
              <h3 className="section-title">
                <EmojiSVG emoji="✅" size={14} /> {agentA}
                <span className="badge-pixel ml-auto">正方</span>
              </h3>
              <div className="space-y-4">
                {proRounds.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 border-2 border-[#e5e5e5]"
                  >
                    <div className="pixel-text text-[9px] text-success/70 mb-2 font-semibold">
                      第 {r.round} 轮
                    </div>
                    <p className="pixel-text text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">
                      {r.content}
                    </p>
                  </motion.div>
                ))}
                {proRounds.length === 0 && !streamingAgent && (
                  <div className="empty-state !py-6">
                    <span className="empty-icon">✦</span>
                    <p className="empty-title">等待正方发言</p>
                  </div>
                )}
                {streamingAgent === agentA && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 border-2 border-[#0f0f0f]"
                  >
                    <div className="pixel-text text-[9px] text-success/70 mb-2 font-semibold flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 bg-success animate-blink" />
                      进行中...
                    </div>
                    <p className="pixel-text text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">
                      {streamingText}
                      <span className="animate-blink text-success">▋</span>
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* 反方 */}
            <div className="pixel-area pixel-area-hover p-5">
              <h3 className="section-title">
                <EmojiSVG emoji="✕" size={14} /> {agentB}
                <span className="badge-pixel ml-auto">反方</span>
              </h3>
              <div className="space-y-4">
                {conRounds.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 border-2 border-[#e5e5e5]"
                  >
                    <div className="pixel-text text-[9px] text-danger/70 mb-2 font-semibold">
                      第 {r.round} 轮
                    </div>
                    <p className="pixel-text text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">
                      {r.content}
                    </p>
                  </motion.div>
                ))}
                {conRounds.length === 0 && !streamingAgent && (
                  <div className="empty-state !py-6">
                    <span className="empty-icon">✦</span>
                    <p className="empty-title">等待反方发言</p>
                  </div>
                )}
                {streamingAgent === agentB && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 border-2 border-[#0f0f0f]"
                  >
                    <div className="pixel-text text-[9px] text-danger/70 mb-2 font-semibold flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 bg-danger animate-blink" />
                      进行中...
                    </div>
                    <p className="pixel-text text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">
                      {streamingText}
                      <span className="animate-blink text-danger">▋</span>
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 辩论中加载状态 */}
        {debating && roundsData.length === 0 && !streamingText && (
          <div className="pixel-area p-10 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="w-3 h-3 bg-ink/60"
                />
              ))}
            </div>
            <p className="pixel-text text-sm text-muted">AI 辩手正在准备辩论...</p>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="progress-bar" />
            </div>
          </div>
        )}

        {/* 投票区 */}
        {!debating && roundsData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pixel-area-elevated p-6 mb-8 text-center"
          >
            <h3 className="section-title !justify-center">
              <span>🗳️</span> 辩论结束 — 你认为谁赢了？
            </h3>
            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={() => setVote(agentA)}
                className={`btn-pixel ${vote === agentA ? "!bg-success !text-white !border-success" : ""}`}
              >
                <EmojiSVG emoji="✅" size={14} /> {agentA}
              </button>
              <button
                onClick={() => setVote("平局")}
                className={`btn-pixel ${vote === "平局" ? "!bg-ink !text-white !border-ink" : ""}`}
              >
                🤝 平局
              </button>
              <button
                onClick={() => setVote(agentB)}
                className={`btn-pixel ${vote === agentB ? "!bg-danger !text-white !border-danger" : ""}`}
              >
                <EmojiSVG emoji="✕" size={14} /> {agentB}
              </button>
            </div>
            {vote && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pixel-text text-xs text-muted mt-5"
              >
                你已投票：<span className="font-bold text-ink">{vote}</span>
              </motion.p>
            )}
          </motion.div>
        )}

        {/* 裁判评价 & 100人投票结果 */}
        {(judgeVote || judgeEval || judging) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pixel-area pixel-area-hover p-6 mb-8"
          >
            <h3 className="section-title">
              <span>🏛️</span> 裁判评价 & 100人模拟投票
              {judging && (
                <span className="badge-pixel ml-auto">
                  <span className="inline-block w-1.5 h-1.5 bg-warning animate-blink mr-1.5" />
                  评判中...
                </span>
              )}
            </h3>

            {/* 100人投票结果条形图 */}
            {judgeVote && (
              <div className="mb-6 p-5 pixel-area">
                <h4 className="pixel-text text-[10px] tracking-[0.1em] uppercase text-warning/80 mb-4 font-semibold">
                  📊 100 位观众立场投票
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="pixel-text text-[10px] text-success font-semibold w-20 text-right shrink-0">
                      {agentA}
                    </span>
                    <div className="flex-1 h-6 border-2 border-[#e5e5e5] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${judgeVote.proVotes}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-success"
                      />
                    </div>
                    <span className="pixel-text text-[11px] text-ink/80 w-12 text-right font-bold">
                      {judgeVote.proVotes}票
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="pixel-text text-[10px] text-danger font-semibold w-20 text-right shrink-0">
                      {agentB}
                    </span>
                    <div className="flex-1 h-6 border-2 border-[#e5e5e5] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${judgeVote.conVotes}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="h-full bg-danger"
                      />
                    </div>
                    <span className="pixel-text text-[11px] text-ink/80 w-12 text-right font-bold">
                      {judgeVote.conVotes}票
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="pixel-text text-[10px] text-muted font-semibold w-20 text-right shrink-0">
                      🤝 平局
                    </span>
                    <div className="flex-1 h-6 border-2 border-[#e5e5e5] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${judgeVote.drawVotes}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                        className="h-full bg-ink/30"
                      />
                    </div>
                    <span className="pixel-text text-[11px] text-ink/80 w-12 text-right font-bold">
                      {judgeVote.drawVotes}票
                    </span>
                  </div>
                </div>
                <p className="pixel-text text-[9px] text-muted mt-4 text-center">
                  以上为 AI 裁判模拟 100 位观众的投票结果
                </p>
              </div>
            )}

            {/* 裁判评价文字 */}
            {judgeEval && (
              <div className="p-5 pixel-area">
                <h4 className="pixel-text text-[10px] tracking-[0.1em] uppercase text-muted mb-3 font-semibold">
                  📝 裁判评语
                </h4>
                <div className="pixel-text text-xs text-ink/75 leading-relaxed whitespace-pre-wrap">
                  {judgeEval}
                </div>
              </div>
            )}

            {/* 评判中加载动画 */}
            {judging && !judgeVote && !judgeEval && (
              <div className="text-center py-10">
                <div className="inline-flex items-center gap-2 mb-4">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-3 h-3 bg-warning"
                    />
                  ))}
                </div>
                <p className="pixel-text text-sm text-warning/70">AI 裁判正在评判中...</p>
                <div className="mt-5 max-w-xs mx-auto">
                  <div className="progress-bar" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}