"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ConversationMessage } from "@/data/agents";
import sprites, { type SpriteData } from "@/data/sprites";
import EmojiSVG from "@/components/EmojiSVG";
import { useSettings } from "@/lib/settings";
import { evolvePersonality } from "@/lib/personality";

/* ═══════════════════════════════════════════════════════════════
   AgentScene — 2D 像素办公场景
   像素小人们工作协作
   ═══════════════════════════════════════════════════════════════ */

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

interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number; messageCount: number; }

// ── Agent 颜色 ──
const agentColors: Record<string, string> = {
  Router: "#1a1a1a", Planner: "#3b82f6", "架构师 Agent": "#8b5cf6",
  "编码 Agent": "#10b981", "测试 Agent": "#f59e0b", "文档 Agent": "#ec4899",
  "产品经理 Agent": "#f97316", "项目经理 Agent": "#6366f1", "安全 Agent": "#ef4444",
  "数据分析 Agent": "#06b6d4", "UI Agent": "#e11d48", "DevOps Agent": "#14b8a6",
  "仲裁组": "#0f0f0f", "Quality Gate": "#22c55e", "CEO Agent": "#a855f7",
  default: "#6b7280",
};
function getAgentColor(name: string): string { return agentColors[name] || agentColors.default; }

// ── 像素精灵 ──
function getSpriteForAgent(name: string): SpriteData { return sprites[name] || sprites.default; }

// ── 像素小人工厂 ──
function PixelWorker({ color, size = 32, anim = "idle" }: { color: string; size?: number; anim?: "idle" | "work" | "done" | "walk" }) {
  const bobClass = anim === "work" ? "animate-pixel-work" : anim === "walk" ? "animate-pixel-walk" : anim === "done" ? "animate-pixel-done" : "animate-pixel-idle";
  return (
    <div className={`relative ${bobClass}`} style={{ width: size, height: size, imageRendering: "pixelated" }}>
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
        <rect x="5" y="8" width="6" height="5" fill={color} shapeRendering="crispEdges" />
        <rect x="5" y="4" width="6" height="5" fill="#ffd5b8" shapeRendering="crispEdges" />
        <rect x="6" y="6" width="2" height="2" fill="#0f0f0f" shapeRendering="crispEdges" />
        <rect x="9" y="6" width="2" height="2" fill="#0f0f0f" shapeRendering="crispEdges" />
        <rect x="6" y="13" width="2" height="3" fill="#333" shapeRendering="crispEdges" />
        <rect x="9" y="13" width="2" height="3" fill="#333" shapeRendering="crispEdges" />
        <rect x="3" y="9" width="3" height="2" fill={color} shapeRendering="crispEdges" />
        <rect x="11" y="9" width="3" height="2" fill={color} shapeRendering="crispEdges" />
        <rect x="5" y="2" width="6" height="2" fill={color} shapeRendering="crispEdges" />
        {anim === "work" && (
          <>
            <rect x="4" y="10" width="1" height="1" fill="#f59e0b" opacity="0.8" />
            <rect x="12" y="11" width="1" height="1" fill="#f59e0b" opacity="0.6" />
            <rect x="3" y="8" width="1" height="1" fill="#fbbf24" opacity="0.4" />
          </>
        )}
        {anim === "done" && (
          <>
            <rect x="7" y="3" width="2" height="2" fill="#f59e0b" />
            <rect x="8" y="2" width="1" height="1" fill="#fbbf24" />
          </>
        )}
      </svg>
    </div>
  );
}

