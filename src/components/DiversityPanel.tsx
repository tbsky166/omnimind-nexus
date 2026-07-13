"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DiversityMetrics } from "@/lib/diversity";

// ── 多样性仪表盘面板 / Diversity Dashboard Panel ──
export default function DiversityPanel() {
  const [metrics, setMetrics] = useState<DiversityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 加载最近一次多样性评估
    try {
      const stored = localStorage.getItem("last_diversity_metrics");
      if (stored) {
        setMetrics(JSON.parse(stored));
      }
    } catch {}
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="border-2 border-[#e5e5e5] bg-white p-4 animate-pulse">
        <div className="h-4 bg-ink/10 w-1/3 mb-3" />
        <div className="h-20 bg-ink/5" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="border-2 border-[#e5e5e5] bg-white p-4 text-center">
        <p className="pixel-text text-xs text-ink/40">暂无多样性数据</p>
        <p className="pixel-text text-[10px] text-ink/30 mt-1">完成一次多 Agent 协作后自动生成</p>
      </div>
    );
  }

  const riskColor = {
    low: "text-green-600",
    medium: "text-amber-500",
    high: "text-red-600",
  }[metrics.groupthinkRisk];

  const riskLabel = {
    low: "低风险",
    medium: "中等风险",
    high: "高风险",
  }[metrics.groupthinkRisk];

  const riskBg = {
    low: "bg-white border-[#0f0f0f]",
    medium: "bg-white border-[#0f0f0f]",
    high: "bg-white border-[#0f0f0f]",
  }[metrics.groupthinkRisk];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-[#0f0f0f] bg-white p-4"
    >
      <h3 className="pixel-text text-xs tracking-[0.1em] uppercase text-ink/50 mb-3">
        🧠 认知多样性指数
      </h3>

      {/* 总得分 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
            <motion.circle
              cx="32" cy="32" r="28" fill="none"
              stroke={metrics.overallScore >= 60 ? "#22c55e" : metrics.overallScore >= 40 ? "#f59e0b" : "#ef4444"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${metrics.overallScore * 1.76} 176`}
              initial={{ strokeDashoffset: 176 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center pixel-text text-lg font-bold text-ink">
            {metrics.overallScore}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="pixel-text text-[10px] text-ink/50">语义散布度</span>
            <span className="pixel-text text-xs text-ink">{metrics.semanticSpread}%</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pixel-text text-[10px] text-ink/50">识别视角</span>
            <span className="pixel-text text-xs text-ink">{metrics.perspectiveCount} 个</span>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 text-[10px] pixel-text ${riskBg} ${riskColor}`}>
            群体思维：{riskLabel}
          </div>
        </div>
      </div>

      {/* Agent 贡献排名 */}
      <div className="space-y-1.5 mb-3">
        {metrics.agentContributions.slice(0, 5).map((agent) => (
          <div key={agent.agentName} className="flex items-center gap-2">
            <span className="pixel-text text-[9px] text-ink/30 w-4 text-right">#{agent.contributionRank}</span>
            <span className="pixel-text text-[10px] text-ink/70 flex-1 truncate">{agent.agentName}</span>
            <div className="w-20 h-1.5 bg-ink/5 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${agent.uniquenessScore}%` }}
                transition={{ duration: 0.5, delay: agent.contributionRank * 0.1 }}
                className="h-full bg-blue-500"
              />
            </div>
            <span className="pixel-text text-[9px] text-ink/40 w-8 text-right">{agent.uniquenessScore}</span>
          </div>
        ))}
      </div>

      {/* 建议 */}
      {metrics.recommendations.length > 0 && (
        <div className="border-t border-ink/10 pt-3">
          {metrics.recommendations.map((rec, i) => (
            <p key={i} className="pixel-text text-[9px] text-ink/50 leading-relaxed">
              {rec}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}