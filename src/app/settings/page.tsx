"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
import EmojiSVG from "@/components/EmojiSVG";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [local, setLocal] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => { setLocal(settings); }, [settings]);

  const handleSave = () => {
    updateSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "test connection",
          settings: { apiKey: local.apiKey, baseUrl: local.baseUrl, model: local.model },
          _test: true,
        }),
      });
      if (res.ok) {
        setTestResult("✓ 连接成功");
      } else {
        const err = await res.json();
        setTestResult(`✗ ${err.error || "连接失败"}`);
      }
    } catch (e) {
      setTestResult(`✗ ${e instanceof Error ? e.message : "网络错误"}`);
    }
    setTesting(false);
  };

  return (
    <main className="relative min-h-screen bg-surface">
      {/* 顶部导航 */}
      <nav className="nav-bar">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回</Link>
          <span className="pixel-text text-[10px] text-ink/40 uppercase tracking-[0.12em]">设置</span>
          <Link href="/dashboard" className="nav-link">仪表盘 →</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="page-header">
          <p className="page-label">配置</p>
          <h1>设置</h1>
          <p>配置 API 连接、模型参数和高级特性。设置保存在浏览器本地。</p>
        </div>

        {/* API 配置 */}
        <div className="card p-6 mb-6">
          <h2 className="section-title">
            <EmojiSVG emoji="⚙️" size={14} /> API 配置
          </h2>
          <div className="space-y-4">
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">API Key</label>
              <input
                type="password"
                value={local.apiKey}
                onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                placeholder="sk-..."
                className="input-pixel"
              />
            </div>
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">Base URL</label>
              <input
                type="text"
                value={local.baseUrl}
                onChange={(e) => setLocal({ ...local, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="input-pixel"
              />
            </div>
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">Model</label>
              <input
                type="text"
                value={local.model}
                onChange={(e) => setLocal({ ...local, model: e.target.value })}
                placeholder="gpt-4o"
                className="input-pixel"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={testing || !local.apiKey}
                className="btn-pixel"
              >
                {testing ? "测试中..." : "测试连接"}
              </button>
              {testResult && (
                <span className={`pixel-text text-[11px] self-center ${testResult.startsWith("✓") ? "text-success" : "text-danger"}`}>
                  {testResult}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 嵌入模型配置 */}
        <div className="card p-6 mb-6">
          <h2 className="section-title">
            <EmojiSVG emoji="📚" size={14} /> 嵌入模型配置（知识库专用）
          </h2>
          <p className="pixel-text text-[10px] text-ink/40 mb-4">为知识库问答功能单独配置嵌入模型。留空则使用与主 API 相同的配置。</p>
          <div className="space-y-4">
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">Embedding API Key</label>
              <input
                type="password"
                value={local.embeddingApiKey}
                onChange={(e) => setLocal({ ...local, embeddingApiKey: e.target.value })}
                placeholder="留空则使用上方 API Key"
                className="input-pixel"
              />
            </div>
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">Embedding Base URL</label>
              <input
                type="text"
                value={local.embeddingBaseUrl}
                onChange={(e) => setLocal({ ...local, embeddingBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="input-pixel"
              />
            </div>
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">Embedding Model</label>
              <input
                type="text"
                value={local.embeddingModel}
                onChange={(e) => setLocal({ ...local, embeddingModel: e.target.value })}
                placeholder="text-embedding-3-small"
                className="input-pixel"
              />
            </div>
          </div>
        </div>

        {/* 模型参数 */}
        <div className="card p-6 mb-6">
          <h2 className="section-title">
            <EmojiSVG emoji="📊" size={14} /> 模型参数
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-3">
                Temperature: {local.temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={local.temperature}
                onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
                className="w-full accent-ink"
              />
            </div>
            <div>
              <label className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/50 block mb-1.5">Max Tokens</label>
              <input
                type="number"
                value={local.maxTokens}
                onChange={(e) => setLocal({ ...local, maxTokens: parseInt(e.target.value) || 4096 })}
                className="input-pixel"
              />
            </div>
          </div>
        </div>

        {/* 高级特性 */}
        <div className="card p-6 mb-8">
          <h2 className="section-title">
            <EmojiSVG emoji="🧠" size={14} /> 高级特性
          </h2>
          <div className="space-y-3">
            {([
              { key: "enableSwarm", label: "蜂群智能", desc: "基于信息素的集体决策机制", emoji: "🐝" },
              { key: "enableEvolution", label: "基因进化", desc: "通过遗传算法优化 Agent 参数", emoji: "🧬" },
              { key: "enableKnowledgeGraph", label: "知识图谱", desc: "带遗忘曲线的语义记忆系统", emoji: "📊" },
              { key: "enableMetacognition", label: "元认知层", desc: "带认知偏差检测的自我反思", emoji: "🪞" },
            ] as const).map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 p-3 rounded-lg border border-grid hover:border-ink/30 hover:bg-surface cursor-pointer transition-all"
              >
                <EmojiSVG emoji={item.emoji} size={20} />
                <div className="flex-1">
                  <div className="pixel-text text-xs text-ink">{item.label}</div>
                  <div className="pixel-text text-[10px] text-ink/40">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={local[item.key]}
                  onChange={(e) => setLocal({ ...local, [item.key]: e.target.checked })}
                  className="w-5 h-5 accent-ink rounded"
                />
              </label>
            ))}
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="btn-pixel-dark"
          >
            保存设置
          </button>
          <button
            onClick={resetSettings}
            className="pixel-text text-[10px] text-ink/40 hover:text-danger transition-colors"
          >
            重置默认
          </button>
          {saved && <span className="pixel-text text-[11px] text-success">✓ 已保存</span>}
        </div>
      </div>
    </main>
  );
}