"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onAchievementUnlock, getRarityColor, getRarityBg } from "@/lib/achievements";
import type { Achievement } from "@/lib/achievements";
import EmojiSVG from "@/components/EmojiSVG";

interface UnlockEvent {
  achievement: Achievement;
  agentName: string;
  id: number;
}

export default function AchievementUnlock() {
  const [queue, setQueue] = useState<UnlockEvent[]>([]);
  const [current, setCurrent] = useState<UnlockEvent | null>(null);
  let idCounter = 0;

  const handleUnlock = useCallback((achievement: Achievement, agentName: string) => {
    const evt = { achievement, agentName, id: ++idCounter };
    setQueue(prev => [...prev, evt]);
  }, []);

  useEffect(() => {
    onAchievementUnlock(handleUnlock);
  }, [handleUnlock]);

  // 逐个展示
  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setCurrent(next);
    setQueue(prev => prev.slice(1));
    const timer = setTimeout(() => setCurrent(null), 3500);
    return () => clearTimeout(timer);
  }, [queue, current]);

  const clr = current ? getRarityColor(current.achievement.rarity) : "#6366f1";
  const bg = current ? getRarityBg(current.achievement.rarity) : "#eef2ff";

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
        >
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          />

          {/* 粒子爆发效果 */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 4 + Math.random() * 8,
                  height: 4 + Math.random() * 8,
                  background: clr,
                  left: `calc(50% + ${(Math.random() - 0.5) * 10}px)`,
                  top: `calc(50% + ${(Math.random() - 0.5) * 10}px)`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: (Math.random() - 0.5) * 600,
                  y: (Math.random() - 0.5) * 600,
                }}
                transition={{ duration: 1.5 + Math.random() * 1.5, delay: Math.random() * 0.3, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* 主卡片 */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateX: 30 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateX: -20 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10 px-10 py-8 rounded-2xl text-center"
            style={{ background: bg, border: `2px solid ${clr}`, boxShadow: `0 0 60px ${clr}33, 0 20px 60px rgba(0,0,0,0.2)` }}
          >
            {/* 稀有度标签 */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block mb-3 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
              style={{ background: clr, color: "#fff" }}
            >
              {current.achievement.rarity === "legendary" ? "传奇" : current.achievement.rarity === "epic" ? "史诗" : current.achievement.rarity === "rare" ? "稀有" : "普通"}
            </motion.div>

            <p className="pixel-text text-[10px] tracking-[0.2em] text-ink/40 uppercase mb-4">成就解锁</p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl mb-4"
            >
              <EmojiSVG emoji={current.achievement.emoji} size={64} />
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-bold text-ink mb-2 tracking-[-0.01em]"
            >
              {current.achievement.name}
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pixel-text text-xs text-ink/50 mb-4"
            >
              {current.achievement.description}
            </motion.p>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pixel-text text-[10px] text-ink/30"
            >
              {current.agentName === "USER" ? "🏠 用户成就" : `🤖 ${current.agentName}`}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}