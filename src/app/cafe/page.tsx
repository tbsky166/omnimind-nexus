"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { agents } from "@/data/agents";
import sprites from "@/data/sprites";
import EmojiSVG from "@/components/EmojiSVG";
import { useSettings } from "@/lib/settings";
import { trackCafeChat } from "@/lib/achievements";

// ── 类型 / Types ──
interface CafeMessage {
  speaker: string;
  content: string;
  emoji: string;
}

interface InspirationCard {
  id: string;
  title: string;
  content: string;
  emoji: string;
  agents: string[];
  timestamp: number;
}

const INSPIRATION_STORAGE_KEY = "cafe_inspirations";

// ── 咖啡杯蒸汽粒子 / Coffee steam particles ──
const steamVariants = {
  animate: (i: number) => ({
    y: [-2, -18, -2],
    opacity: [0.3, 0.8, 0.3],
    scale: [0.8, 1.2, 0.8],
    transition: {
      duration: 2 + Math.random() * 2,
      repeat: Infinity,
      delay: i * 0.6,
      ease: "easeInOut",
    },
  }),
};

// ── 加载灵感卡片 / Load inspiration cards from localStorage ──
function loadInspirations(): InspirationCard[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(INSPIRATION_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveInspirations(cards: InspirationCard[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(cards));
  } catch {}
}

// ── 像素精灵渲染器 / Pixel sprite renderer ──
function PixelSprite({ name, size = 64 }: { name: string; size?: number }) {
  const sprite = sprites[name] || sprites["default"];
  if (!sprite) {
    return (
      <div
        className="flex items-center justify-center bg-ink/10 rounded-lg"
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.5 }}>🤖</span>
      </div>
    );
  }

  const cellSize = size / 32;
  const colCount = 32;
  const rowCount = 32;

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    >
      {sprite.rows.map((row, y) => {
        const rowCells: React.ReactNode[] = [];
        for (let x = 0; x < colCount; x++) {
          const ch = row[x] || " ";
          const color = sprite.palette[ch];
          if (color) {
            rowCells.push(
              <div
                key={`${y}-${x}`}
                className="absolute"
                style={{
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: color,
                }}
              />
            );
          }
        }
        return rowCells;
      })}
    </div>
  );
}

