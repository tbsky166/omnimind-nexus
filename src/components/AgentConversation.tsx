"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConversationMessage } from "@/data/agents";
import sprites, { type SpriteData } from "@/data/sprites";
import EmojiSVG from "@/components/EmojiSVG";

// ── 主对话 UI 与流水线可视化 / Main conversation UI with pipeline visualization ──

// ── 像素调色板 / Pixel color palette ──
const agentColors: Record<string, { bg: string; border: string; text: string; primary: string; secondary: string; skin: string }> = {
  Router:         { bg: "#f0f0f0", border: "#888", text: "#333", primary: "#555", secondary: "#999", skin: "#ffd5b8" },
  Planner:        { bg: "#faf5e8", border: "#c4a44a", text: "#5c4a1f", primary: "#8b6914", secondary: "#c4a44a", skin: "#ffd5b8" },
  "仲裁组":        { bg: "#f5f0fa", border: "#8b6fc4", text: "#3d2a6e", primary: "#5b3e96", secondary: "#8b6fc4", skin: "#ffd5b8" },
  "Quality Gate":  { bg: "#e8faf0", border: "#4ac48b", text: "#1f5c3a", primary: "#2d8a5e", secondary: "#4ac48b", skin: "#ffd5b8" },
  default:         { bg: "#f5f7fa", border: "#5a7da8", text: "#2a3d5c", primary: "#3a5d8a", secondary: "#5a7da8", skin: "#ffd5b8" },
};

function getColor(name: string) {
  return agentColors[name] || agentColors.default;
}

// ── 像素艺术组件：32x32 字符串网格 → 任意尺寸 SVG / PixelArtSVG: 32x32 string grid → SVG at arbitrary size ──
function PixelArtSVG({ rows, size, palette }: { rows: string[]; size: number; palette: Record<string, string> }) {
  const n = rows.length; // 行数 / row count
  const cellW = size / n;
  const cellH = size / n;
  const rects: { x: number; y: number; fill: string }[] = [];
  for (let r = 0; r < n; r++) {
    const line = rows[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch !== " " && palette[ch]) {
        rects.push({ x: c * cellW, y: r * cellH, fill: palette[ch] });
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated", display: "block" }}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={cellW} height={cellH} fill={r.fill} shapeRendering="crispEdges" />
      ))}
    </svg>
  );
}

// 根据 Agent 名称获取对应的精灵图 / Get sprite for agent by name
function getSpriteForAgent(name: string): SpriteData {
  return sprites[name] || sprites.default;
}

// 根据 Agent 名称自定义调色板 — 仅对默认精灵生效 / Customize colors per agent — only for the default (shared) sprite
function getAgentPalette(name: string, basePalette: Record<string, string>): Record<string, string> {
  // 具名精灵有自己的独特色彩 — 不覆盖 / Named sprites have their own unique colors — don't override
  if (sprites[name]) return basePalette;
  // 默认精灵：使用 Agent 的分类颜色 / Default sprite: customize with agent's category colors
  const clr = getColor(name);
  return {
    ...basePalette,
    p: clr.primary,
    s: clr.secondary,
    o: clr.skin,
    e: "#fff",
    w: "#fff",
  };
}

// ── 像素角色精灵组件（SVG 像素艺术）/ PixelSprite component (SVG pixel art) ──
function PixelSprite({ name, size = 48, active = false }: { name: string; size?: number; active?: boolean }) {
  const sprite = getSpriteForAgent(name);
  const palette = getAgentPalette(name, sprite.palette);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size + 8,
        height: size + 8,
        imageRendering: "pixelated",
        border: "2px solid #1a1a1a",
        background: active ? "#e8ffe8" : "#fafafa",
        boxShadow: active ? "0 0 0 2px #4a4, 0 0 8px #4a4" : "2px 2px 0 #ccc",
        transition: "all 0.3s",
      }}
    >
      <PixelArtSVG rows={sprite.rows} size={size} palette={palette} />
      {active && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-green-500"
          style={{ imageRendering: "pixelated" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ── SVG 文件/工具图标组件 / SVG item icons for tool cards ──
function DocxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#185abd" />
      <rect x="3" y="0" width="7" height="3" fill="#4a8df0" />
      <rect x="3" y="10" width="10" height="2" fill="#fff" opacity="0.2" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.6" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.4" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">DOC</text>
    </svg>
  );
}

function XlsxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#107c41" />
      <rect x="3" y="0" width="7" height="3" fill="#4ac48b" />
      <rect x="3" y="10" width="10" height="2" fill="#fff" opacity="0.2" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.6" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.4" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">XLS</text>
    </svg>
  );
}

function FileIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#555" />
      <rect x="3" y="0" width="7" height="3" fill="#888" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.4" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.3" />
      <rect x="5" y="10" width="5" height="1" fill="#fff" opacity="0.25" />
    </svg>
  );
}

// 工具图标分发器：根据类型返回对应图标 / Tool icon dispatcher: returns icon based on type
function ToolIcon({ type, size = 24 }: { type: string; size?: number }) {
  if (type === "xlsx") return <XlsxIcon size={size} />;
  if (type === "docx") return <DocxIcon size={size} />;
  return <FileIcon size={size} />;
}

// ── 节点间的管道连接段 / Pipe segment between nodes ──
function Pipe({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-center flex-shrink-0" style={{ width: 24, height: 6 }}>
      <div
        className="w-full"
        style={{
          height: 3,
          background: active ? "#4a4" : "#aaa",
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          transition: "background 0.3s",
        }}
      />
      {active && (
        <motion.div
          className="absolute"
          style={{ width: 4, height: 4, background: "#4f4", marginLeft: 10 }}
          animate={{ x: [0, 16, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ── 流水线节点组件 / PipelineNode component ──
interface PipelineNodeData {
  id: string;
  name: string;
  emoji: string;
  layer: string;
  status: "waiting" | "active" | "done" | "error";
  content: string;
  toolCalls: ConversationMessage[];
}

function PipelineNode({
  node,
  isStreaming,
}: {
  node: PipelineNodeData;
  isStreaming: boolean;
}) {
  const clr = getColor(node.name);
  const isSystem = node.name === "Router" || node.name === "Planner" || node.name === "仲裁组" || node.name === "Quality Gate";
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 气泡内容自动滚动到底部 / Auto-scroll bubble to bottom
  useEffect(() => {
    if (bubbleRef.current) {
      bubbleRef.current.scrollTop = bubbleRef.current.scrollHeight;
    }
  }, [node.content, isStreaming]);

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 80, maxWidth: 140 }}>
      {/* 角色精灵 / Character sprite */}
      <PixelSprite name={node.name} active={node.status === "active"} />

      {/* 名称标签 / Name plate */}
      <div
        className="mt-1 px-2 py-0.5 text-center"
        style={{
          background: node.status === "done" ? clr.bg : (node.status === "active" ? "#e8ffe8" : "#fafafa"),
          border: "1.5px solid #1a1a1a",
          boxShadow: "1px 1px 0 #ccc",
          imageRendering: "pixelated",
        }}
      >
        <p className="pixel-text text-[8px] tracking-[0.1em] text-ink/80 font-semibold leading-tight flex items-center justify-center gap-1">
          {node.emoji && <EmojiSVG emoji={node.emoji} size={12} />}
          {node.name}
        </p>
        <p className="pixel-text text-[7px] tracking-[0.15em] text-ink/35">{node.layer}</p>
      </div>

      {/* 状态指示器 / Status indicator */}
      <div className="mt-0.5">
        {node.status === "waiting" && (
          <span className="pixel-text text-[7px] text-ink/20">···</span>
        )}
        {node.status === "active" && (
          <motion.span
            className="pixel-text text-[7px] text-green-700 font-bold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            WORKING
          </motion.span>
        )}
        {node.status === "done" && (
          <span className="pixel-text text-[7px] text-green-700">✓ DONE</span>
        )}
        {node.status === "error" && (
          <span className="pixel-text text-[7px] text-red-600">✕ ERR</span>
        )}
      </div>

      {/* Speech bubble for content */}
      <AnimatePresence>
        {(node.content || node.toolCalls.length > 0) && node.status !== "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 w-full"
          >
            {/* 对话气泡 / Speech bubble */}
            <div
              className="relative px-2.5 py-2 text-left"
              style={{
                background: isSystem ? "#fafafa" : "#fff",
                border: "1.5px solid #1a1a1a",
                boxShadow: "2px 2px 0 #ddd",
                imageRendering: "pixelated",
              }}
            >
              {/* 气泡三角尾巴 / Bubble tail */}
              <div
                className="absolute -top-[6px] left-1/2 -translate-x-1/2"
                style={{
                  width: 0, height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "6px solid #1a1a1a",
                }}
              />
              <div
                className="absolute -top-[4px] left-1/2 -translate-x-1/2"
                style={{
                  width: 0, height: 0,
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderBottom: "5px solid #fff",
                }}
              />

              {node.content && (
                <div
                  ref={bubbleRef}
                  className="pixel-scrollbar pixel-text text-[8px] leading-relaxed text-ink/75 overflow-y-auto"
                  style={{
                    maxHeight: 120,
                    scrollbarWidth: "thin",
                    scrollbarColor: "#aaa #f0f0f0",
                  }}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {node.content}
                    {isStreaming && (
                      <motion.span
                        className="inline-block w-[2px] h-[8px] bg-ink/60 ml-0.5 align-middle"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      />
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* 工具调用卡片 / Tool call cards */}
            {node.toolCalls.map((tc, i) => (
              <a
                key={i}
                href={tc.fileUrl}
                download={tc.downloadName}
                className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 border-2 border-ink bg-white hover:bg-ink hover:text-white transition-all duration-200 group cursor-pointer"
                style={{ boxShadow: "2px 2px 0 #ddd" }}
              >
                <ToolIcon type={tc.fileFormat || "file"} size={20} />
                <div className="flex-1 min-w-0">
                  <p className="pixel-text text-[7px] tracking-[0.05em] text-ink/60 group-hover:text-white/70 truncate">
                    {tc.downloadName}
                  </p>
                  <p className="pixel-text text-[6px] text-ink/30 group-hover:text-white/40">
                    {tc.toolAction || "DOWNLOAD"}
                  </p>
                </div>
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 流水线视图组件 / PipelineView component ──
function PipelineView({
  messages,
  loading,
}: {
  messages: ConversationMessage[];
  loading: boolean;
}) {
  const pipelineRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新节点 / Auto-scroll to latest node
  useEffect(() => {
    if (pipelineRef.current) {
      pipelineRef.current.scrollLeft = pipelineRef.current.scrollWidth;
    }
  }, [messages]);

  // 从消息构建流水线节点 / Build pipeline nodes from messages
  const nodes = useMemo(() => {
    const result: PipelineNodeData[] = [];
    const seen = new Set<string>();

    // 用户节点 / User node
    const userMsg = messages.find((m) => m.isUser);
    if (userMsg) {
      result.push({
        id: "user", name: "YOU", emoji: "👤", layer: "INPUT",
        status: "done", content: userMsg.content.slice(0, 60),
        toolCalls: [],
      });
    }

    for (const msg of messages) {
      if (msg.isUser || msg.isSystem === false && !msg.a2aLayer) continue;

      const name = msg.speaker;
      const layer = msg.a2aLayer || "";
      const nodeId = `${name}_${layer}`;

      if (seen.has(nodeId)) {
        // 更新已存在的节点 / Update existing node
        const existing = result.find((n) => n.id === nodeId);
        if (existing) {
          if (msg.fileUrl) {
            existing.toolCalls.push(msg);
          } else {
            existing.content = msg.content;
          }
          if (existing.status !== "active") existing.status = "done";
        }
        continue;
      }

      seen.add(nodeId);

      const isSystem = msg.isSystem || false;
      result.push({
        id: nodeId,
        name,
        emoji: msg.emoji || (isSystem ? "⚙️" : "🤖"),
        layer,
        status: "done",
        content: msg.content,
        toolCalls: msg.fileUrl ? [msg] : [],
      });
    }

    // 加载中时标记最后一个 Agent 节点为活跃状态 / Mark the last agent node as active if loading
    if (loading && result.length > 0) {
      const lastAgent = [...result].reverse().find((n) =>
        n.name !== "Router" && n.name !== "Planner" && n.name !== "YOU" && n.name !== "仲裁组" && n.name !== "Quality Gate"
      );
      if (lastAgent) {
        lastAgent.status = "active";
      } else {
        result[result.length - 1].status = "active";
      }
    }

    return result;
  }, [messages, loading]);

  if (nodes.length === 0) return null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* 流水线滚动区域 / Pipeline scroll area */}
      <div
        ref={pipelineRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-4"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 19px, #f0f0f0 19px, #f0f0f0 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #f0f0f0 19px, #f0f0f0 20px)",
          imageRendering: "pixelated",
        }}
      >
        <div className="flex items-start gap-0 min-w-max pb-4">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex items-start">
              {i > 0 && <Pipe active={node.status === "active"} />}
              <PipelineNode
                node={node}
                isStreaming={loading && i === nodes.length - 1 && node.status === "active"}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 实时对话组件 / LiveChat component ──
// 会话元数据类型 / Session metadata type
interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number; messageCount: number; }

function LiveChat() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const uploadedFileRef = useRef(uploadedFile);
  uploadedFileRef.current = uploadedFile;
  const currentSessionIdRef = useRef(currentSessionId);
  currentSessionIdRef.current = currentSessionId;

  // ── 会话管理：加载、保存、删除、切换会话 / Session management: load, save, delete, switch sessions ──
  useEffect(() => {
    fetch("/api/sessions").then((r) => r.json()).then((d) => { if (d.sessions) setSessions(d.sessions); }).catch(() => {});
  }, []);

  const refreshSessions = useCallback(async () => {
    try { const r = await fetch("/api/sessions"); const d = await r.json(); if (d.sessions) setSessions(d.sessions); } catch {}
  }, []);

  const saveSession = useCallback(async (msgs: ConversationMessage[], sessionId: string) => {
    if (msgs.length === 0 || !sessionId) return;
    const title = msgs.find((m) => m.isUser)?.content?.slice(0, 60) || "New Session";
    setSaving(true);
    try {
      await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, title, messages: msgs }) });
      await refreshSessions();
    } catch {}
    setSaving(false);
  }, [refreshSessions]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshSessions();
      if (id === currentSessionId) { setCurrentSessionId(""); setMessages([]); setUploadedFile(null); }
    } catch {}
  }, [currentSessionId, refreshSessions]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/sessions?id=${encodeURIComponent(id)}&load=1`);
      const d = await r.json();
      if (d.session?.messages) { setMessages(d.session.messages); setCurrentSessionId(id); setShowSessions(false); }
    } catch {}
  }, []);

  // ── 文件上传处理 / File upload handling ──
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["docx", "doc", "xlsx", "xls"].includes(ext)) { setError(`不支持的文件类型 .${ext}`); return; }
    setUploading(true); setError(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const data = await res.json();
      setUploadedFile({ name: file.name, content: data.content, type: data.type });
      setMessages((prev) => [...prev, { speaker: "System", emoji: "📎", content: `已上传：${file.name}`, isSystem: true }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, []);

  // ── 发送消息：调用 API 并处理 SSE 流式响应 / handleSend: call API and process SSE streaming response ──
  const handleSend = useCallback(async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setError(null); setLoading(true);
    const currentMessages = messagesRef.current;
    const currentUploadedFile = uploadedFileRef.current;
    const sessionId = currentSessionIdRef.current || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (!currentSessionIdRef.current) setCurrentSessionId(sessionId);

    const userMsg: ConversationMessage = { speaker: "YOU", emoji: "👤", content: currentUploadedFile ? `[${currentUploadedFile.name}] ${text}` : text, isUser: true };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const body: Record<string, unknown> = { message: text, history: currentMessages };
      if (currentUploadedFile) body.fileContext = currentUploadedFile.content;
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      // ── SSE 流式响应解析 / SSE streaming response parsing ──
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed?.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.streaming === "delta" && parsed.delta) {
                setMessages((prev) => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: last.content + parsed.delta }]; return prev; });
                continue;
              }
              if (parsed.streaming === "start") {
                setMessages((prev) => [...prev, { speaker: parsed.speaker || "Agent", emoji: parsed.emoji || "🤖", content: "", a2aLayer: parsed.a2aLayer, isSystem: false, isUser: false }]);
                continue;
              }
              if (parsed.streaming === "end") {
                setMessages((prev) => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: parsed.content || last.content, speaker: parsed.speaker || last.speaker, emoji: parsed.emoji || last.emoji, a2aLayer: parsed.a2aLayer || last.a2aLayer }]; return prev; });
                continue;
              }
              if (parsed.speaker && (parsed.content || parsed.fileUrl)) {
                setMessages((prev) => [...prev, { speaker: parsed.speaker, emoji: parsed.emoji || "🤖", content: parsed.content || "", a2aLayer: parsed.a2aLayer, isSystem: parsed.isSystem || false, isUser: false, fileUrl: parsed.fileUrl, downloadName: parsed.downloadName, fileFormat: parsed.fileFormat, toolName: parsed.toolName, toolAction: parsed.toolAction }]);
              }
            } catch {}
          }
        }
      } catch (e) { console.error("Stream read error:", e); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setMessages((prev) => [...prev, { speaker: "System", emoji: "⚠️", content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`, isSystem: true }]);
    } finally {
      setLoading(false);
      setMessages((prev) => { saveSession(prev, sessionId); return prev; });
    }
  }, [input, loading, saveSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); };
  const handleNewSession = () => { setMessages([]); setCurrentSessionId(""); setUploadedFile(null); setError(null); setShowSessions(false); };
  const formatDate = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; };

  return (
    <div className="flex flex-col h-[600px]">
      {/* 会话头部栏 / Session header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-ink bg-[#fafafa]">
        <button onClick={() => setShowSessions(!showSessions)} className="pixel-text text-[10px] tracking-[0.1em] text-ink/50 hover:text-ink transition-colors">
          {showSessions ? <><EmojiSVG emoji="✕" size={12} /> CLOSE</> : <><EmojiSVG emoji="☰" size={12} /> HISTORY</>}{sessions.length > 0 && <span className="text-ink/30 ml-0.5">({sessions.length})</span>}
        </button>
        <span className="text-ink/15">|</span>
        <button onClick={handleNewSession} className="pixel-text text-[10px] tracking-[0.1em] text-ink/50 hover:text-ink transition-colors">+ NEW</button>
        {currentSessionId && <><span className="text-ink/15">|</span><span className="pixel-text text-[9px] text-ink/30 truncate max-w-[140px]">{messages.find((m) => m.isUser)?.content?.slice(0, 30) || "SESSION"}</span></>}
        {saving && <span className="pixel-text text-[9px] text-ink/25 ml-auto">SAVING...</span>}
        {error && <span className="pixel-text text-[9px] text-red-500 ml-auto truncate max-w-[200px]">{error}</span>}
      </div>

      {/* 会话列表 / Session list */}
      {showSessions && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-b-2 border-ink bg-white overflow-y-auto max-h-[200px]">
          {sessions.length === 0 ? (
            <p className="pixel-text text-[10px] text-ink/25 text-center py-6">NO SAVED SESSIONS</p>
          ) : sessions.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-grid/50 last:border-0 hover:bg-[#fafafa] transition-colors cursor-pointer ${s.id === currentSessionId ? "bg-[#f5f5f5]" : ""}`}
              onClick={() => loadSession(s.id)}>
              <EmojiSVG emoji="💬" size={16} />
              <div className="flex-1 min-w-0">
                <p className="pixel-text text-[11px] text-ink/70 truncate">{s.title}</p>
                <p className="pixel-text text-[9px] text-ink/35 mt-0.5">{formatDate(s.updatedAt)} · {s.messageCount} msg</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="pixel-text text-[10px] text-ink/25 hover:text-red-500 transition-colors px-1"><EmojiSVG emoji="✕" size={10} /></button>
            </div>
          ))}
        </motion.div>
      )}

      {/* 流水线视图 / Pipeline view */}
      <PipelineView messages={messages} loading={loading} />

      {/* 输入区域 / Input */}
      <div className="border-t-2 border-ink p-4 bg-[#fafafa]">
        {uploadedFile && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <EmojiSVG emoji="📎" size={14} />
            <span className="pixel-text text-[10px] text-ink/60">{uploadedFile.name}</span>
            <span className="pixel-text text-[9px] text-ink/30 uppercase">{uploadedFile.type}</span>
            <button onClick={() => { setUploadedFile(null); setMessages((prev) => [...prev, { speaker: "System", emoji: "📎", content: `已移除：${uploadedFile.name}`, isSystem: true }]); }} className="pixel-text text-[10px] text-ink/40 hover:text-ink ml-auto"><EmojiSVG emoji="✕" size={10} /></button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".docx,.doc,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading}
            className="pixel-text text-[11px] bg-white border-2 border-ink px-3 py-2.5 hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ boxShadow: "2px 2px 0 #ccc" }}>{uploading ? "···" : <EmojiSVG emoji="📎" size={14} />}</button>
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={uploadedFile ? "分析这份文件..." : "输入任务，启动 Agent 流水线..."}
            className="flex-1 pixel-text text-xs bg-white border-2 border-ink px-4 py-2.5 outline-none focus:shadow-[2px_2px_0_#ccc] transition-shadow placeholder:text-ink/25" disabled={loading} />
          <button type="button" onClick={(e) => handleSend(e)} disabled={loading || !input.trim()}
            className="pixel-text text-[11px] tracking-[0.15em] uppercase bg-ink text-white px-6 py-2.5 hover:bg-white hover:text-ink border-2 border-ink transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ boxShadow: "2px 2px 0 #ccc" }}>SEND</button>
        </div>
      </div>
    </div>
  );
}

