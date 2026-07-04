"use client";

import { motion } from "framer-motion";

export default function FinalCTA() {
  return (
    <section className="relative z-10 px-8 py-32 text-center">
      {/* Pixel dot frame */}
      <div className="absolute inset-x-8 top-0 h-px bg-grid" />
      <div className="absolute left-8 top-4 w-1.5 h-1.5 bg-ink/20" />
      <div className="absolute right-8 top-4 w-1.5 h-1.5 bg-ink/20" />
      <div className="absolute left-1/2 top-6 w-1.5 h-1.5 bg-ink/15 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-ink mb-4">
          用自然语言指挥一个 AI 团队
        </h2>
        <p className="pixel-text text-sm text-ink/45 max-w-md mx-auto mb-10">
          每个人都可以拥有一个不断自我进化的 AI 团队。A2A + Creator 组合带来的未来，从今天开始。
        </p>

        <motion.a
          href="#"
          className="group relative inline-flex items-center gap-3 pixel-text text-xs tracking-[0.15em] uppercase bg-ink text-white px-10 py-3.5 hover:bg-white hover:text-ink border-2 border-ink transition-colors duration-200"
          whileHover="hover"
        >
          Get Early Access
          <motion.span
            className="inline-block"
            variants={{
              hover: { x: 3, transition: { duration: 0.2 } },
            }}
          >
            &rarr;
          </motion.span>
        </motion.a>
      </motion.div>
    </section>
  );
}