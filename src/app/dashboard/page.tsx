"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EmojiSVG from "@/components/EmojiSVG";
import DiversityPanel from "@/components/DiversityPanel";
import { getCounterfactualHistory, type CounterfactualAnalysis } from "@/lib/counterfactual";

interface Stats {
  sessions: { total: number; recent: Array<{ id: string; title: string; updatedAt: number; messageCount: number }> };
  workspaceFiles: number;
  agentUsage: Array<{ name: string; count: number }>;
  totalAgents: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cfHistory, setCfHistory] = useState<CounterfactualAnalysis[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
    setCfHistory(getCounterfactualHistory().slice(-5).reverse());
  }, []);

  const maxUsage = stats?.agentUsage?.[0]?.count || 1;

  return (
    <main className="relative min-h-screen bg-white">
      {/* 像素网格背景 */}
      <div className="pixel-grid-bg" />
      

      {/* 顶部导航 */}
      <nav className="nav-bar relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">
            ← 返回
          </Link>
          <span className="pixel-text text-[0.625rem] text-muted uppercase tracking-[0.12em]">仪表盘</span>
          <Link href="/settings" className="nav-link">
            设置 →
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* 页面标题 */}
        <div className="page-header">
          <p className="page-label">数据统计</p>
          <h1>仪表盘</h1>
          <p>协作平台统计数据概览。</p>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p className="empty-title">加载中...</p>
            <p className="empty-desc">正在获取统计数据</p>
          </div>
        ) : !stats ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p className="empty-title">无法加载统计数据</p>
            <p className="empty-desc">请稍后刷新页面重试</p>
          </div>
        ) : (
          <>
            {/* 数字卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="pixel-area-elevated p-4 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <EmojiSVG emoji="💬" size={14} />
                  <span className="pixel-text text-[0.5625rem] text-muted uppercase tracking-[0.1em]">会话总数</span>
                </div>
                <div className="pixel-text text-2xl font-bold text-ink">{stats.sessions.total}</div>
              </div>
              <div className="pixel-area-elevated p-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <EmojiSVG emoji="🤖" size={14} />
                  <span className="pixel-text text-[0.5625rem] text-muted uppercase tracking-[0.1em]">Agent 总数</span>
                </div>
                <div className="pixel-text text-2xl font-bold text-ink">{stats.totalAgents}</div>
              </div>
              <div className="pixel-area-elevated p-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <EmojiSVG emoji="📦" size={14} />
                  <span className="pixel-text text-[0.5625rem] text-muted uppercase tracking-[0.1em]">工作区文件</span>
                </div>
                <div className="pixel-text text-2xl font-bold text-ink">{stats.workspaceFiles}</div>
              </div>
              <div className="pixel-area-elevated p-4 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                <div className="flex items-center gap-2 mb-2">
                  <EmojiSVG emoji="📊" size={14} />
                  <span className="pixel-text text-[0.5625rem] text-muted uppercase tracking-[0.1em]">消息总数</span>
                </div>
                <div className="pixel-text text-2xl font-bold text-ink">{stats.sessions.recent.reduce((s, r) => s + r.messageCount, 0)}</div>
              </div>
            </div>

            {/* Agent 使用频率 */}
            <section className="pixel-area pixel-area-hover p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <h2 className="section-title">
                <EmojiSVG emoji="🤖" size={14} /> Agent 使用频率
              </h2>
              {stats.agentUsage.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✦</div>
                  <p className="empty-title">暂无数据</p>
                  <p className="empty-desc">Agent 协作后会显示使用频率统计</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.agentUsage.map((agent, i) => (
                    <div key={agent.name} className="flex items-center gap-3">
                      <span className="pixel-text text-[0.625rem] text-muted w-5 text-right">{i + 1}</span>
                      <span className="pixel-text text-xs text-ink w-36 truncate">{agent.name}</span>
                      <div className="flex-1 progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${(agent.count / maxUsage) * 100}%` }}
                        />
                      </div>
                      <span className="pixel-text text-[0.625rem] text-muted w-8 text-right tabular-nums">{agent.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 最近会话 */}
            <section className="pixel-area pixel-area-hover p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <h2 className="section-title">
                <EmojiSVG emoji="🕐" size={14} /> 最近会话
              </h2>
              {stats.sessions.recent.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✦</div>
                  <p className="empty-title">暂无会话记录</p>
                  <p className="empty-desc">开始协作后，最近的会话将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.sessions.recent.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 border-2 border-[#e5e5e5] hover:border-[#0f0f0f] transition-all"
                    >
                      <EmojiSVG emoji="💬" size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="pixel-text text-xs text-ink truncate">{session.title}</div>
                        <div className="pixel-text text-[0.625rem] text-muted mt-0.5">
                          {session.messageCount} 条消息 · {session.updatedAt ? new Date(session.updatedAt).toLocaleString("zh-CN") : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 认知多样性面板 */}
            <section className="pixel-area pixel-area-hover p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <h2 className="section-title">
                🧠 认知多样性
              </h2>
              <DiversityPanel />
            </section>

            {/* 反事实推理历史 */}
            {cfHistory.length > 0 && (
              <section className="pixel-area pixel-area-hover p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
                <h2 className="section-title">
                  🔮 反事实推理
                </h2>
                <div className="space-y-3">
                  {cfHistory.map((cf, i) => (
                    <div key={i} className="p-4 border-2 border-[#e5e5e5] hover:border-[#0f0f0f] transition-colors">
                      <p className="pixel-text text-[0.625rem] text-muted mb-1.5">
                        {cf.topic.slice(0, 60)}...
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.625rem] pixel-text">
                        <span className="text-muted">实际: {cf.actualPath.agents.join(", ")}</span>
                        {cf.bestAlternative && (
                          <span className="text-ink font-semibold">
                            替代: {cf.bestAlternative.agents.join(", ")} (+{cf.bestAlternative.estimatedScore - Math.round(cf.actualPath.efficiency * 0.3 + cf.actualPath.quality * 0.4 + cf.actualPath.diversity * 0.3)}分)
                          </span>
                        )}
                      </div>
                      <p className="pixel-text text-[0.5625rem] text-muted mt-1.5">{cf.recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 快捷入口 */}
            <section className="pixel-area pixel-area-hover p-6 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <h2 className="section-title">
                <EmojiSVG emoji="⚡" size={14} /> 快捷入口
              </h2>
              <div className="flex flex-wrap gap-3">
                <Link href="/" className="btn-pixel-dark">
                  开始协作
                </Link>
                <Link href="/agents" className="btn-pixel">
                  Agent 注册表
                </Link>
                <Link href="/workspace" className="btn-pixel">
                  工作区文件
                </Link>
                <Link href="/dreams" className="btn-pixel">
                  🌙 Agent 梦境
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}