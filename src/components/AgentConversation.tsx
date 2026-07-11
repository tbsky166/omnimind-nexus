"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ConversationMessage } from "@/data/agents";
import sprites, { type SpriteData } from "@/data/sprites";
import EmojiSVG from "@/components/EmojiSVG";
import { useSettings } from "@/lib/settings";
import { evolvePersonality } from "@/lib/personality";
import { trackAgentRun } from "@/lib/achievements";
import ReasoningTree from "@/components/ReasoningTree";

// ── 斜杠命令 / Slash commands ──
const SLASH_COMMANDS = [
  { cmd: "/clear", desc: "清空当前对话", emoji: "✕" },
  { cmd: "/new", desc: "新建会话", emoji: "✚" },
  { cmd: "/export", desc: "导出为 Markdown", emoji: "📄" },
  { cmd: "/agents", desc: "查看 Agent 注册表", emoji: "🤖" },
  { cmd: "/settings", desc: "打开设置", emoji: "⚙️" },
  { cmd: "/dashboard", desc: "打开仪表盘", emoji: "📊" },
  { cmd: "/workspace", desc: "打开工作区", emoji: "📦" },
  { cmd: "/debate", desc: "Agent 辩论赛", emoji: "⚔️" },
  { cmd: "/topology", desc: "协作拓扑图", emoji: "🌐" },
  { cmd: "/kb", desc: "知识库问答", emoji: "📚" },
  { cmd: "/help", desc: "显示帮助", emoji: "❓" },
];

// ── 像素调色板 / Pixel palette ──
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

function getSpriteForAgent(name: string): SpriteData {
  return sprites[name] || sprites.default;
}

function getAgentPalette(name: string, basePalette: Record<string, string>): Record<string, string> {
  if (sprites[name]) return basePalette;
  const clr = getColor(name);
  return { ...basePalette, p: clr.primary, s: clr.secondary, o: clr.skin, e: "#fff", w: "#fff" };
}

// ── 像素艺术 SVG / PixelArtSVG ──
function PixelArtSVG({ rows, size, palette }: { rows: string[]; size: number; palette: Record<string, string> }) {
  const n = rows.length;
  const cellW = size / n;
  const cellH = size / n;
  const rects: { x: number; y: number; fill: string }[] = [];
  for (let r = 0; r < n; r++) {
    const line = rows[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch !== " " && palette[ch]) rects.push({ x: c * cellW, y: r * cellH, fill: palette[ch] });
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated", display: "block" }}>
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={cellW} height={cellH} fill={r.fill} shapeRendering="crispEdges" />)}
    </svg>
  );
}

// ── 像素精灵 / PixelSprite ──
function PixelSprite({ name, size = 32, active = false }: { name: string; size?: number; active?: boolean }) {
  const sprite = getSpriteForAgent(name);
  const palette = getAgentPalette(name, sprite.palette);
  return (
    <div
      className="relative flex items-center justify-center rounded-lg flex-shrink-0"
      style={{
        width: size + 6, height: size + 6, imageRendering: "pixelated",
        border: "2px solid #1a1a1a",
        background: active ? "#ecfdf5" : "#fafbfc",
        boxShadow: active ? "0 0 0 2px rgba(16,185,129,0.25), 0 0 10px rgba(16,185,129,0.1)" : "1px 1px 0 #e5e7eb",
        transition: "all 0.3s",
      }}
    >
      <PixelArtSVG rows={sprite.rows} size={size} palette={palette} />
      {active && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white"
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ── 工具图标 / Tool icons ──
function DocxIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#185abd" />
      <rect x="3" y="0" width="7" height="3" fill="#4a8df0" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.6" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.4" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">DOC</text>
    </svg>
  );
}
function XlsxIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#107c41" />
      <rect x="3" y="0" width="7" height="3" fill="#4ac48b" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.6" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.4" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">XLS</text>
    </svg>
  );
}
function FileIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#555" />
      <rect x="3" y="0" width="7" height="3" fill="#888" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.4" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.3" />
    </svg>
  );
}
function ToolIcon({ type, size = 18 }: { type: string; size?: number }) {
  if (type === "xlsx") return <XlsxIcon size={size} />;
  if (type === "docx") return <DocxIcon size={size} />;
  return <FileIcon size={size} />;
}