// ── 主页面 / Main page ──
export default function CafePage() {
  const { settings } = useSettings();
  const [chatting, setChatting] = useState(false);
  const [messages, setMessages] = useState<CafeMessage[]>([]);
  const [currentAgents, setCurrentAgents] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [inspirationCards, setInspirationCards] = useState<InspirationCard[]>([]);
  const [latestInspiration, setLatestInspiration] = useState<InspirationCard | null>(null);
  const [showInspiration, setShowInspiration] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAgentsRef = useRef<string[]>([]);
  const inspirationCardsRef = useRef<InspirationCard[]>([]);

    // 加载已保存的灵感卡片 / Load saved inspiration cards
  useEffect(() => {
    const loaded = loadInspirations();
    setInspirationCards(loaded);
    inspirationCardsRef.current = loaded;
  }, []);

  // 滚动到最新消息 / Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 开始聊天 / Start chat ──
  const handleStartChat = useCallback(async () => {
    if (!settings.apiKey) return;
    setChatting(true);
    setMessages([]);
    setCurrentAgents([]);
    currentAgentsRef.current = [];
    setCurrentTopic("");
    setLatestInspiration(null);
    setShowInspiration(false);

    try {
      const res = await fetch("/api/cafe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
          },
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) {
        setChatting(false);
        return;
      }

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
            const parsed = JSON.parse(data);

            if (parsed.type === "cafe_start") {
              setCurrentAgents(parsed.agents);
              currentAgentsRef.current = parsed.agents;
              setCurrentTopic(parsed.topic || "");
            } else if (parsed.type === "cafe_message") {
              setMessages((prev) => [
                ...prev,
                {
                  speaker: parsed.speaker,
                  content: parsed.content,
                  emoji: parsed.emoji,
                },
              ]);
              // 追踪聊天 / Track chat
              trackCafeChat(parsed.speaker);
            } else if (parsed.type === "cafe_inspiration") {
              const card: InspirationCard = {
                id: `insp_${Date.now()}`,
                title: parsed.title,
                content: parsed.content,
                emoji: parsed.emoji,
                agents: currentAgentsRef.current.length > 0 ? currentAgentsRef.current : [],
                timestamp: Date.now(),
              };
              setLatestInspiration(card);
              setShowInspiration(true);

              // 保存到 localStorage / Save to localStorage
              const updated = [card, ...inspirationCardsRef.current];
              setInspirationCards(updated);
              inspirationCardsRef.current = updated;
              saveInspirations(updated);
            } else if (parsed.type === "cafe_end") {
              // 完成
            } else if (parsed.type === "cafe_error") {
              console.error("Cafe error:", parsed.error);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error("Cafe chat error:", e);
    }
    setChatting(false);
  }, [settings]);

  // 删除灵感卡片 / Delete inspiration card
  const handleDeleteCard = (id: string) => {
    const updated = inspirationCards.filter((c) => c.id !== id);
    setInspirationCards(updated);
    saveInspirations(updated);
  };

  // 获取 Agent 的 emoji / Get agent emoji
  const getAgentEmoji = (name: string) => {
    const agent = agents.find((a) => a.name === name);
    return agent?.emoji || "🤖";
  };

  // 获取 Agent 的详细信息 / Get agent details
  const getAgentInfo = (name: string) => {
    return agents.find((a) => a.name === name);
  };

  return (
    <main className="relative min-h-screen bg-white">
      {/* 背景像素网格 / Background pixel grid */}
      <div className="pixel-grid-bg" />
      

      {/* ── 顶部导航 / Nav bar ── */}
      <nav className="nav-bar relative z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">
            ← 返回首页
          </Link>
          <span className="nav-link nav-link-active flex items-center gap-1.5">
            <EmojiSVG emoji="💬" size={12} /> 咖啡馆
          </span>
          <Link href="/settings" className="nav-link">
            设置 →
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        {/* ── 页面标题 / Page header ── */}
        <div className="page-header">
          <p className="page-label">Agent Cafe</p>
          <h1>Agent 咖啡馆</h1>
          <p>围观 Agent 闲时聊天，收集灵感卡片</p>
        </div>

        {/* ── 咖啡馆场景 / Cafe scene ── */}
        <div className="relative mb-8 overflow-hidden border-2 border-[#0f0f0f]">
          {/* 咖啡馆背景 / Cafe background */}
          <div
            className="relative p-8 min-h-[400px]"
            style={{
              background: "linear-gradient(180deg, #3d1c00 0%, #5c2e0a 15%, #8b4513 35%, #a0522d 55%, #6b3410 85%, #3d1c00 100%)",
            }}
          >
            {/* 墙壁纹理 / Wall texture */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px)",
              }}
            />

            {/* 暖光吊灯 / Warm hanging lights */}
            <div className="absolute top-0 left-1/4 w-2 h-12 bg-gradient-to-b from-yellow-200/80 to-transparent rounded-full blur-sm" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-16 bg-gradient-to-b from-yellow-200/80 to-transparent rounded-full blur-sm" />
            <div className="absolute top-0 right-1/4 w-2 h-12 bg-gradient-to-b from-yellow-200/80 to-transparent rounded-full blur-sm" />

            {/* 灯光光晕 / Light glow */}
            <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(255,200,100,0.15) 0%, transparent 70%)",
              }}
            />

            {/* 窗户 / Window */}
            <div className="absolute top-8 right-8 w-24 h-32 rounded-lg border-2 border-amber-900/60 bg-gradient-to-b from-indigo-900/40 to-indigo-700/20 overflow-hidden hidden md:block">
              <div className="absolute inset-1 rounded bg-gradient-to-b from-indigo-800/60 to-blue-900/40">
                {/* 星星 / Stars */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                    style={{
                      left: `${10 + Math.random() * 70}%`,
                      top: `${5 + Math.random() * 40}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      opacity: 0.3 + Math.random() * 0.5,
                    }}
                  />
                ))}
                {/* 月亮 / Moon */}
                <div className="absolute top-3 right-3 w-4 h-4 bg-yellow-100/80 rounded-full shadow-[0_0_6px_rgba(255,255,200,0.5)]" />
              </div>
              {/* 窗框十字 / Window cross */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-amber-900/60" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-amber-900/60" />
            </div>

            {/* 书架 / Bookshelf */}
            <div className="absolute top-8 left-6 w-16 h-28 rounded border border-amber-900/50 bg-amber-950/30 hidden md:block">
              <div className="absolute inset-1 flex flex-col gap-[2px]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-amber-900/30 rounded-sm flex items-center justify-center">
                    <div
                      className="w-1 h-full rounded-sm"
                      style={{
                        backgroundColor: ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"][i % 6],
                        opacity: 0.6,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 盆栽 / Potted plant */}
            <div className="absolute bottom-0 right-6 hidden md:block">
              <div className="w-12 h-10 rounded-t-xl bg-amber-800/60 border border-amber-900/40" />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <div className="w-10 h-10 rounded-full bg-green-700/60" />
                <div className="absolute -top-2 left-0 w-5 h-6 rounded-full bg-green-600/50" />
                <div className="absolute -top-1 right-0 w-5 h-5 rounded-full bg-green-600/50" />
              </div>
            </div>

            {/* ── 桌子 / Table ── */}
            <div className="absolute bottom-0 left-4 right-4 h-16 rounded-t-3xl bg-gradient-to-b from-amber-800 to-amber-950 border-t-2 border-amber-700/60"
              style={{
                boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
              }}
            />

            {/* ── 咖啡杯 / Coffee cups on table ── */}
            <div className="absolute bottom-16 left-1/3 -translate-x-1/2 flex gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="relative flex flex-col items-center">
                  {/* 蒸汽 / Steam */}
                  {[0, 1, 2].map((j) => (
                    <motion.div
                      key={j}
                      custom={j}
                      variants={steamVariants}
                      animate="animate"
                      className="absolute w-1.5 h-3 rounded-full bg-white/30"
                      style={{
                        left: `${-2 + j * 5}px`,
                        bottom: "26px",
                        filter: "blur(1px)",
                      }}
                    />
                  ))}
                  {/* 杯子 / Cup */}
                  <div className="w-10 h-8 rounded-b-lg rounded-t-sm bg-white/80 border border-amber-600/40 relative"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                  >
                    {/* 咖啡液面 / Coffee surface */}
                    <div className="absolute top-1 left-1 right-1 h-3 rounded-t-sm bg-amber-950/60" />
                    {/* 杯柄 / Handle */}
                    <div className="absolute -right-2 top-2 w-3 h-4 rounded-r-full border-2 border-l-0 border-white/80" />
                  </div>
                  {/* 碟子 / Saucer */}
                  <div className="w-14 h-2 rounded-full bg-white/50 border border-amber-600/20 -mt-0.5" />
                </div>
              ))}
            </div>

            {/* ── Agent 区域 / Agent area ── */}
            <div className="relative z-10 flex justify-center gap-8 pt-8 pb-24">
              <AnimatePresence>
                {currentAgents.length > 0 ? (
                  currentAgents.map((name, i) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, y: 30, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.15 }}
                      className="flex flex-col items-center gap-2"
                    >
                      {/* 精灵像素画 / Pixel sprite */}
                      <div className="p-3 bg-white border-2 border-[#e5e5e5]">
                        <PixelSprite name={name} size={64} />
                      </div>
                      {/* Agent 名字 / Agent name */}
                      <span className="badge-pixel text-[10px]">
                        {getAgentEmoji(name)} {name}
                      </span>
                      {/* 聊天中指示器 / Chatting indicator */}
                      {chatting && (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                          className="flex gap-1"
                        >
                          <div className="w-1.5 h-1.5 bg-amber-300" />
                          <div className="w-1.5 h-1.5 bg-amber-300" />
                          <div className="w-1.5 h-1.5 bg-amber-300" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  /* 等待状态 / Waiting state */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 py-12"
                  >
                    <div className="w-20 h-20 bg-white border-2 border-dashed border-[#e5e5e5] flex items-center justify-center">
                      <span className="text-3xl opacity-60">☕</span>
                    </div>
                    <p className="pixel-text text-sm text-amber-200/60">
                      咖啡已经准备好了，等待 Agent 们入座...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── 操作栏 / Action bar ── */}
          <div className="relative z-10 bg-white border-t-2 border-[#0f0f0f] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="pixel-text text-[11px] text-ink">
                {currentTopic ? (
                  <>💬 话题：{currentTopic}</>
                ) : (
                  <>☕ 点击按钮，随机邀请 Agent 来聊天</>
                )}
              </span>
              {currentAgents.length > 0 && (
                <span className="badge-pixel">
                  {currentAgents.join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!settings.apiKey && (
                <span className="badge-pixel">
                  ⚠ 请先配置 API Key
                </span>
              )}
              <button
                onClick={handleStartChat}
                disabled={chatting || !settings.apiKey}
                className="btn-pixel-dark !bg-amber-700 !border-amber-500 hover:!bg-amber-600 !text-amber-50"
              >
                {chatting ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      ☕
                    </motion.span>
                    聊天中...
                  </span>
                ) : (
                  "☕ 开始聊天"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── 对话气泡区 / Conversation bubbles ── */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pixel-area pixel-area-hover p-6 mb-8"
            >
              <h2 className="section-title">
                <span>💬</span> 咖啡馆对话
                {chatting && (
                  <span className="badge-pixel ml-auto">
                    <span className="inline-block w-1.5 h-1.5 bg-warning animate-pulse mr-1.5" />
                    进行中...
                  </span>
                )}
              </h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pixel-scrollbar pr-2">
                {messages.map((msg, i) => {
                  const agentInfo = getAgentInfo(msg.speaker);
                  const isLast = i === messages.length - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-3 items-start"
                    >
                      {/* 头像 / Avatar */}
                      <div className="shrink-0 w-10 h-10 bg-white border-2 border-[#e5e5e5] flex items-center justify-center">
                        <EmojiSVG emoji={msg.emoji} size={20} />
                      </div>
                      {/* 气泡 / Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="pixel-text text-[10px] font-bold text-ink">
                            {msg.speaker}
                          </span>
                          {agentInfo && (
                            <span className="badge-pixel !text-[9px]">
                              {agentInfo.role}
                            </span>
                          )}
                          {isLast && chatting && (
                            <span className="inline-block w-1.5 h-1.5 bg-success animate-pulse" />
                          )}
                        </div>
                        <div className="relative bg-white border-2 border-[#e5e5e5] px-4 py-3">
                          <p className="pixel-text text-xs text-ink/80 leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 聊天中加载状态 / Chatting loading state ── */}
        {chatting && messages.length === 0 && (
          <div className="pixel-area p-10 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="w-3 h-3 rounded-sm bg-amber-600"
                />
              ))}
            </div>
            <p className="pixel-text text-sm text-ink/60">
              {currentAgents.length > 0
                ? `${currentAgents.join("、")} 正在咖啡馆里闲聊...`
                : "正在邀请 Agent 来咖啡馆..."}
            </p>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="progress-bar animate-shimmer" />
            </div>
          </div>
        )}

        {/* ── 灵感卡片 / Inspiration card ── */}
        <AnimatePresence>
          {showInspiration && latestInspiration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="relative mb-8 p-6 overflow-hidden border-2 border-[#0f0f0f] bg-white"
            >
              {/* 闪光装饰 / Sparkle decorations */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-6 -right-6 text-6xl opacity-20"
              >
                ✨
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-4 -left-4 text-5xl opacity-20"
              >
                ⭐
              </motion.div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-3xl"
                  >
                    {latestInspiration.emoji}
                  </motion.span>
                  <div>
                    <span className="badge-pixel">
                      🎴 灵感卡片
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">
                  {latestInspiration.title}
                </h3>
                <p className="pixel-text text-sm text-amber-800/80 leading-relaxed">
                  {latestInspiration.content}
                </p>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-400/30">
                  <span className="pixel-text text-[9px] text-amber-700/60">
                    来自 {latestInspiration.agents.join("、")} 的灵感
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 灵感卡片收藏 / Inspiration card collection ── */}
        <div className="pixel-area pixel-area-hover p-6">
          <h2 className="section-title">
            <span>🎴</span> 灵感卡片收藏
            <span className="badge-pixel ml-auto">
              {inspirationCards.length} 张
            </span>
          </h2>

          {inspirationCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspirationCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group"
                >
                  <div
                    className="p-4 border-2 transition-all duration-200 bg-white"
                    style={{
                      borderColor: "#fcd34d",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{card.emoji}</span>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 hover:text-red-500"
                        title="删除卡片"
                      >
                        <EmojiSVG emoji="✕" size={12} />
                      </button>
                    </div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1 line-clamp-1">
                      {card.title}
                    </h4>
                    <p className="pixel-text text-[11px] text-amber-700/70 leading-relaxed line-clamp-3 mb-3">
                      {card.content}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {card.agents.map((name) => (
                        <span
                          key={name}
                          className="badge-pixel !text-[9px]"
                        >
                          {getAgentEmoji(name)} {name}
                        </span>
                      ))}
                      <span className="pixel-text text-[8px] text-amber-400/60 ml-auto">
                        {new Date(card.timestamp).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✦</span>
              <p className="empty-title">还没有灵感卡片</p>
              <p className="empty-desc">
                让 Agent 们在咖啡馆里聊天，也许会有意想不到的灵感迸发！
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}