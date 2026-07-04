"use client";

import { motion } from "framer-motion";

export default function PixelDivider() {
  return (
    <div className="relative z-10 flex items-center justify-center gap-1.5 py-2">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] h-[3px] bg-ink/20"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
        />
      ))}
    </div>
  );
}