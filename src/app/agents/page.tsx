"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { agents } from "@/data/agents";
import sprites, { type SpriteData } from "@/data/sprites";

// ── 像素艺术 SVG / PixelArt SVG ──
function PixelArtSVG({ rows, size, palette }: { rows: string[]; size: number; palette: Record<string, string> }) {
  const n = rows.length;
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

function getSpriteForAgent(name: string): SpriteData {
  return sprites[name] || sprites.default;
}

// ── 分类标签色 / Category label colors ──
const categoryMeta: Record<string, { label: string; color: string }> = {
  Core: { label: "核心", color: "#8B5CF6" },
  Engineering: { label: "工程", color: "#3B82F6" },
  Business: { label: "商业", color: "#10B981" },
  Creative: { label: "创意", color: "#F59E0B" },
  Specialized: { label: "专项", color: "#EC4899" },
};

// ── 主页面 / Main Page ──
export default function AgentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["all", ...new Set(agents.map((a) => a.category))];

  const filtered = agents.filter((a) => {
    const matchCategory = selectedCategory === "all" || a.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      a.name.includes(searchQuery) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.includes(searchQuery) ||
      a.personality.includes(searchQuery) ||
      a.category.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* 像素网格背景 / Pixel grid background */}
      <div className="pixel-grid-bg" />

      {/* 顶部导航 / Top nav */}
      <header className="relative z-10 border-b-2 border-ink bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="pixel-text text-[10px] text-ink/40 hover:text-ink/70 transition-colors uppercase tracking-[0.15em]"
            >
              ← OmniMind Nexus
            </Link>
            <span className="text-ink/20">|</span>
            <span className="pixel-text text-[11px] text-ink tracking-[0.1em] uppercase">
              Agent Registry
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="pixel-text text-[9px] text-ink/30">
              {agents.length} agents
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* 搜索与筛选 / Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 Agent 名称、角色、描述..."
              className="w-full border-2 border-ink/30 px-4 py-2.5 pixel-text text-[11px] text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink/60 transition-colors bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 pixel-text text-[10px] text-ink/30 hover:text-ink/60"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => {
              const meta = categoryMeta[cat];
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`pixel-text text-[10px] px-3 py-2 border-2 transition-colors ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-ink/20 text-ink/50 hover:border-ink/40 hover:text-ink/70"
                  }`}
                >
                  {meta ? meta.label : cat}
                  {cat !== "all" && (
                    <span className="ml-1 text-[8px] opacity-60">
                      {agents.filter((a) => a.category === cat).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent 列表 / Agent list */}
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="border-2 border-ink/20 py-16 text-center">
              <span className="pixel-text text-[11px] text-ink/30">
                No agents match your search
              </span>
            </div>
          ) : (
            filtered.map((agent, idx) => {
              const sprite = getSpriteForAgent(agent.name);
              const catMeta = categoryMeta[agent.category];
              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className="border-2 border-ink/10 hover:border-ink/30 transition-colors bg-white group"
                >
                  <div className="flex items-stretch">
                    {/* 精灵图 / Sprite */}
                    <div className="flex-shrink-0 w-20 border-r-2 border-ink/10 flex items-center justify-center bg-ink/[0.015] p-2">
                      <PixelArtSVG rows={sprite.rows} size={48} palette={sprite.palette} />
                    </div>

                    {/* 信息区 / Info */}
                    <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base">{agent.emoji}</span>
                        <span className="pixel-text text-[12px] text-ink font-medium tracking-[0.03em]">
                          {agent.name}
                        </span>
                        <span className="pixel-text text-[9px] text-ink/30">·</span>
                        <span className="pixel-text text-[9px] text-ink/40 uppercase">
                          {agent.role}
                        </span>
                        {catMeta && (
                          <span
                            className="pixel-text text-[8px] px-1.5 py-0.5 border ml-1"
                            style={{ borderColor: catMeta.color, color: catMeta.color }}
                          >
                            {catMeta.label}
                          </span>
                        )}
                        {agent.isCreator && (
                          <span className="pixel-text text-[8px] px-1.5 py-0.5 border border-ink/30 text-ink/50">
                            CREATOR
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink/60 leading-relaxed mt-1">
                        {agent.description}
                      </p>
                      <p className="text-[9px] text-ink/30 leading-relaxed mt-0.5 italic">
                        {agent.personality}
                      </p>
                    </div>

                    {/* 右侧箭头 / Right arrow */}
                    <div className="flex-shrink-0 w-10 border-l-2 border-ink/10 flex items-center justify-center text-ink/15 group-hover:text-ink/40 transition-colors">
                      <span className="pixel-text text-xs">→</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* 底部统计 / Footer stats */}
        <div className="mt-8 border-t-2 border-ink/15 pt-4 flex flex-wrap gap-4">
          {categories.filter((c) => c !== "all").map((cat) => {
            const meta = categoryMeta[cat];
            const count = agents.filter((a) => a.category === cat).length;
            return (
              <div key={cat} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 block"
                  style={{ backgroundColor: meta?.color || "#999" }}
                />
                <span className="pixel-text text-[9px] text-ink/40 uppercase">
                  {meta?.label || cat}: {count}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}