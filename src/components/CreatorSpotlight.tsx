"use client";

import { motion } from "framer-motion";
import { creatorSteps } from "@/data/agents";

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const fadeIn = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function CreatorSpotlight() {
  return (
    <section id="creator" className="relative z-10 px-8 py-32 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-16"
      >
        <p className="pixel-text text-[10px] tracking-[0.3em] text-ink/50 uppercase mb-4">Self-Evolving Engine</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-ink mb-3">
          Creator Agent
        </h2>
        <p className="pixel-text text-sm text-ink/45 max-w-lg">
          平台不仅能使用专家，还能创造专家。Creator 是 OmniMind Nexus 区别于所有现有框架的终极差异点。
        </p>
      </motion.div>

      <motion.div
        className="space-y-0"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10%" }}
      >
        {creatorSteps.map((step, i) => (
          <motion.div
            key={step.label}
            variants={fadeIn}
            className="flex items-start gap-6 py-6 border-b border-grid last:border-b-0 group"
          >
            <div className="flex-shrink-0 flex flex-col items-center">
              <motion.div
                className="w-3 h-3 border-2 border-ink"
                whileInView={{ backgroundColor: "var(--color-ink)" }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.3 }}
              />
              {i < creatorSteps.length - 1 && (
                <div className="w-px h-10 bg-grid mt-1" />
              )}
            </div>
            <div>
              <p className="pixel-text text-[10px] tracking-[0.2em] text-ink/45 uppercase mb-1">
                Step {i + 1}
              </p>
              <h4 className="text-sm font-semibold text-ink mb-1">{step.label}</h4>
              <p className="pixel-text text-xs text-ink/40">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="mt-12 p-6 border border-grid"
      >
        <p className="pixel-text text-xs text-ink/50 leading-relaxed">
          <span className="text-ink font-semibold">自我进化的意义：</span>
          OmniMind Nexus 发布时只有 32 个 Agent。运行一年后，通过 Creator 的持续创造，Agent 市场可能增长到 500+ 个专业 Agent。平台的"全能"能力不是静态的，而是随着使用时间持续增长的动态能力。这是真正意义上的"用 AI 创造 AI"。
        </p>
      </motion.div>
    </section>
  );
}