"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { protocolLayers } from "@/data/agents";

function LayerItem({
  layer,
  index,
  scrollYProgress,
}: {
  layer: (typeof protocolLayers)[0];
  index: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = index / protocolLayers.length;
  const end = (index + 1) / protocolLayers.length;
  const opacity = useTransform(scrollYProgress, [start - 0.05, start, end, end + 0.05], [0.65, 1, 1, 0.65]);
  const lineWidth = useTransform(scrollYProgress, [start - 0.05, start, end], ["0%", "100%", "100%"]);

  return (
    <motion.div
      className="group relative py-6 border-b border-grid last:border-b-0 hover:pl-3 transition-all duration-300"
      style={{ opacity }}
    >
      {/* Left active indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-ink/0 group-hover:bg-ink/30 transition-colors duration-300" />
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 w-16">
          <span className="pixel-text text-[10px] tracking-[0.2em] text-ink/45 uppercase">{layer.id}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">{layer.emoji}</span>
            <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">{layer.name}</h3>
          </div>
          <p className="pixel-text text-sm text-ink/70 mb-1">{layer.description}</p>
          <p className="pixel-text text-xs text-ink/50 leading-relaxed">{layer.detail}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-grid">
        <motion.div
          className="h-full bg-ink origin-left"
          style={{ width: lineWidth }}
        />
      </div>
    </motion.div>
  );
}

export default function ProtocolLayers() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 60%", "end 20%"],
  });

  return (
    <section
      id="protocol"
      ref={ref}
      className="relative z-10 px-8 py-32 max-w-3xl mx-auto"
      suppressHydrationWarning
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-16"
      >
        <p className="pixel-text text-[10px] tracking-[0.3em] text-ink/50 uppercase mb-4">Protocol Stack</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-ink mb-3">
          A2A 七层互信协议
        </h2>
        <p className="pixel-text text-sm text-ink/45 max-w-lg">
          让 Agent 能像人类一样社交——发现彼此、建立信任、协商分工、记住教训、解决分歧。
        </p>
      </motion.div>

      <div className="relative">
        {protocolLayers.map((layer, i) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            index={protocolLayers.length - 1 - i}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>
    </section>
  );
}