// ── 主组件：Agent 对话入口 / Main component: Agent conversation entry ──
export default function AgentConversation() {
  return (
    <section className="relative z-10 px-8 py-32 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} className="mb-16">
        <p className="pixel-text text-[10px] tracking-[0.3em] text-ink/50 uppercase mb-4">OmniMind Nexus Beta</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-ink mb-3">Agent 协作系统</h2>
        <p className="pixel-text text-sm text-ink/45 max-w-lg">输入任务，多 Agent 通过 A2A 协议协作完成。需要配置 OPENAI_API_KEY。</p>
      </motion.div>
      <div className="border-2 border-ink bg-white overflow-hidden" style={{ boxShadow: "4px 4px 0 #1a1a1a" }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-ink bg-[#fafafa]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 bg-green-600" style={{ imageRendering: "pixelated" }} />
            <div className="w-3 h-3 bg-grid-hover" style={{ imageRendering: "pixelated" }} />
            <div className="w-3 h-3 bg-grid" style={{ imageRendering: "pixelated" }} />
          </div>
          <span className="pixel-text text-[10px] tracking-[0.15em] text-ink/45 ml-2">a2a://live.omnimind.nexus</span>
          <span className="pixel-text text-[9px] text-green-700 ml-2">● LIVE</span>
        </div>
        <LiveChat />
      </div>
    </section>
  );
}