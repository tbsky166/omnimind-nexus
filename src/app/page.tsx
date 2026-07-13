import AgentConversation from "@/components/AgentConversation";
import AchievementUnlock from "@/components/AchievementUnlock";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <AchievementUnlock />
      {/* 顶部导航 / Top nav */}
      <nav className="nav-bar">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-ink flex items-center justify-center">
              <span className="text-white text-[10px] font-bold tracking-tighter">OM</span>
            </div>
            <span className="pixel-text text-[10px] text-ink/50 uppercase tracking-[0.12em] hidden sm:inline">OmniMind Nexus</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Link href="/dashboard" className="nav-link">仪表盘</Link>
            <Link href="/debate" className="nav-link">辩论赛</Link>
            <Link href="/cafe" className="nav-link text-amber-600 hover:text-amber-700">咖啡馆</Link>
            <Link href="/canvas" className="nav-link text-emerald-600 hover:text-emerald-700">画布</Link>
            <Link href="/topology" className="nav-link">拓扑图</Link>
            <Link href="/knowledge-graph" className="nav-link text-blue-600 hover:text-blue-700">知识图谱</Link>
            <Link href="/kb" className="nav-link">知识库</Link>
            <Link href="/workspace" className="nav-link">工作区</Link>
            <Link href="/dreams" className="nav-link text-purple-600 hover:text-purple-700">梦境</Link>
            <Link href="/settings" className="nav-link">设置</Link>
            <Link href="/agents" className="nav-link font-semibold text-ink/70">注册表 →</Link>
          </div>
        </div>
      </nav>

      <AgentConversation />
    </main>
  );
}