// ── 语音气泡 ──
function SpeechBubble({ text, x, y, visible }: { text: string; x: number; y: number; visible: boolean }) {
  const truncated = text.length > 80 ? text.slice(0, 80) + "..." : text;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="absolute z-30 pointer-events-none"
          style={{ left: x, top: y, maxWidth: 200 }}
        >
          <div className="relative border-2 border-[#0f0f0f] bg-white px-3 py-2">
            <p className="pixel-text text-[9px] text-ink/80 leading-relaxed whitespace-pre-wrap">{truncated}</p>
            <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent" style={{ borderTopColor: "#0f0f0f" }} />
            <div className="absolute -bottom-[6px] left-[5px] w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent" style={{ borderTopColor: "#fff" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── 粒子效果 ──
function Particle({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5"
      style={{ left: x, top: y, backgroundColor: "#f59e0b" }}
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 0, scale: 0, y: y - 20, x: x + (Math.random() - 0.5) * 20 }}
      transition={{ duration: 0.6 + Math.random() * 0.4 }}
    />
  );
}

// ── 状态点 ──
function StatusDot({ status }: { status: "waiting" | "active" | "done" | "error" }) {
  if (status === "waiting") return <span className="w-2 h-2 border border-[#0f0f0f] bg-white inline-block" />;
  if (status === "active") return <motion.span className="w-2 h-2 bg-green-500 inline-block" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />;
  if (status === "done") return <span className="w-2 h-2 bg-[#0f0f0f] inline-block" />;
  return <span className="w-2 h-2 bg-red-500 inline-block" />;
}

// ── 语法高亮函数 ──
function highlightCode(code: string, lang?: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // 关键字
  const keywords = /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|async|await|try|catch|throw|new|this|super|switch|case|break|continue|default|yield|typeof|instanceof|void|delete|in|of|enum|namespace|module|declare|abstract|public|private|protected|static|readonly|get|set|keyof|infer|never|unknown|any|boolean|string|number|symbol|null|undefined|true|false)\b/g;
  
  let highlighted = escaped
    // 字符串
    .replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, '<span style="color:#10b981">$&</span>')
    // 关键字
    .replace(keywords, '<span style="color:#8b5cf6">$1</span>')
    // 数字
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f59e0b">$1</span>')
    // 注释
    .replace(/(\/\/.*$)/gm, '<span style="color:#9ca3af">$1</span>')
    // 函数调用
    .replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span style="color:#3b82f6">$1</span>(')
    // HTML 标签
    .replace(/(&lt;\/?)(\w+)([^&]*&gt;)/g, '$1<span style="color:#ec4899">$2</span>$3');
  
  return highlighted;
}

function copyToClipboard(text: string): boolean {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch { return false; }
}

// ── 增强 Markdown 渲染（含代码高亮 + 复制按钮） ──
function EnhancedMarkdown({ text }: { text: string }) {
  const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set());

  const renderContent = useMemo(() => {
    const parts: Array<{ type: "html" | "code"; content: string; lang?: string; blockIdx?: number }> = [];
    let remaining = text;
    let blockIdx = 0;

    // 提取代码块
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIdx = 0;
    let match;
    while ((match = codeBlockRegex.exec(remaining)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: "html", content: remaining.slice(lastIdx, match.index) });
      }
      parts.push({ type: "code", lang: match[1] || undefined, content: match[2], blockIdx: blockIdx++ });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < remaining.length) {
      parts.push({ type: "html", content: remaining.slice(lastIdx) });
    }

    return parts.map((part, i) => {
      if (part.type === "code") {
        const idx = part.blockIdx!;
        const copied = copiedBlocks.has(idx);
        return (
          <div key={i} className="my-2 border-2 border-[#0f0f0f] bg-[#fafafa] overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1 border-b-2 border-[#e5e5e5] bg-[#f3f3f3]">
              <span className="pixel-text text-[8px] text-muted uppercase">{part.lang || "code"}</span>
              <button
                onClick={() => {
                  if (copyToClipboard(part.content)) {
                    setCopiedBlocks(prev => { const next = new Set(prev); next.add(idx); return next; });
                    setTimeout(() => setCopiedBlocks(prev => { const next = new Set(prev); next.delete(idx); return next; }), 2000);
                  }
                }}
                className="pixel-text text-[8px] text-muted hover:text-ink transition-colors flex items-center gap-1"
              >
                {copied ? "✓ 已复制" : "📋 复制"}
              </button>
            </div>
            <pre className="p-2 overflow-x-auto text-[9px] leading-relaxed pixel-text" style={{ fontFamily: "monospace" }}>
              <code dangerouslySetInnerHTML={{ __html: highlightCode(part.content, part.lang) }} />
            </pre>
          </div>
        );
      }
      const html = part.content
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code style='background:#f0f0f0;padding:1px 4px;border:1px solid #e0e0e0;font-family:monospace;font-size:0.9em'>$1</code>")
        .replace(/\n/g, "<br/>");
      return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }, [text, copiedBlocks]);

  return <>{renderContent}</>;
}

