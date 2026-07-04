"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { agents, agentCategories } from "@/data/agents";

export default function AgentNetwork() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const categoryLabels: Record<string, string> = {
    Core: "Core",
    Engineering: "Engineering",
    Business: "Business",
    Creative: "Creative",
    Specialized: "Specialized",
  };

  return (
    <section id="agents" className="relative z-10 px-8 py-32 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-20"
      >
        <p className="pixel-text text-[10px] tracking-[0.3em] text-ink/50 uppercase mb-4">Agent Ecosystem</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-ink mb-3">
          32 个专业 Agent
        </h2>
        <p className="pixel-text text-sm text-ink/45 max-w-lg">
          每个 Agent 都是独立的 AI 专家，拥有独特的性格特质和专业领域。Router + A2A 协议共同考量能力和性格，实现最优组队。
        </p>
      </motion.div>

      <div className="space-y-20">
        {agentCategories.map((category) => {
          const categoryAgents = agents.filter((a) => a.category === category);
          if (categoryAgents.length === 0) return null;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              onMouseEnter={() => setHoveredCategory(category)}
              onMouseLeave={() => {
                setHoveredCategory(null);
                setHoveredAgent(null);
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-ink" />
                <h3 className="pixel-text text-[11px] tracking-[0.2em] text-ink/50 uppercase">
                  {categoryLabels[category]}
                </h3>
                <div className="flex-1 h-px bg-grid" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-grid">
                {categoryAgents.map((agent, idx) => {
                  const isHovered = hoveredAgent === agent.name;
                  const isCategoryActive = hoveredCategory === category;

                  return (
                    <motion.div
                      key={agent.name}
                      className="relative bg-white p-4 md:p-5 cursor-default transition-colors duration-200"
                      style={{
                        backgroundColor: isHovered
                          ? "var(--color-ink)"
                          : isCategoryActive
                          ? "#fafafa"
                          : "#ffffff",
                      }}
                      onMouseEnter={() => setHoveredAgent(agent.name)}
                      onMouseLeave={() => setHoveredAgent(null)}
                      animate={{
                        scale: isHovered ? 1.02 : 1,
                        zIndex: isHovered ? 10 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Connection lines on hover */}
                      {isHovered && (
                        <motion.div
                          className="absolute inset-0 border border-ink/20"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15 }}
                        />
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{agent.emoji}</span>
                        <span
                          className="text-xs font-semibold tracking-[-0.01em] truncate transition-colors duration-200"
                          style={{ color: isHovered ? "#ffffff" : "var(--color-ink)" }}
                        >
                          {agent.name}
                        </span>
                        {agent.isCreator && (
                          <motion.span
                            className="w-[5px] h-[5px] bg-ink"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ backgroundColor: isHovered ? "#ffffff" : "var(--color-ink)" }}
                          />
                        )}
                      </div>
                      <p
                        className="pixel-text text-[10px] leading-relaxed transition-colors duration-200"
                        style={{ color: isHovered ? "rgba(255,255,255,0.6)" : "var(--color-muted)" }}
                      >
                        {agent.personality}
                      </p>
                      <p
                        className="pixel-text text-[10px] mt-2 leading-relaxed transition-colors duration-200"
                        style={{ color: isHovered ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }}
                      >
                        {agent.role}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}