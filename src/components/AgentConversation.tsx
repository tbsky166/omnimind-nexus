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

// ── 斜杠命令 ──
const SLASH_COMMANDS = [
  { cmd: "/clear", desc: "清空当前对话", emoji: "✕" },
  { cmd: "/new", desc: "新建会话", emoji: "✚" },
  { cmd: "/export", desc: "导出为 Markdown", emoji: "📄" },
  { cmd: "/agents", desc: "查看 Agent 注册表", emoji: "🤖" },
  { cmd: "/settings", desc: "打开设置", emoji: "⚙️" },
  { cmd: "/dashboard", desc: "打开仪表盘", emoji: "📊" },
  { cmd: "/workspace", desc: "打开工作区", emoji: "📦" },
  { cmd: "/debate", desc: "Agent 辩论赛", emoji: "⚔" },
  { cmd: "/topology", desc: "协作拓扑图", emoji: "🌐" },
  { cmd: "/kb", desc: "知识库问答", emoji: "📚" },
  { cmd: "/help", desc: "显示帮助", emoji: "❓" },
];

// ── 调色板 ──
const agentColors: Record<string, { bg: string; border: string; text: string; primary: string; skin: string }> = {
  Router:         { bg: "#f8f8f8", border: "#0f0f0f", text: "#0f0f0f", primary: "#0f0f0f", skin: "#ffd5b8" },
  Planner:        { bg: "#faf8f0", border: "#0f0f0f", text: "#0f0f0f", primary: "#0f0f0f", skin: "#ffd5b8" },
  "仲裁组":        { bg: "#f8f5fa", border: "#0f0f0f", text: "#0f0f0f", primary: "#0f0f0f", skin: "#ffd5b8" },
  "Quality Gate":  { bg: "#f0faf4", border: "#0f0f0f", text: "#0f0f0f", primary: "#0f0f0f", skin: "#ffd5b8" },
  default:         { bg: "#fafafa", border: "#0f0f0f", text: "#0f0f0f", primary: "#0f0f0f", skin: "#ffd5b8" },
};
function getColor(name: string) { return agentColors[name] || agentColors.default; }

function getSpriteForAgent(name: string): SpriteData { return sprites[name] || sprites.default; }
function getAgentPalette(name: string, basePalette: Record<string, string>): Record<string, string> {
  if (sprites[name]) return basePalette;
  const clr = getColor(name);
  return { ...basePalette, p: clr.primary, s: "#888", o: clr.skin, e: "#fff", w: "#fff" };
}

// ── PixelArtSVG ──
function PixelArtSVG({ rows, size, palette }: { rows: string[]; size: number; palette: Record<string, string> }) {
  const n = rows.length; const cellW = size / n; const cellH = size / n;
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

// ── PixelSprite ──
function PixelSprite({ name, size = 32, active = false }: { name: string; size?: number; active?: boolean }) {
  const sprite = getSpriteForAgent(name);
  const palette = getAgentPalette(name, sprite.palette);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size + 6, height: size + 6, imageRendering: "pixelated", border: "2px solid #0f0f0f", background: active ? "#f0fff4" : "#ffffff" }}>
      <PixelArtSVG rows={sprite.rows} size={size} palette={palette} />
      {active && (
        <motion.div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white" animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
      )}
    </div>
  );
}

// ── 工具图标 ──
function DocxIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" fill="#0f0f0f" />
      <rect x="4" y="1" width="8" height="2" fill="#fff" opacity="0.15" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.5" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.35" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">DOC</text>
    </svg>
  );
}
function XlsxIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" fill="#0f0f0f" />
      <rect x="4" y="1" width="8" height="2" fill="#fff" opacity="0.15" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.5" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.35" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">XLS</text>
    </svg>
  );
}
function FileIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" fill="#0f0f0f" />
      <rect x="4" y="1" width="8" height="2" fill="#fff" opacity="0.15" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.35" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.25" />
      <rect x="5" y="10" width="5" height="1" fill="#fff" opacity="0.2" />
    </svg>
  );
}
function ToolIcon({ type, size = 18 }: { type: string; size?: number }) {
  if (type === "xlsx") return <XlsxIcon size={size} />;
  if (type === "docx") return <DocxIcon size={size} />;
  return <FileIcon size={size} />;
}

