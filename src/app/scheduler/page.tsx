"use client";

import { useState, useEffect } from "react";
import { agents } from "@/data/agents";
import type { ScheduledTask } from "@/lib/scheduler";

/** 预设模板数据（与 scheduler.ts 同步） */
const TASK_TEMPLATES = [
  { name: "每日代码审查", description: "每天自动检查代码库，发现潜在问题", cronExpression: "0 9 * * 1-5", prompt: "请审查项目的代码质量，检查是否有明显的 bug、性能问题或安全漏洞。列出发现的问题和改进建议。", agents: ["Alchemist", "Coder"] },
  { name: "每周技术周报", description: "每周一自动生成技术周报", cronExpression: "0 8 * * 1", prompt: "请生成一份技术周报，总结项目进展、关键指标、待办事项。格式要专业清晰。", agents: ["Creator", "Sage"] },
  { name: "每日系统健康检查", description: "每天检查系统运行状态", cronExpression: "0 7 * * *", prompt: "请检查系统健康状态，包括：API 响应时间、错误率、内存使用情况。如果发现异常，给出修复建议。", agents: ["Sentinel", "Sage"] },
  { name: "每小时新闻摘要", description: "每整点获取最新行业新闻", cronExpression: "0 * * * *", prompt: "请搜索最新的 AI/技术行业新闻，给出 3-5 条最重要的新闻摘要（每条不超过 100 字）。", agents: ["WebScout", "Sage"] },
];

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", cronExpression: "", prompt: "", agents: [] as string[] });

  const loadTasks = async () => {
    try {
      const res = await fetch("/api/scheduler");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error("加载任务失败:", e);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.cronExpression || !form.prompt) return;
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    });
    setForm({ name: "", description: "", cronExpression: "", prompt: "", agents: [] });
    setShowForm(false);
    loadTasks();
  };

  const handleToggle = async (id: string) => {
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    loadTasks();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    loadTasks();
  };

  const applyTemplate = (tpl: typeof TASK_TEMPLATES[0]) => {
    setForm({ name: tpl.name, description: tpl.description, cronExpression: tpl.cronExpression, prompt: tpl.prompt, agents: tpl.agents });
    setShowForm(true);
  };

  const toggleAgent = (name: string) => {
    setForm((f) => ({
      ...f,
      agents: f.agents.includes(name) ? f.agents.filter((a) => a !== name) : [...f.agents, name],
    }));
  };

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pixel-grid-bg" />

      {/* 导航栏 */}
      <nav className="nav-bar relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 no-underline">
            <div className="w-6 h-6 bg-ink flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">N</span>
            </div>
            <span className="pixel-text text-[10px] tracking-[0.15em] text-ink/60">OmniMind</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="nav-link">Home</a>
            <a href="/agents" className="nav-link">Agents</a>
            <a href="/scheduler" className="nav-link nav-link-active">Scheduler</a>
            <a href="/settings" className="nav-link">Settings</a>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="page-label">Scheduler</p>
            <h1 className="pixel-h2">定时任务调度</h1>
            <p className="pixel-text text-xs text-ink/50 mt-1">参考 OpenClaw 生物钟 — 定时自动执行 Agent 任务</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-pixel-dark">
            {showForm ? "取消" : "+ 新建任务"}
          </button>
        </div>

        {/* 预设模板 */}
        <div className="mb-6">
          <h2 className="section-title">预设模板</h2>
          <div className="grid grid-cols-2 gap-3">
            {TASK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => applyTemplate(tpl)}
                className="pixel-area text-left p-4 cursor-pointer"
              >
                <p className="pixel-text text-xs font-bold mb-1">{tpl.name}</p>
                <p className="pixel-text text-[10px] text-ink/50 mb-1">{tpl.description}</p>
                <code className="text-[10px] bg-gray-100 px-1">{tpl.cronExpression}</code>
              </button>
            ))}
          </div>
        </div>

        {/* 创建表单 */}
        {showForm && (
          <div className="pixel-area p-4 mb-6">
            <h2 className="section-title">新建定时任务</h2>
            <div className="space-y-3">
              <div>
                <label className="pixel-label mb-1 block">任务名称</label>
                <input className="input-pixel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：每日代码审查" />
              </div>
              <div>
                <label className="pixel-label mb-1 block">描述</label>
                <input className="input-pixel" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="任务描述" />
              </div>
              <div>
                <label className="pixel-label mb-1 block">Cron 表达式（分 时 日 月 周）</label>
                <input className="input-pixel font-mono" value={form.cronExpression} onChange={(e) => setForm({ ...form, cronExpression: e.target.value })} placeholder="0 9 * * 1-5（工作日 9 点）" />
                <p className="text-[10px] text-ink/40 mt-1">常用：<code>0 9 * * 1-5</code> 工作日9点 | <code>0 8 * * 1</code> 周一8点 | <code>0 * * * *</code> 每小时</p>
              </div>
              <div>
                <label className="pixel-label mb-1 block">Agent 提示词</label>
                <textarea className="input-pixel h-24 resize-none" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="发给 Agent 的指令..." />
              </div>
              <div>
                <label className="pixel-label mb-1 block">参与 Agent</label>
                <div className="flex flex-wrap gap-1">
                  {agents.map((a) => (
                    <button
                      key={a.name}
                      onClick={() => toggleAgent(a.name)}
                      className={`badge-pixel cursor-pointer ${form.agents.includes(a.name) ? "bg-ink text-white" : ""}`}
                    >
                      {a.emoji} {a.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} className="btn-pixel-dark">创建任务</button>
            </div>
          </div>
        )}

        {/* 任务列表 */}
        <div>
          <h2 className="section-title">已创建任务 ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⏰</div>
              <div className="empty-title">暂无定时任务</div>
              <div className="empty-desc">点击上方"新建任务"或使用预设模板创建</div>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className={`pixel-area p-4 ${!task.enabled ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 ${task.enabled ? "bg-green-500" : "bg-gray-400"}`} />
                        <span className="pixel-text text-xs font-bold">{task.name}</span>
                        <code className="text-[10px] bg-gray-100 px-1 font-mono">{task.cronExpression}</code>
                      </div>
                      <p className="pixel-text text-[10px] text-ink/50 mb-2">{task.description}</p>
                      <p className="pixel-text text-[10px] text-ink/40">Prompt: {task.prompt.substring(0, 80)}...</p>
                      <div className="flex items-center gap-2 mt-2">
                        {task.agents.map((a) => (
                          <span key={a} className="badge-pixel text-[8px]">{a}</span>
                        ))}
                        <span className="text-[10px] text-ink/30">
                          已执行 {task.runCount} 次
                          {task.lastRunAt && ` · 上次: ${new Date(task.lastRunAt).toLocaleString("zh-CN")}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button onClick={() => handleToggle(task.id)} className="btn-pixel text-[10px] px-2 py-1">
                        {task.enabled ? "暂停" : "启用"}
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="btn-pixel text-[10px] px-2 py-1 text-red-500">
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}