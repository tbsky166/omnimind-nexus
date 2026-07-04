"use client";

import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.6,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
};

function CTAButton() {
  return (
    <motion.a
      href="#protocol"
      className="group relative inline-flex items-center gap-3 pixel-text text-xs tracking-[0.15em] uppercase bg-ink text-white px-8 py-3 hover:bg-white hover:text-ink border-2 border-ink transition-colors duration-200"
      whileHover="hover"
    >
      Explore A2A Protocol
      <motion.span
        className="inline-block"
        variants={{
          hover: { x: 3, transition: { duration: 0.2 } },
        }}
      >
        &rarr;
      </motion.span>
    </motion.a>
  );
}

export default function Hero() {
  return (
    <section className="relative z-10 flex flex-col justify-center min-h-[calc(100svh-56px)] px-8 pt-16">
      <motion.div
        className="max-w-2xl"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="pixel-text text-[10px] tracking-[0.3em] text-ink/40 uppercase mb-8"
        >
          A2A Protocol &middot; 32 Agents &middot; Self-Evolving
        </motion.p>

        <motion.h1 variants={fadeUp} className="mb-6">
          <span className="block text-[13vw] md:text-[8rem] font-bold tracking-[-0.03em] leading-[0.85] text-ink">
            OmniMind
          </span>
          <span className="block text-[13vw] md:text-[8rem] font-bold tracking-[-0.03em] leading-[0.85] text-ink">
            Nexus
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="pixel-text text-sm md:text-base text-ink/50 max-w-md leading-relaxed mb-10"
        >
          你提需求，它自己组织一个 A2A AI 团队来干。
          32 个专业 Agent，7 层互信协议，无限自我进化。
        </motion.p>

        <motion.div variants={fadeUp}>
          <CTAButton />
        </motion.div>
      </motion.div>

      {/* Decorative pixel matrix */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-1">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="flex gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 + i * 0.06, duration: 0.3 }}
          >
            {[...Array(10)].map((_, j) => {
              const isActive = (i + j) % 3 === 0 || (i * j) % 7 === 0;
              return (
                <motion.div
                  key={j}
                  className="w-[5px] h-[5px]"
                  style={{
                    backgroundColor: isActive ? "var(--color-ink)" : "var(--color-grid-hover)",
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: isActive ? [0.6, 1, 0.6] : 0.5,
                    scale: 1,
                  }}
                  transition={{
                    opacity: {
                      delay: 1 + i * 0.06 + j * 0.03,
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    scale: { delay: 1 + i * 0.06 + j * 0.03, duration: 0.2 },
                  }}
                />
              );
            })}
          </motion.div>
        ))}
      </div>
    </section>
  );
}