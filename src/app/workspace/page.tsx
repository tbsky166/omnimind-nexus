"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import EmojiSVG from "@/components/EmojiSVG";

interface FileEntry {
  name: string;
  source: string;
  size: number;
  sizeText: string;
  modified: string;
  downloadUrl: string;
}

export default function WorkspacePage() {
  const [workspace, setWorkspace] = useState<FileEntry[]>([]);
  const [temp, setTemp] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"workspace" | "temp">("workspace");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace");
      const data = await res.json();
      setWorkspace(data.workspace || []);
      setTemp(data.temp || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const files = tab === "workspace" ? workspace : temp;

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pixel-grid-bg" />
      
      {/* 顶部导航 */}
      <nav className="nav-bar">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回</Link>
          <span className="pixel-text text-[10px] text-ink/40 uppercase tracking-[0.12em]">工作区</span>
          <Link href="/settings" className="nav-link">设置 →</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="page-header">
          <p className="page-label">文件浏览</p>
          <h1>工作区文件</h1>
          <p>浏览和下载 Agent 协作过程中生成的文件。</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("workspace")}
            className={`font-mono text-[10px] tracking-[0.1em] uppercase px-4 py-2 border-2 transition-all ${
              tab === "workspace"
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink/50 border-[#e5e5e5] hover:border-ink/40 hover:text-ink"
            }`}
          >
            工作区 ({workspace.length})
          </button>
          <button
            onClick={() => setTab("temp")}
            className={`font-mono text-[10px] tracking-[0.1em] uppercase px-4 py-2 border-2 transition-all ${
              tab === "temp"
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink/50 border-[#e5e5e5] hover:border-ink/40 hover:text-ink"
            }`}
          >
            临时 ({temp.length})
          </button>
          <button
            onClick={fetchFiles}
            className="font-mono text-[10px] text-ink/40 hover:text-ink ml-auto px-3 py-2 border-2 border-[#e5e5e5] hover:border-ink/30 transition-all hover:bg-white"
          >
            ↻ 刷新
          </button>
        </div>

        {/* 文件列表 */}
        {loading ? (
          <div className="pixel-text text-sm text-ink/30 text-center py-16">加载中...</div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
            <p className="empty-title">暂无文件</p>
            <p className="empty-desc">Agent 在协作中生成的文件会出现在这里</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, i) => (
              <motion.div
                key={file.name + file.source}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="pixel-area pixel-area-hover flex items-center gap-3 p-4"
              >
                <EmojiSVG
                  emoji={file.name.endsWith(".docx") ? "📄" : file.name.endsWith(".xlsx") ? "📊" : "📄"}
                  size={24}
                />
                <div className="flex-1 min-w-0">
                  <div className="pixel-text text-xs text-ink font-medium truncate">{file.name}</div>
                  <div className="pixel-text text-[10px] text-ink/40">
                    {file.sizeText} · {new Date(file.modified).toLocaleString("zh-CN")}
                  </div>
                </div>
                <a
                  href={file.downloadUrl}
                  download={file.name}
                  className="btn-pixel-dark"
                >
                  下载
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}