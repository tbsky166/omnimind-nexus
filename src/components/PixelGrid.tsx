"use client";

import { motion } from "framer-motion";

export default function PixelGrid() {
  return (
    <motion.div
      className="pixel-grid-bg"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
      aria-hidden="true"
    />
  );
}