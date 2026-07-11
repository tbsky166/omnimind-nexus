"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import DreamCard from "@/components/DreamCard";
import { generateAllDreams, getDreamReports, adoptDream, getKBStats, type DreamReport } from "@/lib/dreams";
import { agents } from "@/data/agents";

export default function DreamsPage() {
  const [dreams, setDreams] = useState<DreamReport[]>([]);
  const [stats, setStats] = useState({ totalMemories: 0, totalDreams: 0, adoptedDreams: 0, lastConsolidation: 0 });
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(() => {
    setDreams(getDreamReports());
    setStats(getKBStats());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleGenerate = () => {
    setGenerating(true);
    // 模拟异步生成
    setTimeout(() => {
      const agentList = agents.slice(0, 12).map(a => ({ name: a.name, emoji: a.emoji }));
      generateAllDreams(agentList);
      refresh();
      setGenerating(false);
    }, 1500);
  };

  const handleAdopt = (id: string) => {
    adoptDream(id);
    refresh();
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* 顶部导航 */}
      <nav className="nav-bar">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回</Link>
          <span className="pixel-text text-[10px] text-ink/40 uppercase tracking-[0.12em]">🌙 梦境</span>
          <div className="flex items-center gap-2">
            <Link href="/agents" className="nav-link">Agent 人格</Link>
            <Link href="/dashboard" className="nav-link">仪表盘</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="page-header"
        >
          <p className="page-label">记忆巩固</p>
          <h1>🌙 Agent 记忆梦境</h1>
          <p>受海马体重放理论启发 · Agent 在后台巩固记忆，产生跨领域创意联想</p>
        </motion.div>

        {/* 统计栏 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-4 gap-4 mb-8"
        >
          <div className="stat-card text-center">
            <p className="stat-value text-ink">{stats.totalMemories}</p>
            <p className="stat-label">记忆条目</p>
          </div>
          <div className="stat-card text-center">
            <p className="stat-value text-primary">{stats.totalDreams}</p>
            <p className="stat-label">梦境报告</p>
          </div>
          <div className="stat-card text-center">
            <p className="stat-value text-success">{stats.adoptedDreams}</p>
            <p className="stat-label">已采纳</p>
          </div>
          <div className="stat-card text-center flex flex-col items-center justify-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-pixel-dark"
            >
              {generating ? "生成中..." : "🔄 生成梦境"}
            </button>
          </div>
        </motion.div>

        {/* 梦境列表 */}
        {dreams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="empty-state"
          >
            <span className="empty-icon">🌙</span>
            <p className="empty-title">还没有梦境报告</p>
            <p className="empty-desc">
              完成一些任务后，点击"生成梦境"让 Agent 产生跨领域创意联想
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-pixel mt-4"
            >
              {generating ? "生成中..." : "✨ 开始生成"}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {dreams
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((dream, i) => (
                <motion.div
                  key={dream.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DreamCard dream={dream} onAdopt={handleAdopt} />
                </motion.div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}