// ── 状态指示器 / Status indicator ──
function StatusDot({ status }: { status: "waiting" | "active" | "done" | "error" }) {
  if (status === "waiting") return <span className="w-2 h-2 rounded-full bg-gray-200" />;
  if (status === "active") return <motion.span className="w-2 h-2 rounded-full bg-green-500" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />;
  if (status === "done") return <span className="w-2 h-2 rounded-full bg-green-500" />;
  return <span className="w-2 h-2 rounded-full bg-red-500" />;
}

// ── 格式化消息内容的 Markdown / Simple markdown renderer ──
function SimpleMarkdown({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-gray-100 px-1 rounded text-[0.8em] font-mono'>$1</code>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ═══════════════════════════════════════════════════════════════
// 主组件 / Main component
// ═══════════════════════════════════════════════════════════════
interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number; messageCount: number; }

export default function AgentConversation() {
  const { settings } = useSettings();
  const router = useRouter();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showReasoningTree, setShowReasoningTree] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const uploadedFileRef = useRef(uploadedFile);
  uploadedFileRef.current = uploadedFile;
  const currentSessionIdRef = useRef(currentSessionId);
  currentSessionIdRef.current = currentSessionId;

  // ── 会话管理 / Session management ──
  useEffect(() => {
    fetch("/api/sessions").then(r => r.json()).then(d => { if (d.sessions) setSessions(d.sessions); }).catch(() => {});
  }, []);

  const refreshSessions = useCallback(async () => {
    try { const r = await fetch("/api/sessions"); const d = await r.json(); if (d.sessions) setSessions(d.sessions); } catch {}
  }, []);

  const saveSession = useCallback(async (msgs: ConversationMessage[], sessionId: string) => {
    if (msgs.length === 0 || !sessionId) return;
    const title = msgs.find(m => m.isUser)?.content?.slice(0, 60) || "New Session";
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
      if (d.session?.messages) { setMessages(d.session.messages); setCurrentSessionId(id); }
    } catch {}
  }, []);

  // ── 文件上传 / File upload ──
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
      setMessages(prev => [...prev, { speaker: "System", emoji: "📎", content: `已上传：${file.name}`, isSystem: true }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, []);

  // ── 发送消息 / Send message ──
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
    setMessages(prev => [...prev, userMsg]);

    try {
      const body: Record<string, unknown> = { message: text, history: currentMessages, settings: { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model } };
      if (currentUploadedFile) body.fileContext = currentUploadedFile.content;
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
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
                setMessages(prev => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: last.content + parsed.delta }]; return prev; });
                continue;
              }
              if (parsed.streaming === "start") {
                setMessages(prev => [...prev, { speaker: parsed.speaker || "Agent", emoji: parsed.emoji || "🤖", content: "", a2aLayer: parsed.a2aLayer, isSystem: false, isUser: false }]);
                continue;
              }
              if (parsed.streaming === "end") {
                setMessages(prev => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: parsed.content || last.content, speaker: parsed.speaker || last.speaker, emoji: parsed.emoji || last.emoji, a2aLayer: parsed.a2aLayer || last.a2aLayer }]; return prev; });
                continue;
              }
              if (parsed.type === "diversity") {
                try { const { type, ...d } = parsed; localStorage.setItem("last_diversity_metrics", JSON.stringify(d)); } catch {}
                continue;
              }
              if (parsed.type === "personality_evolve") {
                try { evolvePersonality(parsed.agentName, { type: parsed.feedbackType, intensity: parsed.intensity }); } catch {}
                continue;
              }
              if (parsed.speaker && (parsed.content || parsed.fileUrl)) {
                setMessages(prev => [...prev, { speaker: parsed.speaker, emoji: parsed.emoji || "🤖", content: parsed.content || "", a2aLayer: parsed.a2aLayer, isSystem: parsed.isSystem || false, isUser: false, fileUrl: parsed.fileUrl, downloadName: parsed.downloadName, fileFormat: parsed.fileFormat, toolName: parsed.toolName, toolAction: parsed.toolAction }]);
              }
            } catch {}
          }
        }
      } catch (e) { console.error("Stream read error:", e); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setMessages(prev => [...prev, { speaker: "System", emoji: "⚠️", content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`, isSystem: true }]);
    } finally {
      setLoading(false);
      setMessages(prev => {
        saveSession(prev, sessionId);
        // 追踪成就：统计每个 Agent 的运行数据
        const agentStats = new Map<string, { tools: number; searches: number; files: number; success: boolean }>();
        for (const msg of prev) {
          if (msg.isUser) continue;
          const name = msg.speaker;
          if (!agentStats.has(name)) agentStats.set(name, { tools: 0, searches: 0, files: 0, success: true });
          const s = agentStats.get(name)!;
          if (msg.fileUrl) s.files++;
          if (msg.toolName === "web_search") s.searches++;
          if (msg.toolName) s.tools++;
          if (msg.content?.includes("Error")) s.success = false;
        }
        for (const [name, stats] of agentStats) {
          if (!["Router", "Planner", "仲裁组", "Quality Gate", "System"].includes(name)) {
            trackAgentRun(name, stats.success, stats.tools, stats.searches, stats.files);
          }
        }
        return prev;
      });
    }
  }, [input, loading, saveSession]);

  // ── 导出 / Export ──
  const handleExport = async () => {
    if (messages.length === 0) return;
    try {
      const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, sessionId: currentSessionId }) });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `report-${Date.now()}.md`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "导出失败"); }
  };

  // ── 斜杠命令 / Slash commands ──
  const filteredCommands = input.startsWith("/") && slashOpen
    ? SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.split(" ")[0]))
    : [];
  const executeSlashCommand = (cmd: string): boolean => {
    const c = cmd.trim().split(" ")[0];
    switch (c) {
      case "/clear": setMessages([]); setInput(""); setSlashOpen(false); return true;
      case "/new": handleNewSession(); setInput(""); setSlashOpen(false); return true;
      case "/export": handleExport(); setInput(""); setSlashOpen(false); return true;
      case "/agents": router.push("/agents"); return true;
      case "/settings": router.push("/settings"); return true;
      case "/dashboard": router.push("/dashboard"); return true;
      case "/workspace": router.push("/workspace"); return true;
      case "/debate": router.push("/debate"); return true;
      case "/topology": router.push("/topology"); return true;
      case "/kb": router.push("/kb"); return true;
      case "/help":
        setMessages(prev => [...prev, { speaker: "System", emoji: "❓", isSystem: true, content: SLASH_COMMANDS.map(c => `**${c.cmd}** — ${c.desc}`).join("\n") }]);
        setInput(""); setSlashOpen(false); return true;
      default: return false;
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (input.startsWith("/") && executeSlashCommand(input)) { e.preventDefault(); return; }
      handleSend(e);
    }
    if (e.key === "Escape") setSlashOpen(false);
  };
  const handleNewSession = () => { setMessages([]); setCurrentSessionId(""); setUploadedFile(null); setError(null); };
  const formatDate = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; };

  // ── 自动滚动 / Auto-scroll ──
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ── 从消息构建 Agent 节点列表 / Build agent nodes from messages ──
  const agentNodes = useMemo(() => {
    const nodes: { id: string; name: string; emoji: string; layer: string; status: "waiting" | "active" | "done" | "error" }[] = [];
    const seen = new Set<string>();

    for (const msg of messages) {
      if (msg.isUser) continue;
      const name = msg.speaker;
      const layer = msg.a2aLayer || "";
      const nodeId = `${name}_${layer}`;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);
      const isSystem = msg.isSystem || false;
      nodes.push({
        id: nodeId, name, emoji: msg.emoji || (isSystem ? "⚙️" : "🤖"), layer,
        status: "done",
      });
    }

    if (loading && nodes.length > 0) {
      const lastAgent = [...nodes].reverse().find(n => !["Router", "Planner", "YOU", "仲裁组", "Quality Gate"].includes(n.name));
      if (lastAgent) lastAgent.status = "active";
      else nodes[nodes.length - 1].status = "active";
    }

    return nodes;
  }, [messages, loading]);

  // ── 过滤出非系统消息用于聊天视图 / Filter non-system messages for chat view ──
  const chatMessages = useMemo(() => {
    return messages.filter(m => !m.isUser || true);
  }, [messages]);

  return (
    <section className="relative z-10 gradient-hero">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* 标题区 */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-6">
          <p className="pixel-text text-[10px] tracking-[0.3em] text-ink/40 uppercase mb-2">OmniMind Nexus 测试版</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-[-0.02em] text-ink">Agent 协作系统</h2>
        </motion.div>

        {/* 三栏主体 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-0 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm"
          style={{ height: "calc(100vh - 180px)", minHeight: 560 }}
        >
          {/* ═══ 左侧边栏：智能体列表 / Left sidebar: agent list ═══ */}
          <div className="w-[220px] flex-shrink-0 border-r border-gray-100 bg-[#fafbfc] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
                <span className="pixel-text text-[9px] text-ink/40 tracking-[0.1em] uppercase ml-1">Agents</span>
                <span className="ml-auto pixel-text text-[9px] text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  在线
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {agentNodes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="pixel-text text-[10px] text-ink/25">暂无活跃 Agent</p>
                  <p className="pixel-text text-[9px] text-ink/15 mt-1">输入任务启动协作</p>
                </div>
              ) : (
                <div className="space-y-0.5 px-2">
                  {agentNodes.map((node) => {
                    const isSystem = ["Router", "Planner", "仲裁组", "Quality Gate"].includes(node.name);
                    return (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-default ${
                          node.status === "active" ? "bg-green-50/80" : "hover:bg-gray-50"
                        }`}
                      >
                        <PixelSprite name={node.name} size={28} active={node.status === "active"} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {node.emoji && <EmojiSVG emoji={node.emoji} size={10} />}
                            <span className="pixel-text text-[9px] text-ink/80 font-medium truncate">{node.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusDot status={node.status} />
                            <span className={`pixel-text text-[7px] ${node.status === "active" ? "text-green-600" : node.status === "done" ? "text-green-500" : "text-ink/25"}`}>
                              {node.status === "waiting" ? "等待" : node.status === "active" ? "执行中" : node.status === "done" ? "完成" : "错误"}
                            </span>
                            {node.layer && <span className="pixel-text text-[7px] text-ink/25">{node.layer}</span>}
                          </div>
                        </div>
                        {isSystem && (
                          <span className="badge badge-outline text-[7px]">{node.name === "Router" ? "路由" : node.name === "Planner" ? "规划" : node.name === "仲裁组" ? "仲裁" : "质检"}</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* 左侧底部统计 */}
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="pixel-text text-[8px] text-ink/25">
                {agentNodes.length} Agent · {agentNodes.filter(n => n.status === "done").length} 完成
                {loading && <span className="text-green-600 ml-1">· 运行中</span>}
              </p>
            </div>
          </div>

          {/* ═══ 中间：智能体输出 / Center: agent output ═══ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 顶部工具栏 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
              <button onClick={handleNewSession} className="pixel-text text-[10px] text-ink/50 hover:text-ink transition-colors">+ 新建</button>
              <span className="text-gray-200">|</span>
              <button
                onClick={() => setShowReasoningTree(!showReasoningTree)}
                className={`pixel-text text-[10px] transition-colors ${showReasoningTree ? "text-purple-600 font-medium" : "text-ink/50 hover:text-ink"}`}
              >
                🌳 推理树
              </button>
              <span className="text-gray-200">|</span>
              <button onClick={handleExport} disabled={messages.length === 0} className="pixel-text text-[10px] text-ink/50 hover:text-ink transition-colors disabled:opacity-30 flex items-center gap-1">
                <EmojiSVG emoji="📄" size={12} /> 导出
              </button>
              {currentSessionId && <><span className="text-gray-200">|</span><span className="pixel-text text-[9px] text-ink/30 truncate max-w-[180px]">{messages.find(m => m.isUser)?.content?.slice(0, 30) || "会话"}</span></>}
              {saving && <span className="pixel-text text-[9px] text-ink/25 ml-auto">保存中...</span>}
              {error && <span className="pixel-text text-[9px] text-red-500 ml-auto truncate max-w-[200px] bg-red-50 px-2 py-0.5 rounded">{error}</span>}
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className={`ml-auto pixel-text text-[10px] px-2 py-1 rounded transition-colors ${rightPanelOpen ? "bg-gray-100 text-ink/60" : "text-ink/40 hover:text-ink"}`}
              >
                {rightPanelOpen ? "隐藏历史" : "历史"}
              </button>
            </div>

            {/* 推理树面板 */}
            <AnimatePresence>
              {showReasoningTree && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-gray-100"
                >
                  <ReasoningTree messages={messages} loading={loading} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 聊天消息区 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-3 opacity-30">🤖</div>
                  <p className="pixel-text text-sm text-ink/25 mb-1">开始一个新的协作任务</p>
                  <p className="pixel-text text-xs text-ink/15">在下方输入你的需求，多 Agent 将自动协作</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => {
                  const isUser = msg.isUser;
                  const isSystem = msg.isSystem || false;
                  const isStreaming = loading && i === chatMessages.length - 1 && !msg.isUser && !msg.fileUrl;
                  const clr = getColor(msg.speaker);

                  return (
                    <motion.div
                      key={`${msg.speaker}_${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-3 ${isUser ? "justify-end" : ""}`}
                    >
                      {!isUser && (
                        <div className="flex-shrink-0 mt-0.5">
                          <PixelSprite name={msg.speaker} size={28} />
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isUser ? "order-first" : ""}`}>
                        {/* 发送者名称 */}
                        <div className={`flex items-center gap-1.5 mb-1 ${isUser ? "justify-end" : ""}`}>
                          {isUser ? (
                            <span className="pixel-text text-[9px] text-ink/40">YOU</span>
                          ) : (
                            <>
                              {msg.emoji && <EmojiSVG emoji={msg.emoji} size={10} />}
                              <span className="pixel-text text-[9px] text-ink/50 font-medium">{msg.speaker}</span>
                              {msg.a2aLayer && <span className="pixel-text text-[7px] text-ink/25">{msg.a2aLayer}</span>}
                              {isSystem && <span className="badge badge-outline text-[7px]">系统</span>}
                            </>
                          )}
                        </div>

                        {/* 消息气泡 */}
                        {msg.content && (
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isUser
                                ? "bg-ink text-white rounded-br-md"
                                : isSystem
                                ? "bg-[#fafbfc] border border-gray-100 text-ink/60 rounded-bl-md"
                                : "bg-white border border-gray-200 text-ink/80 rounded-bl-md shadow-sm"
                            }`}
                          >
                            <div className="pixel-text text-[11px] whitespace-pre-wrap break-words">
                              <SimpleMarkdown text={msg.content} />
                              {isStreaming && (
                                <motion.span className="inline-block w-[2px] h-[11px] bg-ink/60 ml-0.5 align-middle rounded-sm" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* 文件下载卡片 */}
                        {msg.fileUrl && (
                          <a
                            href={msg.fileUrl}
                            download={msg.downloadName}
                            className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-ink hover:text-white transition-all duration-200 group cursor-pointer shadow-sm"
                          >
                            <ToolIcon type={msg.fileFormat || "file"} size={18} />
                            <div className="flex-1 min-w-0">
                              <p className="pixel-text text-[9px] text-ink/60 group-hover:text-white/70 truncate font-medium">{msg.downloadName}</p>
                              <p className="pixel-text text-[7px] text-ink/30 group-hover:text-white/40">{msg.toolAction || "DOWNLOAD"}</p>
                            </div>
                          </a>
                        )}
                      </div>
                      {isUser && (
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-[34px] h-[34px] rounded-lg bg-ink flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">YOU</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              {/* 加载指示器 */}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-11">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                  <span className="pixel-text text-[9px] text-ink/25">Agent 思考中...</span>
                </motion.div>
              )}
            </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-100 p-3 bg-white relative flex-shrink-0">
              {filteredCommands.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 border border-gray-200 bg-white max-h-[240px] overflow-y-auto z-30 rounded-t-xl shadow-lg mx-2">
                  {filteredCommands.map(c => (
                    <button key={c.cmd} onClick={() => executeSlashCommand(c.cmd)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
                      <EmojiSVG emoji={c.emoji} size={16} />
                      <span className="pixel-text text-xs text-ink font-bold w-24">{c.cmd}</span>
                      <span className="pixel-text text-[10px] text-ink/40">{c.desc}</span>
                    </button>
                  ))}
                </div>
              )}
              {uploadedFile && (
                <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-blue-50 rounded-lg">
                  <EmojiSVG emoji="📎" size={14} />
                  <span className="pixel-text text-[10px] text-ink/60">{uploadedFile.name}</span>
                  <span className="pixel-text text-[9px] text-blue-500 uppercase font-medium">{uploadedFile.type}</span>
                  <button onClick={() => { setUploadedFile(null); setMessages(prev => [...prev, { speaker: "System", emoji: "📎", content: `已移除：${uploadedFile.name}`, isSystem: true }]); }} className="pixel-text text-[10px] text-ink/40 hover:text-ink ml-auto"><EmojiSVG emoji="✕" size={10} /></button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept=".docx,.doc,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} className="btn-pixel flex-shrink-0">
                  {uploading ? "···" : <EmojiSVG emoji="📎" size={14} />}
                </button>
                <input
                  ref={inputRef} type="text" value={input}
                  onChange={e => { setInput(e.target.value); setSlashOpen(e.target.value.startsWith("/")); }}
                  onKeyDown={handleKeyDown}
                  placeholder={uploadedFile ? "分析这份文件..." : "输入任务，或输入 / 查看命令..."}
                  className="flex-1 pixel-text text-xs bg-white border-2 border-gray-200 px-4 py-2.5 rounded-lg outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all placeholder:text-gray-300"
                  disabled={loading}
                />
                <button type="button" onClick={e => handleSend(e)} disabled={loading || !input.trim()}
                  className="pixel-text text-[11px] tracking-[0.15em] uppercase bg-ink text-white px-6 py-2.5 rounded-lg hover:bg-ink-soft transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 font-medium">
                  发送
                </button>
              </div>
            </div>
          </div>

          {/* ═══ 右侧边栏：历史会话 / Right sidebar: history ═══ */}
          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="w-[260px] flex-shrink-0 border-l border-gray-100 bg-[#fafbfc] flex flex-col overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="pixel-text text-[10px] text-ink/40 tracking-[0.1em] uppercase">历史会话</span>
                  <span className="pixel-text text-[9px] text-ink/25">{sessions.length} 条</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="pixel-text text-[10px] text-ink/25">暂无保存的会话</p>
                      <p className="pixel-text text-[9px] text-ink/15 mt-1">完成协作后自动保存</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(s => (
                        <div
                          key={s.id}
                          onClick={() => loadSession(s.id)}
                          className={`group flex items-start gap-2.5 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors ${
                            s.id === currentSessionId ? "bg-blue-50/80" : "hover:bg-gray-100/60"
                          }`}
                        >
                          <EmojiSVG emoji="💬" size={14} />
                          <div className="flex-1 min-w-0">
                            <p className="pixel-text text-[10px] text-ink/70 truncate leading-tight">{s.title}</p>
                            <p className="pixel-text text-[8px] text-ink/35 mt-0.5">{formatDate(s.updatedAt)} · {s.messageCount} msg</p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                            className="opacity-0 group-hover:opacity-100 pixel-text text-[9px] text-ink/25 hover:text-red-500 transition-all px-0.5"
                          >
                            <EmojiSVG emoji="✕" size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-gray-100">
                  <button onClick={handleNewSession} className="w-full pixel-text text-[10px] text-ink/50 hover:text-ink transition-colors py-1.5 rounded-lg hover:bg-gray-100/60">
                    + 新建会话
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}