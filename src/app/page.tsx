import AgentConversation from "@/components/AgentConversation";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white">
      {/* 顶部导航 / Top nav */}
      <div className="relative z-20 border-b border-ink/10 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <span className="pixel-text text-[10px] text-ink/30 uppercase tracking-[0.12em]">OmniMind Nexus</span>
          <Link
            href="/agents"
            className="pixel-text text-[10px] text-ink/30 hover:text-ink/60 transition-colors uppercase tracking-[0.1em] border border-ink/20 px-2.5 py-1 hover:border-ink/40"
          >
            Agent Registry →
          </Link>
        </div>
      </div>
      <AgentConversation />
    </main>
  );
}