// ── Toast 通知系统 ──
interface Toast { id: number; message: string; type: "success" | "error" | "info"; }
let toastId = 0;

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-32 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`pointer-events-auto border-2 px-3 py-2 ${
              t.type === "success" ? "border-green-500 bg-green-50" :
              t.type === "error" ? "border-red-500 bg-red-50" :
              "border-[#0f0f0f] bg-white"
            }`}
          >
            <p className="pixel-text text-[10px]">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"} {t.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── 快捷键提示 ──
const SHORTCUTS: { key: string; desc: string }[] = [
  { key: "Ctrl+Enter", desc: "发送消息" },
  { key: "Ctrl+K", desc: "打开命令面板" },
  { key: "Ctrl+L", desc: "清空对话" },
  { key: "Ctrl+N", desc: "新建会话" },
  { key: "↑ ↓", desc: "输入历史" },
  { key: "Escape", desc: "关闭面板" },
  { key: "Ctrl+Shift+E", desc: "导出" },
  { key: "Ctrl+B", desc: "切换日志面板" },
];

// ═══════════════════════════════════════════════════════════════
// 主场景组件
// ═══════════════════════════════════════════════════════════════
export default function AgentScene() {
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages); messagesRef.current = messages;
  const uploadedFileRef = useRef(uploadedFile); uploadedFileRef.current = uploadedFile;
  const currentSessionIdRef = useRef(currentSessionId); currentSessionIdRef.current = currentSessionId;
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // ── Toast 辅助 ──
  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── 场景状态 ──
  const [activeAgents, setActiveAgents] = useState<Map<string, { status: "waiting" | "active" | "done" | "error"; content: string }>>(new Map());
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

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
    try { await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await refreshSessions(); if (id === currentSessionId) { setCurrentSessionId(""); setMessages([]); setUploadedFile(null); setActiveAgents(new Map()); } } catch {}
  }, [currentSessionId, refreshSessions]);
  const loadSession = useCallback(async (id: string) => {
    try { const r = await fetch(`/api/sessions?id=${encodeURIComponent(id)}&load=1`); const d = await r.json(); if (d.session?.messages) { setMessages(d.session.messages); setCurrentSessionId(id); } } catch {}
  }, []);

  // ── 文件上传 ──
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["docx", "doc", "xlsx", "xls"].includes(ext)) { addToast(`不支持的文件类型 .${ext}`, "error"); return; }
    setUploading(true);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const data = await res.json();
      setUploadedFile({ name: file.name, content: data.content, type: data.type });
      setMessages(prev => [...prev, { speaker: "System", emoji: "📎", content: `已上传：${file.name}`, isSystem: true }]);
      addToast("文件上传成功", "success");
    } catch (err) { addToast(err instanceof Error ? err.message : "上传失败", "error"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, [addToast]);

  // ── 发送消息 ──
  const handleSend = useCallback(async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    const text = input.trim(); if (!text || loading) return;
    
    // 保存到输入历史
    setInputHistory(prev => [text, ...prev.filter(h => h !== text)].slice(0, 50));
    setHistoryIdx(-1);
    
    setInput(""); setError(null); setLoading(true);
    const sessionId = currentSessionIdRef.current || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setCurrentSessionId(sessionId);

    const userMsg: ConversationMessage = { speaker: "You", emoji: "👤", content: text, isUser: true };
    const newMsgs = [...messagesRef.current, userMsg];
    setMessages(newMsgs); messagesRef.current = newMsgs;

    const newActive = new Map<string, { status: "waiting" | "active" | "done" | "error"; content: string }>();
    setActiveAgents(newActive);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messagesRef.current.filter(m => !m.isUser).slice(-20),
          fileContext: uploadedFileRef.current ? { name: uploadedFileRef.current.name, content: uploadedFileRef.current.content, type: uploadedFileRef.current.type } : null,
          settings: { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model, tavilyApiKey: settings.tavilyApiKey },
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) { setLoading(false); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      let currentAgent = "";

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
            if (parsed.speaker && parsed.content !== undefined) {
              if (parsed.speaker !== currentAgent) {
                currentAgent = parsed.speaker;
                setActiveAgents(prev => {
                  const next = new Map(prev);
                  next.set(currentAgent, { status: "active", content: "" });
                  return next;
                });
                const idx = messagesRef.current.length;
                setParticles(prev => [...prev, { id: Date.now() + Math.random(), x: 100 + idx * 40, y: 80 }]);
                setTimeout(() => setParticles(prev => prev.slice(1)), 1000);
              }

              setActiveAgents(prev => {
                const next = new Map(prev);
                next.set(parsed.speaker, { status: "active", content: parsed.content });
                return next;
              });

              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === parsed.speaker && !last.isUser && !last.isSystem) {
                  return [...prev.slice(0, -1), { ...last, content: parsed.content }];
                }
                return [...prev, { speaker: parsed.speaker, emoji: parsed.emoji || "🤖", content: parsed.content, a2aLayer: parsed.a2aLayer }];
              });
            }
          } catch {}
        }
      }

      setActiveAgents(prev => {
        const next = new Map(prev);
        next.forEach((v, k) => next.set(k, { ...v, status: "done" }));
        return next;
      });
      addToast("协作完成", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "请求失败", "error");
    }
    setLoading(false);
    saveSession(messagesRef.current, sessionId);
  }, [input, loading, settings, saveSession, addToast]);

  // ── 清除消息 ──
  const handleClear = useCallback(() => { setMessages([]); setActiveAgents(new Map()); setUploadedFile(null); setCurrentSessionId(""); setError(null); addToast("已清空", "info"); }, [addToast]);

  // ── 斜杠命令 ──
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val === "/") setSlashOpen(true);
    else if (slashOpen && !val.startsWith("/")) setSlashOpen(false);
  }, [slashOpen]);

  const handleSlashSelect = useCallback((cmd: string) => {
    setInput(cmd + " "); setSlashOpen(false); inputRef.current?.focus();
    if (cmd === "/clear") { handleClear(); setInput(""); }
    else if (cmd === "/new") { handleClear(); }
    else if (cmd === "/agents") router.push("/agents");
    else if (cmd === "/settings") router.push("/settings");
    else if (cmd === "/dashboard") router.push("/dashboard");
    else if (cmd === "/workspace") router.push("/workspace");
    else if (cmd === "/debate") router.push("/debate");
    else if (cmd === "/topology") router.push("/topology");
    else if (cmd === "/kb") router.push("/kb");
    else if (cmd === "/export") { handleExport(); }
    else if (cmd === "/help") { addToast("快捷键: Ctrl+Enter 发送, Ctrl+K 命令, ↑↓ 历史, Esc 关闭", "info"); }
  }, [handleClear, router, addToast]);

  // ── 导出 ──
  const handleExport = useCallback(async () => {
    if (messages.length === 0) { addToast("没有可导出的内容", "info"); return; }
    try {
      const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "conversation.md"; a.click();
        URL.revokeObjectURL(url);
        addToast("导出成功", "success");
      }
    } catch { addToast("导出失败", "error"); }
  }, [messages, addToast]);

  // ── 键盘快捷键 ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      // Ctrl+Enter: 发送
      if (ctrl && e.key === "Enter") {
        e.preventDefault();
        handleSend();
        return;
      }
      // Ctrl+K: 打开命令面板
      if (ctrl && e.key === "k") {
        e.preventDefault();
        setSlashOpen(prev => !prev);
        if (!slashOpen) { setInput("/"); inputRef.current?.focus(); }
        return;
      }
      // Ctrl+L: 清空
      if (ctrl && e.key === "l") {
        e.preventDefault();
        handleClear();
        return;
      }
      // Ctrl+N: 新建
      if (ctrl && e.key === "n") {
        e.preventDefault();
        handleClear();
        return;
      }
      // Ctrl+B: 切换日志面板
      if (ctrl && e.key === "b") {
        e.preventDefault();
        setRightPanelOpen(prev => !prev);
        return;
      }
      // Ctrl+Shift+E: 导出
      if (ctrl && e.shiftKey && e.key === "E") {
        e.preventDefault();
        handleExport();
        return;
      }
      // Escape: 关闭面板
      if (e.key === "Escape") {
        if (slashOpen) { setSlashOpen(false); setInput(""); return; }
      }
      // ↑ ↓: 输入历史
      if (e.key === "ArrowUp" && document.activeElement === inputRef.current) {
        e.preventDefault();
        if (inputHistory.length > 0) {
          const newIdx = historyIdx < inputHistory.length - 1 ? historyIdx + 1 : historyIdx;
          setHistoryIdx(newIdx);
          setInput(inputHistory[newIdx] || "");
        }
        return;
      }
      if (e.key === "ArrowDown" && document.activeElement === inputRef.current) {
        e.preventDefault();
        if (historyIdx > 0) {
          const newIdx = historyIdx - 1;
          setHistoryIdx(newIdx);
          setInput(inputHistory[newIdx] || "");
        } else if (historyIdx === 0) {
          setHistoryIdx(-1);
          setInput("");
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSend, handleClear, handleExport, slashOpen, inputHistory, historyIdx]);

  // ── 活跃 Agent 列表 ──
  const activeAgentList = useMemo(() => Array.from(activeAgents.entries()), [activeAgents]);
  const agentNames = Array.from(activeAgents.keys());
  const sceneWidth = 800;
  const sceneHeight = 420;
  const centerX = sceneWidth / 2;
  const centerY = sceneHeight / 2 - 20;

  const agentPositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number }> = new Map();
    const count = agentNames.length;
    if (count === 0) return positions;
    const radius = Math.min(280, count * 45);
    agentNames.forEach((name, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius - 40;
      const y = centerY + Math.sin(angle) * radius - 14;
      positions.set(name, { x: Math.max(20, Math.min(sceneWidth - 100, x)), y: Math.max(10, Math.min(sceneHeight - 60, y)) });
    });
    return positions;
  }, [agentNames, centerX, centerY]);

  const agentMessages = useMemo(() => messages.filter(m => !m.isUser && !m.isSystem), [messages]);
  const systemMessages = useMemo(() => messages.filter(m => m.isSystem), [messages]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 48px)" }}>
      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} />

      {/* 主区域：场景 + 右侧面板 */}
      <div className="flex flex-1 min-h-0">
        {/* ── 场景 ── */}
        <div className="flex-1 relative overflow-hidden" style={{ background: "#f8f9fa" }}>
          {/* 点阵背景 */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            opacity: 0.4,
          }} />

          {/* 中心项目板 */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: centerY - 30 }}>
            <div className="border-2 border-[#0f0f0f] bg-white px-4 py-2">
              <p className="pixel-text text-[8px] text-muted uppercase tracking-[0.15em] text-center">Project Board</p>
              <p className="pixel-text text-[10px] text-ink font-bold text-center mt-0.5">
                {loading ? "⚡ 工作中..." : activeAgentList.length === 0 ? "就绪" : `${activeAgentList.length} Agent 协作中`}
              </p>
            </div>
          </div>

          {/* 连接线 */}
          {agentNames.length >= 2 && (
            <svg className="absolute inset-0 pointer-events-none z-5" style={{ width: "100%", height: "100%" }}>
              {agentNames.map((name, i) => {
                const next = agentNames[(i + 1) % agentNames.length];
                const from = agentPositions.get(name);
                const to = agentPositions.get(next);
                if (!from || !to) return null;
                return (
                  <g key={i}>
                    <line x1={from.x + 40} y1={from.y + 28} x2={to.x + 40} y2={to.y + 28} stroke="#0f0f0f" strokeWidth="1" strokeDasharray="4 3" opacity="0.15" />
                    {loading && (
                      <motion.circle r="2" fill="#f59e0b" animate={{ offsetDistance: ["0%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ offsetPath: `path("M${from.x + 40},${from.y + 28} L${to.x + 40},${to.y + 28}")` }} />
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* 粒子效果 */}
          <AnimatePresence>
            {particles.map(p => <Particle key={p.id} x={p.x} y={p.y} />)}
          </AnimatePresence>

          {/* Agent 桌子 + 小人 + 气泡 */}
          <AnimatePresence>
            {agentNames.map((name) => {
              const pos = agentPositions.get(name);
              const agent = activeAgents.get(name);
              const color = getAgentColor(name);
              if (!pos) return null;

              const anim = agent?.status === "active" ? "work" : agent?.status === "done" ? "done" : "idle";
              const showBubble = agent?.status === "active" && (agent?.content?.length ?? 0) > 0;

              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="absolute"
                  style={{ left: pos.x, top: pos.y }}
                >
                  <div className="relative" style={{ width: 80, height: 56 }}>
                    <div className="absolute inset-0 border-2 border-[#0f0f0f] bg-white">
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-7 border-2 border-[#0f0f0f] bg-[#1a1a1a] flex items-center justify-center">
                        <div className="w-3 h-2" style={{ backgroundColor: agent?.status === "active" ? "#22c55e" : "#444" }} />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10" style={{ transform: "translateY(-8px)" }}>
                      <PixelWorker color={color} size={24} anim={anim} />
                    </div>
                  </div>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
                    <span className="badge-pixel text-[7px] px-1.5 py-0.5">{name.slice(0, 8)}</span>
                  </div>
                  {showBubble && <SpeechBubble text={agent?.content || ""} x={-60} y={-70} visible={showBubble} />}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 空状态 */}
          {agentNames.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4 opacity-30">🏢</div>
                <p className="pixel-text text-sm text-muted">输入任务，Agent 小人们将在此办公</p>
                <p className="pixel-text text-[10px] text-muted/60 mt-1">快捷键 Ctrl+K 打开命令面板，↑↓ 浏览历史</p>
              </div>
            </div>
          )}

          {/* 加载中 */}
          {loading && agentNames.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div className="w-8 h-8 border-2 border-[#0f0f0f] mx-auto mb-3" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ background: "linear-gradient(45deg, #fff 50%, #0f0f0f 50%)" }} />
                <p className="pixel-text text-sm text-muted">正在召集 Agent 团队...</p>
              </div>
            </div>
          )}
        </div>

        {/* ── 右侧面板：消息日志 ── */}
        {rightPanelOpen && (
          <div className="w-80 shrink-0 border-l-2 border-[#0f0f0f] bg-white flex flex-col h-full">
            <div className="nav-bar border-b-2 border-[#0f0f0f] px-3 py-2 flex items-center justify-between">
              <span className="pixel-text text-[9px] uppercase tracking-[0.12em] text-muted">消息日志</span>
              <div className="flex items-center gap-1">
                <button onClick={handleExport} className="pixel-text text-[8px] text-muted hover:text-ink" title="导出 (Ctrl+Shift+E)">📄</button>
                <button onClick={() => setRightPanelOpen(false)} className="pixel-text text-[10px] text-muted hover:text-ink ml-1">✕</button>
              </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto pixel-scrollbar p-3 space-y-2">
              {agentMessages.length === 0 && systemMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="pixel-text text-[10px] text-muted">暂无消息</p>
                  <div className="mt-3 space-y-1">
                    {SHORTCUTS.slice(0, 4).map(s => (
                      <p key={s.key} className="pixel-text text-[8px] text-muted/60">{s.key}: {s.desc}</p>
                    ))}
                  </div>
                </div>
              )}

              {systemMessages.map((msg, i) => (
                <div key={`sys-${i}`} className="p-2 border-2 border-[#e5e5e5] bg-white">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px]">{msg.emoji}</span>
                    <span className="pixel-text text-[8px] text-muted uppercase">{msg.speaker}</span>
                  </div>
                  <div className="pixel-text text-[9px] text-ink/70 leading-relaxed">
                    <EnhancedMarkdown text={msg.content} />
                  </div>
                </div>
              ))}

              {agentMessages.map((msg, i) => {
                const color = getAgentColor(msg.speaker);
                return (
                  <div key={`agent-${i}`} className="p-2 border-2 border-[#0f0f0f] bg-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2" style={{ backgroundColor: color }} />
                      <span className="pixel-text text-[8px] text-ink font-bold uppercase">{msg.speaker}</span>
                      {msg.a2aLayer && <span className="badge-pixel text-[6px] ml-auto">{msg.a2aLayer}</span>}
                    </div>
                    <div className="pixel-text text-[9px] text-ink/70 leading-relaxed">
                      <EnhancedMarkdown text={msg.content} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 活跃 Agent 状态 */}
            {activeAgentList.length > 0 && (
              <div className="border-t-2 border-[#0f0f0f] p-3">
                <p className="pixel-text text-[8px] text-muted uppercase tracking-[0.1em] mb-2">Agent 状态</p>
                <div className="space-y-1.5">
                  {activeAgentList.map(([name, agent]) => (
                    <div key={name} className="flex items-center gap-2">
                      <StatusDot status={agent.status} />
                      <div className="w-2 h-2" style={{ backgroundColor: getAgentColor(name) }} />
                      <span className="pixel-text text-[9px] text-ink truncate">{name}</span>
                      <span className="pixel-text text-[8px] text-muted ml-auto">
                        {agent.status === "active" ? "工作中" : agent.status === "done" ? "完成" : agent.status === "error" ? "错误" : "等待"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 快捷操作工具栏 ── */}
      <div className="border-t-2 border-[#e5e5e5] bg-[#fafafa] px-3 py-1 flex items-center gap-2 flex-wrap">
        <span className="pixel-text text-[8px] text-muted shrink-0">快捷:</span>
        <button onClick={handleClear} className="pixel-text text-[8px] text-muted hover:text-ink transition-colors" title="Ctrl+L">✕ 清空</button>
        <span className="text-[#e0e0e0] text-[8px]">|</span>
        <button onClick={handleExport} className="pixel-text text-[8px] text-muted hover:text-ink transition-colors" title="Ctrl+Shift+E">📄 导出</button>
        <span className="text-[#e0e0e0] text-[8px]">|</span>
        <button onClick={() => { setRightPanelOpen(prev => !prev); addToast(rightPanelOpen ? "日志面板已关闭" : "日志面板已打开", "info"); }} className="pixel-text text-[8px] text-muted hover:text-ink transition-colors" title="Ctrl+B">
          {rightPanelOpen ? "📋 隐藏日志" : "📋 显示日志"}
        </button>
        <span className="text-[#e0e0e0] text-[8px]">|</span>
        <span className="pixel-text text-[8px] text-muted">Ctrl+K 命令</span>
        <span className="text-[#e0e0e0] text-[8px]">|</span>
        <span className="pixel-text text-[8px] text-muted">↑↓ 历史</span>
        {saving && <span className="pixel-text text-[8px] text-muted ml-auto">保存中...</span>}
      </div>

      {/* ── 底部输入区 ── */}
      <div className="border-t-2 border-[#0f0f0f] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* 斜杠命令面板 */}
          <AnimatePresence>
            {slashOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mb-2 border-2 border-[#0f0f0f] bg-white p-2 grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                {SLASH_COMMANDS.map(cmd => (
                  <button key={cmd.cmd} onClick={() => handleSlashSelect(cmd.cmd)} className="text-left px-2 py-1.5 hover:bg-[#f3f3f3] transition-colors flex items-center gap-1.5">
                    <span className="text-[10px]">{cmd.emoji}</span>
                    <div>
                      <span className="pixel-text text-[8px] text-ink block">{cmd.cmd}</span>
                      <span className="pixel-text text-[7px] text-muted">{cmd.desc}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 输入框 */}
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".docx,.doc,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} className="btn-pixel text-[9px] px-2 py-1.5" title="上传文件">
              {uploading ? "..." : "📎"}
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); }}
                placeholder='输入任务，如 "帮我写一个 Python 爬虫" — Ctrl+Enter 发送'
                disabled={loading}
                className="input-pixel pr-10"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.div className="w-2 h-2 bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
                </div>
              )}
            </div>

            <button onClick={handleSend} disabled={loading || !input.trim()} className="btn-pixel-dark">
              {loading ? "工作中" : "发送"}
            </button>

            {!rightPanelOpen && (
              <button onClick={() => setRightPanelOpen(true)} className="btn-pixel text-[9px] px-2 py-1.5" title="显示日志 (Ctrl+B)">
                📋
              </button>
            )}
          </div>

          {/* 已上传文件 */}
          {uploadedFile && (
            <div className="mt-2 flex items-center gap-2">
              <span className="badge-pixel text-[8px]">📎 {uploadedFile.name}</span>
              <button onClick={() => setUploadedFile(null)} className="pixel-text text-[8px] text-muted hover:text-danger">移除</button>
            </div>
          )}
        </div>
      </div>

      {/* ── 会话管理（底部） ── */}
      <div className="border-t-2 border-[#e5e5e5] bg-[#fafafa] px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
        <span className="pixel-text text-[8px] text-muted shrink-0">会话:</span>
        {sessions.slice(0, 8).map(s => (
          <button
            key={s.id}
            onClick={() => loadSession(s.id)}
            className={`px-2 py-0.5 text-[8px] pixel-text border border-[#d1d5db] hover:border-[#0f0f0f] transition-colors truncate max-w-[120px] ${s.id === currentSessionId ? "border-[#0f0f0f] bg-[#f3f3f3]" : "bg-white"}`}
          >
            {s.title?.slice(0, 15) || "Untitled"}
          </button>
        ))}
        <button onClick={handleClear} className="pixel-text text-[8px] text-muted hover:text-danger ml-auto shrink-0" title="Ctrl+L">清空</button>
        {saving && <span className="pixel-text text-[8px] text-muted">保存中...</span>}
      </div>
    </div>
  );
}