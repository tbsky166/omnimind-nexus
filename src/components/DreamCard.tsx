"use client";

import { motion } from "framer-motion";
import type { DreamReport } from "@/lib/dreams";

// ── 梦境卡片组件 / Dream card component ──
export default function DreamCard({
  dream,
  onAdopt,
}: {
  dream: DreamReport;
  onAdopt?: (id: string) => void;
}) {
  const inspColor = dream.inspirationScore >= 70
    ? "border-purple-400 bg-purple-50/50"
    : dream.inspirationScore >= 50
    ? "border-blue-300 bg-blue-50/30"
    : "border-ink/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-2 p-4 ${inspColor} transition-colors`}
      style={{ boxShadow: "3px 3px 0 rgba(0,0,0,0.05)" }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{dream.agentEmoji}</span>
          <div>
            <span className="pixel-text text-xs text-ink/70">{dream.agentName}</span>
            {dream.crossDomain && (
              <span className="ml-2 pixel-text text-[9px] text-purple-500 bg-purple-50 px-1.5 py-0.5 border border-purple-200">
                🌀 跨领域
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="pixel-text text-[9px] text-ink/30">
            {new Date(dream.timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className={`pixel-text text-[9px] font-bold ${dream.inspirationScore >= 70 ? "text-purple-600" : "text-ink/40"}`}>
            💡{dream.inspirationScore}
          </span>
        </div>
      </div>

      {/* 梦境内容 */}
      <div className="pixel-text text-xs text-ink/70 leading-relaxed whitespace-pre-wrap mb-3">
        {dream.dreamContent}
      </div>

      {/* 标签 */}
      {dream.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {dream.tags.map((tag) => (
            <span key={tag} className="pixel-text text-[8px] text-ink/40 bg-ink/5 px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 底部 */}
      <div className="flex items-center justify-between">
        <span className="pixel-text text-[9px] text-ink/30">
          {dream.domainPair}
        </span>
        {onAdopt && !dream.isAdopted && (
          <button
            onClick={() => onAdopt(dream.id)}
            className="pixel-text text-[9px] text-purple-600 hover:text-purple-800 border border-purple-300 hover:border-purple-500 px-2 py-1 transition-colors"
          >
            ✨ 采纳灵感
          </button>
        )}
        {dream.isAdopted && (
          <span className="pixel-text text-[9px] text-green-600">✅ 已采纳</span>
        )}
      </div>
    </motion.div>
  );
}