function StatusDot({ status }: { status: "waiting" | "active" | "done" | "error" }) {
  if (status === "waiting") return <span className="w-2 h-2 border border-[#0f0f0f] bg-white" />;
  if (status === "active") return <motion.span className="w-2 h-2 bg-green-500" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />;
  if (status === "done") return <span className="w-2 h-2 bg-[#0f0f0f]" />;
  return <span className="w-2 h-2 bg-red-500" />;
}

function SimpleMarkdown({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style='background:#f0f0f0;padding:0 4px;font-family:inherit'>$1</code>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ═══════════════════════════════════════════════════════════════
// 主组件
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
  const messagesRef = useRef(messages); messagesRef.current = messages;
  const uploadedFileRef = useRef(uploadedFile); uploadedFileRef.current = uploadedFile;
  const currentSessionIdRef = useRef(currentSessionId); currentSessionIdRef.current = currentSessionId;

  // ── 会话管理 ──
  useEffect(() => { fetch("/api/sessions").then(r => r.json()).then(d => { if (d.sessions) setSessions(d.sessions); }).catch(() => {}); }, []);
  const refreshSessions = useCallback(async () => { try { const r = await fetch("/api/sessions"); const d = await r.json(); if (d.sessions) setSessions(d.sessions); } catch {} }, []);
  const saveSession = useCallback(async (msgs: ConversationMessage[], sessionId: string) => {
    if (msgs.length === 0 || !sessionId) return;
    setSaving(true);
    try { await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, title: msgs.find(m => m.isUser)?.content?.slice(0, 60) || "New Session", messages: msgs }) }); await refreshSessions(); } catch {}
    setSaving(false);
  }, [refreshSessions]);
  const deleteSession = useCallback(async (id: string) => {
    try { await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await refreshSessions(); if (id === currentSessionId) { setCurrentSessionId(""); setMessages([]); setUploadedFile(null); } } catch {}
  }, [currentSessionId, refreshSessions]);
  const loadSession = useCallback(async (id: string) => {
    try { const r = await fetch(`/api/sessions?id=${encodeURIComponent(id)}&load=1`); const d = await r.json(); if (d.session?.messages) { setMessages(d.session.messages); setCurrentSessionId(id); } } catch {}
  }, []);

  // ── 文件上传 ──
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["docx", "doc", "xlsx", "xls"].includes(ext)) { setError(`不支持的文件类型 .${ext}`); return; }
    setUploading(true); setError(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const data = await res.json();
      setUploadedFile({ name: file.name, content: data.content, type: data.type });
      setMessages(prev => [...prev, { speaker: "System", emoji: "\uD83D\uDCCE", content: `已上传：${file.name}`, isSystem: true }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, []);

  // ── 发送消息 ──
  const handleSend = useCallback(async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    const text = input.trim(); if (!text || loading) return;
    setInput(""); setError(null); setLoading(true);
    const sessionId = currentSessionIdRef.current || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (!currentSessionIdRef.current) setCurrentSessionId(sessionId);
    const userMsg: ConversationMessage = { speaker: "YOU", emoji: "\uD83D\uDC64", content: uploadedFileRef.current ? `[${uploadedFileRef.current.name}] ${text}` : text, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    try {
      const body: Record<string, unknown> = { message: text, history: messagesRef.current, settings: { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model, tavilyApiKey: settings.tavilyApiKey, enableSwarm: settings.enableSwarm, enableEvolution: settings.enableEvolution, enableKnowledgeGraph: settings.enableKnowledgeGraph, enableMetacognition: settings.enableMetacognition } };
      if (uploadedFileRef.current) body.fileContext = uploadedFileRef.current.content;
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
      const reader = res.body?.getReader(); if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder(); let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim(); if (!trimmed?.startsWith("data: ")) continue;
            const data = trimmed.slice(6); if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.streaming === "delta" && parsed.delta) { setMessages(prev => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: last.content + parsed.delta }]; return prev; }); continue; }
              if (parsed.streaming === "start") { setMessages(prev => [...prev, { speaker: parsed.speaker || "Agent", emoji: parsed.emoji || "\uD83E\uDD16", content: "", a2aLayer: parsed.a2aLayer, isSystem: false, isUser: false }]); continue; }
              if (parsed.streaming === "end") { setMessages(prev => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: parsed.content || last.content, speaker: parsed.speaker || last.speaker, emoji: parsed.emoji || last.emoji, a2aLayer: parsed.a2aLayer || last.a2aLayer }]; return prev; }); continue; }
              if (parsed.type === "diversity") { try { const { type, ...d } = parsed; localStorage.setItem("last_diversity_metrics", JSON.stringify(d)); } catch {} continue; }
              if (parsed.type === "personality_evolve") { try { evolvePersonality(parsed.agentName, { type: parsed.feedbackType, intensity: parsed.intensity }); } catch {} continue; }
              if (parsed.speaker && (parsed.content || parsed.fileUrl)) { setMessages(prev => [...prev, { speaker: parsed.speaker, emoji: parsed.emoji || "\uD83E\uDD16", content: parsed.content || "", a2aLayer: parsed.a2aLayer, isSystem: parsed.isSystem || false, isUser: false, fileUrl: parsed.fileUrl, downloadName: parsed.downloadName, fileFormat: parsed.fileFormat, toolName: parsed.toolName, toolAction: parsed.toolAction }]); }
            } catch {}
          }
        }
      } catch (e) { console.error("Stream read error:", e); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setMessages(prev => [...prev, { speaker: "System", emoji: "\u26A0\uFE0F", content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`, isSystem: true }]);
    } finally {
      setLoading(false);
      setMessages(prev => {
        saveSession(prev, sessionId);
        const agentStats = new Map<string, { tools: number; searches: number; files: number; success: boolean }>();
        for (const msg of prev) { if (msg.isUser) continue; const name = msg.speaker; if (!agentStats.has(name)) agentStats.set(name, { tools: 0, searches: 0, files: 0, success: true }); const s = agentStats.get(name)!; if (msg.fileUrl) s.files++; if (msg.toolName === "web_search") s.searches++; if (msg.toolName) s.tools++; if (msg.content?.includes("Error")) s.success = false; }
        for (const [name, stats] of agentStats) { if (!["Router", "Planner", "仲裁组", "Quality Gate", "System"].includes(name)) trackAgentRun(name, stats.success, stats.tools, stats.searches, stats.files); }
        return prev;
      });
    }
  }, [input, loading, saveSession]);

  const handleExport = async () => {
    if (messages.length === 0) return;
    try {
      const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, sessionId: currentSessionId }) });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `report-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "导出失败"); }
  };

  const filteredCommands = input.startsWith("/") && slashOpen ? SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.split(" ")[0])) : [];
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
      case "/help": setMessages(prev => [...prev, { speaker: "System", emoji: "\u2753", isSystem: true, content: SLASH_COMMANDS.map(c => `**${c.cmd}** \u2014 ${c.desc}`).join("\n") }]); setInput(""); setSlashOpen(false); return true;
      default: return false;
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { if (input.startsWith("/") && executeSlashCommand(input)) { e.preventDefault(); return; } handleSend(e); } if (e.key === "Escape") setSlashOpen(false); };
  const handleNewSession = () => { setMessages([]); setCurrentSessionId(""); setUploadedFile(null); setError(null); };
  const formatDate = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; };
  useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [messages]);

  // ── Agent 节点列表 ──
  const agentNodes = useMemo(() => {
    const nodes: { id: string; name: string; emoji: string; layer: string; status: "waiting" | "active" | "done" | "error" }[] = [];
    const seen = new Set<string>();
    for (const msg of messages) { if (msg.isUser) continue; const nodeId = `${msg.speaker}_${msg.a2aLayer || ""}`; if (seen.has(nodeId)) continue; seen.add(nodeId); nodes.push({ id: nodeId, name: msg.speaker, emoji: msg.emoji || (msg.isSystem ? "\u2699\uFE0F" : "\uD83E\uDD16"), layer: msg.a2aLayer || "", status: "done" }); }
    if (loading && nodes.length > 0) { const last = [...nodes].reverse().find(n => !["Router", "Planner", "YOU", "仲裁组", "Quality Gate"].includes(n.name)); if (last) last.status = "active"; else nodes[nodes.length - 1].status = "active"; }
    return nodes;
  }, [messages, loading]);

  return (
    <section className="relative z-10">
      <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* 标题 */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-8 h-8 border-2 border-[#0f0f0f] flex items-center justify-center">
              <span className="pixel-text text-[10px] font-bold">OM</span>
            </div>
            <div>
              <p className="pixel-label">OMNIMIND NEXUS</p>
              <h1 className="pixel-h1 mt-0.5">Agent 协作</h1>
            </div>
          </div>
          <p className="pixel-body max-w-lg">输入任务，多 Agent 自动组队协作。需要配置 API Key。</p>
        </motion.div>

        {/* 三栏主体 */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
          className="flex border-2 border-[#0f0f0f] bg-white"
          style={{ height: "calc(100vh - 200px)", minHeight: 560 }}
        >
          {/* ═══ 左侧栏：Agent 列表 ═══ */}
          <div className="w-[220px] flex-shrink-0 border-r-2 border-[#0f0f0f] bg-white flex flex-col">
            <div className="px-4 py-3 border-b-2 border-[#0f0f0f]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#0f0f0f]" />
                  <div className="w-2 h-2 border border-[#0f0f0f]" />
                  <div className="w-2 h-2 border border-[#0f0f0f]" />
                </div>
                <span className="pixel-label text-[8px] ml-1">AGENTS</span>
                <span className="ml-auto pixel-text text-[9px] text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500" /> 在线
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {agentNodes.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="pixel-text text-[10px] text-[#8a8a8a]">暂无活跃 Agent</p>
                  <p className="pixel-text text-[8px] text-[#b0b0b0] mt-1">输入任务启动协作</p>
                </div>
              ) : (
                <div className="space-y-0 px-3">
                  {agentNodes.map((node) => {
                    const isSystem = ["Router", "Planner", "仲裁组", "Quality Gate"].includes(node.name);
                    return (
                      <motion.div key={node.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-2.5 px-2.5 py-2 border border-transparent ${node.status === "active" ? "border-[#0f0f0f] bg-[#fafafa]" : "hover:border-[#e5e5e5]"}`}
                      >
                        <PixelSprite name={node.name} size={28} active={node.status === "active"} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {node.emoji && <EmojiSVG emoji={node.emoji} size={10} />}
                            <span className="pixel-text text-[9px] text-[#0f0f0f] font-medium truncate">{node.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusDot status={node.status} />
                            <span className={`pixel-text text-[7px] ${node.status === "active" ? "text-green-600" : node.status === "done" ? "text-[#0f0f0f]" : "text-[#b0b0b0]"}`}>
                              {node.status === "waiting" ? "WAIT" : node.status === "active" ? "RUN" : node.status === "done" ? "DONE" : "ERR"}
                            </span>
                            {node.layer && <span className="pixel-text text-[7px] text-[#b0b0b0]">{node.layer}</span>}
                          </div>
                        </div>
                        {isSystem && <span className="badge-pixel text-[7px]">{node.name === "Router" ? "路由" : node.name === "Planner" ? "规划" : node.name === "仲裁组" ? "仲裁" : "质检"}</span>}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-t-2 border-[#0f0f0f]">
              <p className="pixel-text text-[8px] text-[#8a8a8a]">
                {agentNodes.length} AGENT · {agentNodes.filter(n => n.status === "done").length} DONE
                {loading && <span className="text-green-600 ml-1">· RUNNING</span>}
              </p>
            </div>
          </div>

          {/* ═══ 中间栏：输出 ═══ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 工具栏 */}
            <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-[#0f0f0f] bg-white flex-shrink-0">
              <button onClick={handleNewSession} className="pixel-text text-[10px] text-[#8a8a8a] hover:text-[#0f0f0f] transition-colors">+ 新建</button>
              <span className="text-[#d1d5db]">|</span>
              <button onClick={() => setShowReasoningTree(!showReasoningTree)} className={`pixel-text text-[10px] transition-colors ${showReasoningTree ? "text-[#0f0f0f] font-bold" : "text-[#8a8a8a] hover:text-[#0f0f0f]"}`}>TREE</button>
              <span className="text-[#d1d5db]">|</span>
              <button onClick={handleExport} disabled={messages.length === 0} className="pixel-text text-[10px] text-[#8a8a8a] hover:text-[#0f0f0f] transition-colors disabled:opacity-30 flex items-center gap-1">
                <EmojiSVG emoji="\uD83D\uDCC4" size={12} /> EXPORT
              </button>
              {currentSessionId && <><span className="text-[#d1d5db]">|</span><span className="pixel-text text-[9px] text-[#8a8a8a] truncate max-w-[180px]">{messages.find(m => m.isUser)?.content?.slice(0, 30) || "会话"}</span></>}
              {saving && <span className="pixel-text text-[9px] text-[#8a8a8a] ml-auto">SAVING...</span>}
              {error && <span className="pixel-text text-[9px] text-red-600 ml-auto truncate max-w-[200px] bg-red-50 px-2 py-0.5">{error}</span>}
              <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`ml-auto pixel-text text-[10px] px-2 py-1 transition-colors ${rightPanelOpen ? "bg-[#f0f0f0] text-[#0f0f0f]" : "text-[#8a8a8a] hover:text-[#0f0f0f]"}`}>
                {rightPanelOpen ? "HIDE" : "HISTORY"}
              </button>
            </div>

            {/* 推理树 */}
            <AnimatePresence>
              {showReasoningTree && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b-2 border-[#0f0f0f]">
                  <ReasoningTree messages={messages} loading={loading} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 消息区 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-5xl mb-4 opacity-20">✦</div>
                  <p className="pixel-text text-sm text-[#8a8a8a] mb-2">开始一个新的协作任务</p>
                  <p className="pixel-text text-xs text-[#b0b0b0] max-w-xs">在下方输入你的需求，多 Agent 将自动协作完成</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.isUser;
                  const isStreaming = loading && i === messages.length - 1 && !msg.isUser && !msg.fileUrl;
                  return (
                    <motion.div key={`${msg.speaker}_${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} ${msg.isSystem ? "p-3 border-2 border-[#e5e5e5] bg-white" : ""}`}
                    >
                      {!isUser && <PixelSprite name={msg.speaker} size={28} />}
                      <div className={`max-w-[70%] ${isUser ? "text-right" : ""}`}>
                        <div className={`flex items-center gap-1.5 mb-1 ${isUser ? "justify-end" : ""}`}>
                          {isUser ? (
                            <span className="pixel-text text-[9px] text-[#8a8a8a]">YOU</span>
                          ) : (
                            <>
                              {msg.emoji && <EmojiSVG emoji={msg.emoji} size={10} />}
                              <span className="pixel-text text-[9px] text-[#0f0f0f] font-medium">{msg.speaker}</span>
                              {msg.a2aLayer && <span className="pixel-text text-[7px] text-[#b0b0b0]">{msg.a2aLayer}</span>}
                              {msg.isSystem && <span className="badge-pixel text-[7px]">系统</span>}
                            </>
                          )}
                        </div>
                        {msg.content && (
                          <div className={`px-4 py-3 text-sm leading-relaxed ${
                            isUser ? "bg-[#0f0f0f] text-white" : "border-2 border-[#0f0f0f] bg-white"
                          }`}>
                            <div className="pixel-text text-[11px] whitespace-pre-wrap break-words">
                              <SimpleMarkdown text={msg.content} />
                              {isStreaming && <motion.span className="inline-block w-[2px] h-[11px] bg-[#0f0f0f] ml-0.5 align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />}
                            </div>
                          </div>
                        )}
                        {msg.fileUrl && (
                          <a href={msg.fileUrl} download={msg.downloadName} className="mt-1.5 flex items-center gap-2 px-3 py-2 border-2 border-[#0f0f0f] bg-white hover:bg-[#0f0f0f] hover:text-white transition-all duration-150 group cursor-pointer">
                            <ToolIcon type={msg.fileFormat || "file"} size={18} />
                            <div className="flex-1 min-w-0">
                              <p className="pixel-text text-[9px] text-[#0f0f0f] group-hover:text-white truncate font-medium">{msg.downloadName}</p>
                              <p className="pixel-text text-[7px] text-[#8a8a8a] group-hover:text-white/60">{msg.toolAction || "DOWNLOAD"}</p>
                            </div>
                          </a>
                        )}
                      </div>
                      {isUser && (
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-[34px] h-[34px] border-2 border-[#0f0f0f] bg-white flex items-center justify-center">
                            <span className="pixel-text text-[9px] font-bold text-[#0f0f0f]">YOU</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-[42px]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <motion.div key={i} className="w-1.5 h-1.5 bg-[#0f0f0f]" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />)}
                  </div>
                  <span className="pixel-text text-[9px] text-[#8a8a8a]">Agent 思考中...</span>
                </motion.div>
              )}
            </div>

            {/* 输入区 */}
            <div className="border-t-2 border-[#0f0f0f] p-4 bg-white relative flex-shrink-0">
              {filteredCommands.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 border-2 border-[#0f0f0f] bg-white max-h-[240px] overflow-y-auto z-30 mx-2">
                  {filteredCommands.map(c => (
                    <button key={c.cmd} onClick={() => executeSlashCommand(c.cmd)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f0f0f0] transition-colors text-left border-b border-[#e5e5e5] last:border-0">
                      <EmojiSVG emoji={c.emoji} size={16} />
                      <span className="pixel-text text-xs text-[#0f0f0f] font-bold w-24">{c.cmd}</span>
                      <span className="pixel-text text-[10px] text-[#8a8a8a]">{c.desc}</span>
                    </button>
                  ))}
                </div>
              )}
              {uploadedFile && (
                <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 border-2 border-[#0f0f0f] bg-[#fafafa]">
                  <EmojiSVG emoji="\uD83D\uDCCE" size={14} />
                  <span className="pixel-text text-[10px] text-[#0f0f0f]">{uploadedFile.name}</span>
                  <span className="pixel-text text-[9px] text-[#8a8a8a] uppercase">{uploadedFile.type}</span>
                  <button onClick={() => { setUploadedFile(null); setMessages(prev => [...prev, { speaker: "System", emoji: "\uD83D\uDCCE", content: `已移除：${uploadedFile.name}`, isSystem: true }]); }} className="pixel-text text-[10px] text-[#8a8a8a] hover:text-[#0f0f0f] ml-auto">
                    <EmojiSVG emoji="\u2715" size={10} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept=".docx,.doc,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} className="btn-pixel flex-shrink-0">
                  {uploading ? "..." : <EmojiSVG emoji="\uD83D\uDCCE" size={14} />}
                </button>
                <input ref={inputRef} type="text" value={input} onChange={e => { setInput(e.target.value); setSlashOpen(e.target.value.startsWith("/")); }} onKeyDown={handleKeyDown}
                  placeholder={uploadedFile ? "分析这份文件..." : "输入任务，或输入 / 查看命令..."}
                  className="flex-1 pixel-text text-xs bg-white border-2 border-[#d1d5db] px-4 py-2.5 outline-none focus:border-[#0f0f0f] transition-colors placeholder:text-[#b0b0b0]" disabled={loading} />
                <button type="button" onClick={e => handleSend(e)} disabled={loading || !input.trim()}
                  className="btn-pixel-dark flex-shrink-0">发送</button>
              </div>
            </div>
          </div>

          {/* ═══ 右侧栏：历史 ═══ */}
          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                className="w-[260px] flex-shrink-0 border-l-2 border-[#0f0f0f] bg-white flex flex-col overflow-hidden"
              >
                <div className="px-4 py-3 border-b-2 border-[#0f0f0f] flex items-center justify-between">
                  <span className="pixel-label text-[8px]">历史会话</span>
                  <span className="pixel-text text-[9px] text-[#8a8a8a]">{sessions.length} 条</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <p className="pixel-text text-[10px] text-[#8a8a8a]">暂无保存的会话</p>
                      <p className="pixel-text text-[8px] text-[#b0b0b0] mt-1">完成协作后自动保存</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(s => (
                        <div key={s.id} onClick={() => loadSession(s.id)}
                          className={`group flex items-start gap-2.5 px-3 py-2.5 mx-2 cursor-pointer transition-colors ${s.id === currentSessionId ? "bg-[#f0f0f0]" : "hover:bg-[#fafafa]"}`}
                        >
                          <EmojiSVG emoji="💬" size={14} />
                          <div className="flex-1 min-w-0">
                            <p className="pixel-text text-[10px] text-[#0f0f0f] truncate leading-tight">{s.title}</p>
                            <p className="pixel-text text-[8px] text-[#8a8a8a] mt-0.5">{formatDate(s.updatedAt)} · {s.messageCount} msg</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }} className="pixel-text text-[9px] text-[#8a8a8a] hover:text-red-600 transition-colors px-0.5 opacity-0 group-hover:opacity-100">
                            <EmojiSVG emoji="\u2715" size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-t-2 border-[#0f0f0f]">
                  <button onClick={handleNewSession} className="w-full pixel-text text-[10px] text-[#8a8a8a] hover:text-[#0f0f0f] transition-colors py-1.5 hover:bg-[#f0f0f0]">+ 新建会话</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}