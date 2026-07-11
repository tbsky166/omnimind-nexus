"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { agents, type Agent } from "@/data/agents";
import sprites, { type SpriteData } from "@/data/sprites";
import EmojiSVG from "@/components/EmojiSVG";
import PersonalityRadar, { PersonalityEvolution } from "@/components/PersonalityRadar";
import { initPersonality, getPersonality, getAllPersonalities, calculateSynergy, type AgentPersonality } from "@/lib/personality";
import { getUnlockedAchievements, getAchievementById, getRarityColor, getRarityBg } from "@/lib/achievements";

// 自定义 Agent 类型 / Custom agent type
interface CustomAgent extends Agent {
  id: string;
  isCustom?: boolean;
}

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
const categoryMeta: Record<string, { label: string; color: string; gradient: string; bg: string }> = {
  Core: { label: "核心", color: "#8B5CF6", gradient: "gradient-card-purple", bg: "bg-purple-50" },
  Engineering: { label: "工程", color: "#3B82F6", gradient: "gradient-card-blue", bg: "bg-blue-50" },
  Business: { label: "商业", color: "#10B981", gradient: "gradient-card-green", bg: "bg-green-50" },
  Creative: { label: "创意", color: "#F59E0B", gradient: "gradient-card-amber", bg: "bg-amber-50" },
  Specialized: { label: "专项", color: "#EC4899", gradient: "gradient-card-purple", bg: "bg-pink-50" },
};

