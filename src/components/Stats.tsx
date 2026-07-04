"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { stats } from "@/data/agents";

function CountUp({ value, isInView }: { value: string; isInView: boolean }) {
  const [display, setDisplay] = useState("0");
  const isNumber = value !== "∞";

  useEffect(() => {
    if (!isInView || !isNumber) {
      if (isInView && !isNumber) setDisplay(value);
      return;
    }
    const target = parseInt(value, 10);
    const duration = 800;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target).toString());
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, isNumber, value]);

  return (
    <span className="pixel-text text-4xl md:text-5xl font-bold text-ink tracking-[-0.02em]">
      {display}
    </span>
  );
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative z-10 px-8 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-grid border-y border-grid">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="px-6 py-10 text-center group"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="mb-2">
                <CountUp value={stat.value} isInView={inView} />
              </div>
              <div className="pixel-text text-[10px] tracking-[0.15em] text-ink/35 uppercase group-hover:text-ink/50 transition-colors duration-200">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}