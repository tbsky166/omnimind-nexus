"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import EmojiSVG from "@/components/EmojiSVG";
import { useSettings } from "@/lib/settings";

interface KBDoc {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: number;
}

interface Source {
  title: string;
  score: number;
}

export default function KnowledgeBasePage() {
  const { settings } = useSettings();
  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadText, setUploadText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");

  // 问答状态 / Q&A state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [querying, setQuerying] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const decoderRef = useRef(new TextDecoder());

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (!uploadText.trim() || !settings.apiKey) return;
    setUploading(true);
    setUploadResult("");
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: uploadText,
          title: uploadTitle || `文档 ${new Date().toLocaleString("zh-CN")}`,
          settings: {
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            embeddingApiKey: settings.embeddingApiKey,
            embeddingBaseUrl: settings.embeddingBaseUrl,
            embeddingModel: settings.embeddingModel,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setUploadResult(`✓ 已上传，分块 ${data.chunks} 块`);
        setUploadText("");
        setUploadTitle("");
        fetchDocs();
      } else {
        setUploadResult(`✗ ${data.error || "上传失败"}`);
      }
    } catch (e) {
      setUploadResult(`✗ ${e instanceof Error ? e.message : "上传失败"}`);
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    fetchDocs();
  };

  const handleQuery = async () => {
    if (!question.trim() || !settings.apiKey) return;
    setQuerying(true);
    setAnswer("");
    setSources([]);
    setStreaming(true);

    try {
      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          settings: {
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl,
            model: settings.model,
            embeddingApiKey: settings.embeddingApiKey,
            embeddingBaseUrl: settings.embeddingBaseUrl,
            embeddingModel: settings.embeddingModel,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAnswer(`错误：${err.error}`);
        setStreaming(false);
        setQuerying(false);
        return;
      }

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
            if (parsed.type === "sources") {
              setSources(parsed.chunks || []);
            } else if (parsed.type === "delta") {
              setAnswer((prev) => prev + parsed.delta);
            }
          } catch {}
        }
      }
    } catch (e) {
      setAnswer(`错误：${e instanceof Error ? e.message : "查询失败"}`);
    }
    setStreaming(false);
    setQuerying(false);
  };

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pixel-grid-bg" />
      
      {/* 顶部导航 */}
      <nav className="nav-bar">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回</Link>
          <span className="pixel-text text-[10px] text-ink/40 uppercase tracking-[0.12em]">📚 知识库</span>
          <Link href="/settings" className="nav-link">设置 →</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="page-header">
          <p className="page-label">检索增强问答</p>
          <h1>知识库问答</h1>
          <p>上传文档建立知识库，提问时自动检索相关内容。</p>
          {!settings.apiKey && (
            <p className="pixel-text text-[10px] text-danger mt-2">⚠ 请先在设置页面配置 API Key 和嵌入模型</p>
          )}
        </div>

        {/* 上传区域 */}
        <div className="pixel-area pixel-area-hover p-6 mb-6">
          <h2 className="section-title">
            <EmojiSVG emoji="📤" size={14} /> 上传文档
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="文档标题（可选）"
              className="input-pixel"
            />
            <textarea
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              placeholder="粘贴文档内容（文本会自动分块并嵌入）..."
              rows={6}
              className="input-pixel resize-y"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadText.trim() || !settings.apiKey}
                className="btn-pixel-dark"
              >
                {uploading ? "嵌入中..." : "上传并嵌入"}
              </button>
              {uploadResult && (
                <span className={`pixel-text text-[11px] ${uploadResult.startsWith("✓") ? "text-success" : "text-danger"}`}>
                  {uploadResult}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 文档列表 */}
        <div className="pixel-area pixel-area-hover p-6 mb-6">
          <h2 className="section-title">
            <EmojiSVG emoji="📦" size={14} /> 知识库文档 ({docs.length})
          </h2>
          {loading ? (
            <p className="pixel-text text-sm text-ink/30 py-4">加载中...</p>
          ) : docs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✦</span>
              <p className="empty-title">暂无文档</p>
              <p className="empty-desc">上传文本内容来建立知识库</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="pixel-area pixel-area-hover flex items-center gap-3 p-4"
                >
                  <EmojiSVG emoji="📄" size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="pixel-text text-xs text-ink font-medium truncate">{doc.title}</div>
                    <div className="pixel-text text-[10px] text-ink/40">{doc.chunkCount} 块 · {new Date(doc.createdAt).toLocaleString("zh-CN")}</div>
                  </div>
                  <button onClick={() => handleDelete(doc.id)} className="pixel-text text-[10px] text-ink/30 hover:text-danger transition-colors p-1">
                    <EmojiSVG emoji="✕" size={12} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 问答区域 */}
        <div className="pixel-area pixel-area-hover p-6">
          <h2 className="section-title">
            <EmojiSVG emoji="❓" size={14} /> 提问
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !querying) handleQuery(); }}
              placeholder="基于知识库提问..."
              disabled={querying || docs.length === 0}
              className="input-pixel flex-1"
            />
            <button
              onClick={handleQuery}
              disabled={querying || !question.trim() || docs.length === 0}
              className="btn-pixel-dark"
            >
              {querying ? "查询中..." : "查询"}
            </button>
          </div>

          {/* 来源 / Sources */}
          <AnimatePresence>
            {sources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 border-2 border-[#e5e5e5] bg-white"
              >
                <p className="pixel-text text-[10px] text-ink/40 mb-3 uppercase tracking-[0.1em]">检索来源</p>
                <div className="space-y-2">
                  {sources.map((src, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="badge-pixel">#{i + 1}</span>
                      <span className="pixel-text text-[10px] text-ink/60 flex-1 truncate">{src.title}</span>
                      <span className="pixel-text text-[9px] text-ink/40">{(src.score * 100).toFixed(1)}%</span>
                      <div className="progress-bar w-20">
                        <div className="progress-bar-fill bg-ink" style={{ width: `${src.score * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 回答 / Answer */}
          <AnimatePresence>
            {answer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="pixel-area p-5"
              >
                <p className="pixel-text text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">
                  {answer}
                  {streaming && <span className="animate-pulse">▋</span>}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}