// ── 主页面 / Main Page ──
export default function AgentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [personalities, setPersonalities] = useState<Map<string, AgentPersonality>>(new Map());

  // 拉取自定义 Agent / Fetch custom agents
  useEffect(() => {
    fetch("/api/custom-agents")
      .then((r) => r.json())
      .then((data) => {
        if (data.agents && Array.isArray(data.agents)) {
          const mapped: CustomAgent[] = data.agents.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: a.name as string,
            emoji: (a.emoji as string) || "🤖",
            role: a.role as string,
            category: (a.category as string) || "Specialized",
            personality: (a.personality as string) || "",
            description: a.description as string,
            isCustom: true,
          }));
          setCustomAgents(mapped);
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // 初始化人格 / Initialize personalities
  useEffect(() => {
    const map = new Map<string, AgentPersonality>();
    for (const agent of agents) {
      const p = initPersonality(agent.name, agent.emoji, agent.role);
      map.set(agent.name, p);
    }
    setPersonalities(map);
  }, []);

  // 合并内置 + 自定义 Agent / Merge built-in + custom agents
  const allAgents: CustomAgent[] = [
    ...agents.map((a) => ({ ...a, id: a.name })),
    ...customAgents,
  ];

  const categories = ["all", ...new Set(allAgents.map((a) => a.category))];

  const filtered = allAgents.filter((a) => {
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
    <div className="min-h-screen bg-surface">
      {/* 顶部导航 / Top nav */}
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="nav-link">
              ← 返回首页
            </Link>
            <span className="w-px h-4 bg-grid" />
            <span className="nav-link nav-link-active !cursor-default">
              Agent 注册表
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="nav-link">
              仪表盘
            </Link>
            <Link href="/settings" className="nav-link">
              设置
            </Link>
            <span className="badge badge-outline">
              {allAgents.length} agents
              {customAgents.length > 0 && (
                <span className="ml-1 text-ink/40">({customAgents.length} 自定义)</span>
              )}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* 页面标题 / Page header */}
        <div className="page-header">
          <div className="page-label">Agent Registry</div>
          <h1>Agent 注册表</h1>
          <p>浏览、搜索和管理所有 Agent，查看其性格雷达与协作关系。</p>
        </div>

        {/* 搜索与筛选 / Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 Agent 名称、角色、描述..."
              className="input-pixel"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors text-sm"
              >
                ✕
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
                  className={`btn-pixel ${isActive ? "btn-pixel-dark" : ""} flex items-center gap-1`}
                >
                  {meta ? (
                    <>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </>
                  ) : (
                    cat
                  )}
                  {cat !== "all" && (
                    <span className="ml-0.5 opacity-50 text-[9px]">
                      {allAgents.filter((a) => a.category === cat).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent 列表 / Agent list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">没有匹配的 Agent</div>
              <div className="empty-desc">
                尝试调整搜索关键词或筛选条件，看看有没有你想找的 Agent。
              </div>
            </div>
          ) : (
            filtered.map((agent, idx) => {
              const sprite = getSpriteForAgent(agent.name);
              const catMeta = categoryMeta[agent.category];
              const personality = personalities.get(agent.name);
              const isExpanded = expandedAgent === agent.name;
              const synergyPartner = personality?.synergyPartners[0];
              const synergyScore = synergyPartner && personality
                ? (() => {
                    const partner = personalities.get(synergyPartner);
                    return partner ? calculateSynergy(personality, partner) : 0;
                  })()
                : 0;

              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.25 }}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div
                    className={`card overflow-hidden ${
                      isExpanded
                        ? "border-ink/20 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                        : "hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
                    }`}
                  >
                    {/* 卡片头部 / Card header */}
                    <div
                      className="flex items-stretch cursor-pointer"
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}
                    >
                      {/* 精灵图 / Sprite */}
                      <div className={`flex-shrink-0 w-20 flex items-center justify-center ${catMeta?.bg || "bg-gray-50"} rounded-l-xl p-3`}>
                        <PixelArtSVG rows={sprite.rows} size={48} palette={sprite.palette} />
                      </div>

                      {/* 信息区 / Info */}
                      <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <EmojiSVG emoji={agent.emoji} size={16} />
                          <span className="font-semibold text-sm text-ink tracking-tight">
                            {agent.name}
                          </span>
                          <span className="text-ink/20 text-xs">·</span>
                          <span className="pixel-text text-[10px] text-muted">
                            {agent.role}
                          </span>
                          {catMeta && (
                            <span
                              className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                              style={{ backgroundColor: `${catMeta.color}15`, color: catMeta.color }}
                            >
                              {catMeta.label}
                            </span>
                          )}
                          {agent.isCreator && (
                            <span className="badge badge-outline text-[10px]">CREATOR</span>
                          )}
                          {agent.isCustom && (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-purple-50 text-purple-500 border border-purple-200">
                              自定义
                            </span>
                          )}
                          {personality && (
                            <span className="badge badge-outline text-[10px]">
                              Lv.{personality.level}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/60 leading-relaxed mt-1 line-clamp-2">
                          {agent.description}
                        </p>
                        <p className="text-[10px] text-muted leading-relaxed mt-0.5 italic line-clamp-1">
                          {agent.personality}
                        </p>
                      </div>

                      {/* 右侧箭头 / Right arrow */}
                      <div className="flex-shrink-0 w-10 flex items-center justify-center text-ink/15 group-hover:text-ink/40 transition-colors">
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* 展开：人格雷达图 / Expanded: personality radar */}
                    <AnimatePresence>
                      {isExpanded && personality && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className={`border-t border-grid ${catMeta?.gradient || ""} p-6`}>
                            <div className="flex flex-col md:flex-row gap-6">
                              {/* 雷达图 */}
                              <div className="flex-shrink-0 flex flex-col items-center">
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-grid">
                                  <PersonalityRadar traits={personality.traits} size={170} color="#3b82f6" />
                                </div>
                                <p className="pixel-text text-[9px] text-muted mt-2">性格雷达图</p>
                              </div>

                              {/* 详情 */}
                              <div className="flex-1 space-y-4">
                                {/* 统计行 */}
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-grid">
                                    <span className="pixel-text text-[9px] text-muted">等级</span>
                                    <span className="text-sm font-bold text-ink">Lv.{personality.level}</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-grid">
                                    <span className="pixel-text text-[9px] text-muted">经验</span>
                                    <div className="progress-bar w-20">
                                      <div
                                        className="progress-bar-fill bg-blue-500"
                                        style={{ width: `${(personality.experience % 100)}%` }}
                                      />
                                    </div>
                                    <span className="pixel-text text-[9px] text-muted">{personality.experience}</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-grid">
                                    <span className="pixel-text text-[9px] text-muted">火花</span>
                                    <span className="text-sm text-amber-500 font-medium">{personality.sparkCount}⚡</span>
                                  </div>
                                </div>

                                {/* 最佳搭档 */}
                                {synergyPartner && (
                                  <div className="flex items-center gap-2 p-3 bg-warning-soft rounded-xl border border-amber-200">
                                    <span className="text-sm">🤝</span>
                                    <span className="pixel-text text-[10px] text-amber-700 font-medium">最佳搭档</span>
                                    <span className="pixel-text text-[11px] text-ink/70">{synergyPartner}</span>
                                    <span className="pixel-text text-[10px] text-amber-500 ml-auto">协同度 {synergyScore}%</span>
                                  </div>
                                )}

                                {/* 成就徽章 */}
                                {(() => {
                                  const achievements = getUnlockedAchievements(agent.name);
                                  if (achievements.length === 0) return null;
                                  return (
                                    <div>
                                      <div className="section-title mb-2">🏅 成就徽章</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {achievements.map((ua) => {
                                          const ach = getAchievementById(ua.achievementId);
                                          if (!ach) return null;
                                          const clr = getRarityColor(ach.rarity);
                                          const bg = getRarityBg(ach.rarity);
                                          return (
                                            <div
                                              key={ua.achievementId}
                                              className="flex items-center gap-1 px-2 py-1 rounded-md border"
                                              style={{ background: bg, borderColor: clr + "40" }}
                                              title={ach.description}
                                            >
                                              <EmojiSVG emoji={ach.emoji} size={12} />
                                              <span className="pixel-text text-[8px] font-medium" style={{ color: clr }}>{ach.name}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* 性格进化历史 */}
                                <PersonalityEvolution personality={personality} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* 底部统计 / Footer stats */}
        <div className="mt-10">
          <hr className="divider" />
          <div className="flex flex-wrap gap-3 pt-4">
            {categories.filter((c) => c !== "all").map((cat) => {
              const meta = categoryMeta[cat];
              const count = allAgents.filter((a) => a.category === cat).length;
              return (
                <div
                  key={cat}
                  className="badge-outline flex items-center gap-2 cursor-pointer hover:border-ink/40 transition-colors"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta?.color || "#999" }}
                  />
                  <span className="text-[10px]">
                    {meta?.label || cat}: {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}