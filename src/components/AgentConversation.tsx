"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { conversationScenarios } from "@/data/agents";
import type { ConversationScenario, ConversationMessage } from "@/data/agents";

// ── Pixel color palette ──
const agentColors: Record<string, { bg: string; border: string; text: string; primary: string; secondary: string; skin: string }> = {
  Router:         { bg: "#f0f0f0", border: "#888", text: "#333", primary: "#555", secondary: "#999", skin: "#ffd5b8" },
  Planner:        { bg: "#faf5e8", border: "#c4a44a", text: "#5c4a1f", primary: "#8b6914", secondary: "#c4a44a", skin: "#ffd5b8" },
  "仲裁组":        { bg: "#f5f0fa", border: "#8b6fc4", text: "#3d2a6e", primary: "#5b3e96", secondary: "#8b6fc4", skin: "#ffd5b8" },
  "Quality Gate":  { bg: "#e8faf0", border: "#4ac48b", text: "#1f5c3a", primary: "#2d8a5e", secondary: "#4ac48b", skin: "#ffd5b8" },
  default:         { bg: "#f5f7fa", border: "#5a7da8", text: "#2a3d5c", primary: "#3a5d8a", secondary: "#5a7da8", skin: "#ffd5b8" },
};

function getColor(name: string) {
  return agentColors[name] || agentColors.default;
}

// ── Pixel art: 8x8 grid → SVG at arbitrary size ──
type PixelGrid = (string | null)[][];

function PixelArtSVG({ grid, size, palette }: { grid: PixelGrid; size: number; palette: Record<string, string> }) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const cellW = size / cols;
  const cellH = size / rows;
  const rects: { x: number; y: number; fill: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = grid[r][c];
      if (color && palette[color]) {
        rects.push({ x: c * cellW, y: r * cellH, fill: palette[color] });
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated", display: "block" }}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={cellW} height={cellH} fill={r.fill} shapeRendering="crispEdges" />
      ))}
    </svg>
  );
}

// ── Agent pixel art definitions (8x8 grids) ──
// Palette: p=primary s=secondary w=white e=accent d=dark
const agentSprites: Record<string, { grid: PixelGrid; palette: Record<string, string> }> = {
  // Router: compass
  Router: {
    grid: [
      [null, null, null, "w", "w", null, null, null],
      [null, null, "w", "d", "d", "w", null, null],
      [null, "w", "d", "w", "w", "d", "w", null],
      ["w",  "d", "w", "d", "d", "w", "d", "w"],
      ["w",  "d", "w", "d", "d", "w", "d", "w"],
      [null, "w", "d", "w", "w", "d", "w", null],
      [null, null, "w", "d", "d", "w", null, null],
      [null, null, null, "w", "w", null, null, null],
    ],
    palette: { w: "#fff", d: "#333" },
  },
  // Planner: clipboard
  Planner: {
    grid: [
      ["d", "d", "d", "d", "d", "d", "d", "d"],
      ["d", "w", "w", "w", "w", "w", "w", "d"],
      ["d", "w", "s", "w", "w", "s", "w", "d"],
      ["d", "w", "w", "w", "w", "w", "w", "d"],
      ["d", "d", "d", "d", "d", "d", "d", "d"],
      ["d", "w", "w", "w", "w", "w", "w", "d"],
      ["d", "w", "s", "w", "w", "s", "w", "d"],
      ["d", "w", "w", "w", "w", "w", "w", "d"],
    ],
    palette: { w: "#fff", d: "#8b6914", s: "#c4a44a" },
  },
  // 仲裁组: scales
  "仲裁组": {
    grid: [
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, null, null, "p", "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#5b3e96" },
  },
  // Quality Gate: shield
  "Quality Gate": {
    grid: [
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "w", "w", "w", "w", "w", "p"],
      ["p",  "w", "w", "w", "p", "w", "w", "p"],
      [null, "p", "w", "p", "w", "w", "p", null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#2d8a5e" },
  },
  // 编码 Agent: code brackets </>
  "编码 Agent": {
    grid: [
      ["p", null, null, null, null, null, null, "p"],
      ["p", "p", null, null, null, null, "p", "p"],
      [null, "p", null, "w", "w", null, "p", null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", null, "w", "w", null, "p", null],
      ["p", "p", null, null, null, null, "p", "p"],
      ["p", null, null, null, null, null, null, "p"],
    ],
    palette: { w: "#fff", p: "#3a5d8a" },
  },
  // 架构师: castle/building
  "架构师": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "p", "w", "w", "p", "w", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#5a4a7a" },
  },
  // 审查 Agent: magnifying glass
  "审查 Agent": {
    grid: [
      [null, "p", "p", "p", "p", null, null, null],
      ["p",  "w", "w", "w", "p", null, null, null],
      ["p",  "w", "w", "e", "p", null, null, null],
      ["p",  "w", "w", "w", "p", null, null, null],
      [null, "p", "p", "p", "p", "p", null, null],
      [null, null, null, null, "p", "p", "p", null],
      [null, null, null, null, null, "p", "p", "p"],
      [null, null, null, null, null, null, "p", "p"],
    ],
    palette: { w: "#fff", p: "#6a8a5a", e: "#333" },
  },
  // 重构 Agent: wrench
  "重构 Agent": {
    grid: [
      [null, null, null, null, "p", "p", null, null],
      [null, null, null, "p", "w", "w", "p", null],
      [null, null, "p", "p", "p", "w", "p", null],
      [null, null, "p", "w", "p", "p", null, null],
      [null, "p", "p", "w", "p", null, null, null],
      ["p",  "w", "p", "w", "p", null, null, null],
      ["p",  "w", "p", "p", "p", null, null, null],
      [null, "p", "p", null, null, null, null, null],
    ],
    palette: { w: "#fff", p: "#8a6a3a" },
  },
  // 测试 Agent: flask
  "测试 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "w", "w", "w", "w", "w", "p"],
      ["p",  "w", "w", "e", "e", "w", "w", "p"],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#4a8a6a", e: "#3a6a4a" },
  },
  // 安全 Agent: shield (different design)
  "安全 Agent": {
    grid: [
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      ["p",  "w", "w", "p", "w", "w", "w", "p"],
      [null, "p", "w", "w", "p", "w", "p", null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#8a3a3a" },
  },
  // 性能 Agent: lightning bolt
  "性能 Agent": {
    grid: [
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "p", "p", null, null, null],
      [null, "p", "p", "p", "p", null, null, null],
      ["p",  "p", "p", "w", "p", "p", null, null],
      [null, null, "p", "p", "p", "p", "p", null],
      [null, null, null, "p", "p", "p", "p", "p"],
      [null, null, null, null, "p", "p", "p", null],
      [null, null, null, null, null, "p", null, null],
    ],
    palette: { w: "#fff", p: "#c4a44a" },
  },
  // 运维 Agent: gear
  "运维 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "p", "p", "w", "p", null],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#5a6a8a" },
  },
  // 数据分析: bar chart
  "数据分析": {
    grid: [
      [null, "p", null, "p", null, "p", null, null],
      [null, "p", null, "p", null, "p", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, "w", "p", "w", "p", "w", null, null],
      [null, "w", "p", "w", "p", "w", null, null],
      [null, "w", "p", "w", "p", "w", null, null],
      [null, "w", "p", "w", "p", "w", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
    ],
    palette: { w: "#fff", p: "#4a6a8a" },
  },
  // 策略 Agent: chess knight
  "策略 Agent": {
    grid: [
      [null, null, "p", "p", "p", null, null, null],
      [null, "p", "w", "w", "p", null, null, null],
      [null, "p", "w", "w", "p", null, null, null],
      ["p",  "p", "p", "p", "p", "p", null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, "p", "p", "p", "p", "p", null],
      [null, null, null, null, "p", "p", "p", "p"],
    ],
    palette: { w: "#fff", p: "#6a5a4a" },
  },
  // 财务 Agent: coin
  "财务 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#c4a43a" },
  },
  // 产品 Agent: lightbulb
  "产品 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "p", "w", "p", "p", "w", "p", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#c4a43a" },
  },
  // 市场研究: target
  "市场研究": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "p", "p", "w", "p", null],
      ["p",  "w", "p", "w", "w", "p", "w", "p"],
      ["p",  "p", "w", "p", "p", "w", "p", "p"],
      ["p",  "p", "w", "p", "p", "w", "p", "p"],
      ["p",  "w", "p", "w", "w", "p", "w", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#4a6a8a" },
  },
  // 谈判 Agent: handshake
  "谈判 Agent": {
    grid: [
      [null, "p", null, null, null, null, "p", null],
      ["p",  "w", "p", null, null, "p", "w", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "p", null, null, "p", "w", "p"],
      [null, "p", null, null, null, null, "p", null],
    ],
    palette: { w: "#fff", p: "#5a6a5a" },
  },
  // 法律 Agent: gavel
  "法律 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "p", null, null, "p", "w", "p"],
      [null, "p", "p", null, null, "p", "p", null],
      [null, null, "p", null, null, "p", null, null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#5a3a3a" },
  },
  // 项目管理: target
  "项目管理": {
    grid: [
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "p", "w", "w", "p", "w", "p"],
      ["p",  "p", "w", "w", "w", "w", "p", "p"],
      ["p",  "p", "w", "w", "w", "w", "p", "p"],
      ["p",  "w", "p", "w", "w", "p", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
    ],
    palette: { w: "#fff", p: "#4a6a6a" },
  },
  // 写作 Agent: pen
  "写作 Agent": {
    grid: [
      [null, null, null, null, null, null, "p", "p"],
      [null, null, null, null, null, "p", "w", "p"],
      [null, null, null, null, "p", "w", "w", "p"],
      [null, null, null, "p", "w", "p", "p", null],
      [null, null, "p", "w", "p", null, null, null],
      ["p",  "p", "p", "p", "p", null, null, null],
      ["p",  "w", "w", "w", "p", null, null, null],
      [null, "p", "p", "p", null, null, null, null],
    ],
    palette: { w: "#fff", p: "#3a5a5a" },
  },
  // 设计 Agent: palette
  "设计 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "e", "s", "p", "w", "p", null],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "w", "p", "e", "s", "p", "w", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#5a4a6a", e: "#8a3a3a", s: "#3a6a8a" },
  },
  // 教育 Agent: book
  "教育 Agent": {
    grid: [
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
    ],
    palette: { w: "#fff", p: "#4a4a8a" },
  },
  // 翻译 Agent: globe
  "翻译 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "p", "p", "w", "p", null],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#3a6a4a" },
  },
  // 多媒体 Agent: film
  "多媒体 Agent": {
    grid: [
      ["p", "p", "p", "p", "p", "p", "p", "p"],
      ["p", "w", "w", "p", "p", "w", "w", "p"],
      ["p", "w", "w", "p", "p", "w", "w", "p"],
      ["p", "p", "p", "p", "p", "p", "p", "p"],
      ["p", "w", "p", "p", "p", "p", "w", "p"],
      ["p", "p", "w", "p", "p", "w", "p", "p"],
      ["p", "p", "p", "w", "w", "p", "p", "p"],
      ["p", "p", "p", "p", "p", "p", "p", "p"],
    ],
    palette: { w: "#fff", p: "#5a3a6a" },
  },
  // AI/ML Agent: brain/circuit
  "AI/ML Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "p", "p", "w", "p", null],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#5a3a6a" },
  },
  // 游戏 Agent: controller
  "游戏 Agent": {
    grid: [
      [null, "p", "p", null, null, "p", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "p", null, null, "p", "w", "p"],
      [null, "p", null, null, null, null, "p", null],
    ],
    palette: { w: "#fff", p: "#3a5a3a" },
  },
  // 移动端 Agent: phone
  "移动端 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#3a3a3a" },
  },
  // IoT Agent: antenna
  "IoT Agent": {
    grid: [
      [null, null, null, null, "p", null, null, null],
      [null, null, null, "p", "w", "p", null, null],
      [null, null, "p", "w", "p", "w", "p", null],
      [null, null, null, "p", "p", null, null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
    ],
    palette: { w: "#fff", p: "#4a6a4a" },
  },
  // 数据库 Agent: database
  "数据库 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      ["p",  "p", "w", "w", "w", "w", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "p", "w", "w", "w", "w", "p", "p"],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#3a5a6a" },
  },
  // 社媒 Agent: speech bubble
  "社媒 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      [null, "p", "w", "w", "w", "w", "p", null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
      [null, null, null, null, "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#5a4a6a" },
  },
  // HR Agent: people
  "HR Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "e", "p", "p", "e", "p", null],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      [null, "p", "p", null, null, "p", "p", null],
      [null, "p", null, null, null, null, "p", null],
    ],
    palette: { w: "#fff", p: "#5a4a8a", e: "#fff" },
  },
  // 客服 Agent: headset
  "客服 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "w", "p", "w", "w", "p", "w", "p"],
      [null, "p", "p", "p", "p", "p", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "p", null, null, "p", "p", null],
      [null, "p", "p", null, null, "p", "p", null],
    ],
    palette: { w: "#fff", p: "#4a6a6a" },
  },
  // 科研 Agent: microscope
  "科研 Agent": {
    grid: [
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "w", "w", "p", null, null],
      [null, "p", "w", "w", "w", "w", "p", null],
      ["p",  "w", "w", "p", "p", "w", "w", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      [null, null, "p", "p", "p", "p", null, null],
      [null, null, "p", "p", "p", "p", null, null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#3a5a5a" },
  },
  // 无障碍 Agent: accessibility
  "无障碍 Agent": {
    grid: [
      [null, null, "p", "p", "p", "p", null, null],
      [null, "p", "w", "p", "p", "w", "p", null],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "p", "p", "w", "w", "p", "p", "p"],
      ["p",  "w", "p", "p", "p", "p", "w", "p"],
      [null, "p", "w", "p", "p", "w", "p", null],
      [null, null, "p", "p", "p", "p", null, null],
    ],
    palette: { w: "#fff", p: "#4a8a8a" },
  },
  // Creator: star
  "Creator": {
    grid: [
      [null, null, null, "p", "p", null, null, null],
      [null, null, "p", "w", "w", "p", null, null],
      ["p",  "p", "w", "w", "w", "w", "p", "p"],
      ["p",  "w", "w", "w", "w", "w", "w", "p"],
      ["p",  "w", "w", "w", "w", "w", "w", "p"],
      ["p",  "p", "w", "w", "w", "w", "p", "p"],
      [null, null, "p", "w", "w", "p", null, null],
      [null, null, null, "p", "p", null, null, null],
    ],
    palette: { w: "#fff", p: "#c4a43a" },
  },
  // Default: RPG character (fallback)
  default: {
    grid: [
      [null, null, "o", "o", "o", "o", null, null],
      [null, "p", "p", "p", "p", "p", "p", null],
      ["p",  "p", "e", "p", "p", "e", "p", "p"],
      ["p",  "p", "p", "p", "p", "p", "p", "p"],
      [null, "s", "s", "s", "s", "s", "s", null],
      [null, "s", "s", "w", "s", "s", "w", null],
      [null, "s", "s", "s", "s", "s", "s", null],
      [null, "s", "s", null, null, "s", "s", null],
    ],
    palette: { p: "#3a5d8a", s: "#5a7da8", e: "#fff", o: "#ffd5b8", w: "#fff" },
  },
};

function getSpriteForAgent(name: string): { grid: PixelGrid; palette: Record<string, string> } {
  if (agentSprites[name]) return agentSprites[name];
  return agentSprites.default;
}

// Customize colors per agent — only for the default (shared) sprite
function getAgentPalette(name: string, basePalette: Record<string, string>): Record<string, string> {
  // Named sprites have their own unique colors — don't override
  if (agentSprites[name]) return basePalette;
  // Default sprite: customize with agent's category colors
  const clr = getColor(name);
  return {
    ...basePalette,
    p: clr.primary,
    s: clr.secondary,
    o: clr.skin,
    e: "#fff",
    w: "#fff",
  };
}

// ── Pixel character sprite (SVG pixel art) ──
function PixelSprite({ name, size = 48, active = false }: { name: string; size?: number; active?: boolean }) {
  const sprite = getSpriteForAgent(name);
  const palette = getAgentPalette(name, sprite.palette);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size + 8,
        height: size + 8,
        imageRendering: "pixelated",
        border: "2px solid #1a1a1a",
        background: active ? "#e8ffe8" : "#fafafa",
        boxShadow: active ? "0 0 0 2px #4a4, 0 0 8px #4a4" : "2px 2px 0 #ccc",
        transition: "all 0.3s",
      }}
    >
      <PixelArtSVG grid={sprite.grid} size={size} palette={palette} />
      {active && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-green-500"
          style={{ imageRendering: "pixelated" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ── SVG item icons for tool cards ──
function DocxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#185abd" />
      <rect x="3" y="0" width="7" height="3" fill="#4a8df0" />
      <rect x="3" y="10" width="10" height="2" fill="#fff" opacity="0.2" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.6" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.4" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">DOC</text>
    </svg>
  );
}

function XlsxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#107c41" />
      <rect x="3" y="0" width="7" height="3" fill="#4ac48b" />
      <rect x="3" y="10" width="10" height="2" fill="#fff" opacity="0.2" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.6" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.4" />
      <text x="4" y="13" fontSize="4" fontWeight="bold" fill="#fff" fontFamily="monospace">XLS</text>
    </svg>
  );
}

function FileIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="0" width="10" height="14" rx="1" fill="#555" />
      <rect x="3" y="0" width="7" height="3" fill="#888" />
      <rect x="5" y="5" width="6" height="2" fill="#fff" opacity="0.4" />
      <rect x="5" y="8" width="4" height="1" fill="#fff" opacity="0.3" />
      <rect x="5" y="10" width="5" height="1" fill="#fff" opacity="0.25" />
    </svg>
  );
}

function ToolIcon({ type, size = 24 }: { type: string; size?: number }) {
  if (type === "xlsx") return <XlsxIcon size={size} />;
  if (type === "docx") return <DocxIcon size={size} />;
  return <FileIcon size={size} />;
}

// ── Pipe segment between nodes ──
function Pipe({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-center flex-shrink-0" style={{ width: 24, height: 6 }}>
      <div
        className="w-full"
        style={{
          height: 3,
          background: active ? "#4a4" : "#aaa",
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          transition: "background 0.3s",
        }}
      />
      {active && (
        <motion.div
          className="absolute"
          style={{ width: 4, height: 4, background: "#4f4", marginLeft: 10 }}
          animate={{ x: [0, 16, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ── Pipeline Node ──
interface PipelineNodeData {
  id: string;
  name: string;
  emoji: string;
  layer: string;
  status: "waiting" | "active" | "done" | "error";
  content: string;
  toolCalls: ConversationMessage[];
}

function PipelineNode({
  node,
  isStreaming,
}: {
  node: PipelineNodeData;
  isStreaming: boolean;
}) {
  const clr = getColor(node.name);
  const isSystem = node.name === "Router" || node.name === "Planner" || node.name === "仲裁组" || node.name === "Quality Gate";
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll bubble to bottom
  useEffect(() => {
    if (bubbleRef.current) {
      bubbleRef.current.scrollTop = bubbleRef.current.scrollHeight;
    }
  }, [node.content, isStreaming]);

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 80, maxWidth: 140 }}>
      {/* Character sprite */}
      <PixelSprite name={node.name} active={node.status === "active"} />

      {/* Name plate */}
      <div
        className="mt-1 px-2 py-0.5 text-center"
        style={{
          background: node.status === "done" ? clr.bg : (node.status === "active" ? "#e8ffe8" : "#fafafa"),
          border: "1.5px solid #1a1a1a",
          boxShadow: "1px 1px 0 #ccc",
          imageRendering: "pixelated",
        }}
      >
        <p className="pixel-text text-[8px] tracking-[0.1em] text-ink/80 font-semibold leading-tight">
          {node.name}
        </p>
        <p className="pixel-text text-[7px] tracking-[0.15em] text-ink/35">{node.layer}</p>
      </div>

      {/* Status indicator */}
      <div className="mt-0.5">
        {node.status === "waiting" && (
          <span className="pixel-text text-[7px] text-ink/20">···</span>
        )}
        {node.status === "active" && (
          <motion.span
            className="pixel-text text-[7px] text-green-700 font-bold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            WORKING
          </motion.span>
        )}
        {node.status === "done" && (
          <span className="pixel-text text-[7px] text-green-700">✓ DONE</span>
        )}
        {node.status === "error" && (
          <span className="pixel-text text-[7px] text-red-600">✕ ERR</span>
        )}
      </div>

      {/* Speech bubble for content */}
      <AnimatePresence>
        {(node.content || node.toolCalls.length > 0) && node.status !== "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 w-full"
          >
            {/* Speech bubble */}
            <div
              className="relative px-2.5 py-2 text-left"
              style={{
                background: isSystem ? "#fafafa" : "#fff",
                border: "1.5px solid #1a1a1a",
                boxShadow: "2px 2px 0 #ddd",
                imageRendering: "pixelated",
              }}
            >
              {/* Bubble tail */}
              <div
                className="absolute -top-[6px] left-1/2 -translate-x-1/2"
                style={{
                  width: 0, height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "6px solid #1a1a1a",
                }}
              />
              <div
                className="absolute -top-[4px] left-1/2 -translate-x-1/2"
                style={{
                  width: 0, height: 0,
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderBottom: "5px solid #fff",
                }}
              />

              {node.content && (
                <div
                  ref={bubbleRef}
                  className="pixel-scrollbar pixel-text text-[8px] leading-relaxed text-ink/75 overflow-y-auto"
                  style={{
                    maxHeight: 120,
                    scrollbarWidth: "thin",
                    scrollbarColor: "#aaa #f0f0f0",
                  }}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {node.content}
                    {isStreaming && (
                      <motion.span
                        className="inline-block w-[2px] h-[8px] bg-ink/60 ml-0.5 align-middle"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      />
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Tool call cards */}
            {node.toolCalls.map((tc, i) => (
              <a
                key={i}
                href={tc.fileUrl}
                download={tc.downloadName}
                className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 border-2 border-ink bg-white hover:bg-ink hover:text-white transition-all duration-200 group cursor-pointer"
                style={{ boxShadow: "2px 2px 0 #ddd" }}
              >
                <ToolIcon type={tc.fileFormat || "file"} size={20} />
                <div className="flex-1 min-w-0">
                  <p className="pixel-text text-[7px] tracking-[0.05em] text-ink/60 group-hover:text-white/70 truncate">
                    {tc.downloadName}
                  </p>
                  <p className="pixel-text text-[6px] text-ink/30 group-hover:text-white/40">
                    {tc.toolAction || "DOWNLOAD"}
                  </p>
                </div>
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pipeline View ──
function PipelineView({
  messages,
  loading,
}: {
  messages: ConversationMessage[];
  loading: boolean;
}) {
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest node
  useEffect(() => {
    if (pipelineRef.current) {
      pipelineRef.current.scrollLeft = pipelineRef.current.scrollWidth;
    }
  }, [messages]);

  // Build pipeline from messages
  const nodes = useMemo(() => {
    const result: PipelineNodeData[] = [];
    const seen = new Set<string>();

    // User node
    const userMsg = messages.find((m) => m.isUser);
    if (userMsg) {
      result.push({
        id: "user", name: "YOU", emoji: "👤", layer: "INPUT",
        status: "done", content: userMsg.content.slice(0, 60),
        toolCalls: [],
      });
    }

    for (const msg of messages) {
      if (msg.isUser || msg.isSystem === false && !msg.a2aLayer) continue;

      const name = msg.speaker;
      const layer = msg.a2aLayer || "";
      const nodeId = `${name}_${layer}`;

      if (seen.has(nodeId)) {
        // Update existing node
        const existing = result.find((n) => n.id === nodeId);
        if (existing) {
          if (msg.fileUrl) {
            existing.toolCalls.push(msg);
          } else {
            existing.content = msg.content;
          }
          if (existing.status !== "active") existing.status = "done";
        }
        continue;
      }

      seen.add(nodeId);

      const isSystem = msg.isSystem || false;
      result.push({
        id: nodeId,
        name,
        emoji: msg.emoji || (isSystem ? "⚙️" : "🤖"),
        layer,
        status: "done",
        content: msg.content,
        toolCalls: msg.fileUrl ? [msg] : [],
      });
    }

    // Mark the last agent node as active if loading
    if (loading && result.length > 0) {
      const lastAgent = [...result].reverse().find((n) =>
        n.name !== "Router" && n.name !== "Planner" && n.name !== "YOU" && n.name !== "仲裁组" && n.name !== "Quality Gate"
      );
      if (lastAgent) {
        lastAgent.status = "active";
      } else {
        result[result.length - 1].status = "active";
      }
    }

    return result;
  }, [messages, loading]);

  if (nodes.length === 0) return null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Pipeline scroll area */}
      <div
        ref={pipelineRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-4"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 19px, #f0f0f0 19px, #f0f0f0 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #f0f0f0 19px, #f0f0f0 20px)",
          imageRendering: "pixelated",
        }}
      >
        <div className="flex items-start gap-0 min-w-max pb-4">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex items-start">
              {i > 0 && <Pipe active={node.status === "active"} />}
              <PipelineNode
                node={node}
                isStreaming={loading && i === nodes.length - 1 && node.status === "active"}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MessageBubble (for DemoChat, kept as-is) ──
const layerColors: Record<string, string> = {
  L1: "border-l-[#d4d4d4]", L2: "border-l-[#bfbfbf]", L3: "border-l-[#a3a3a3]",
  L4: "border-l-[#8a8a8a]", L5: "border-l-[#707070]", L6: "border-l-[#525252]", L7: "border-l-[#1a1a1a]",
};

function MessageBubble({ msg, index, isStreaming = false }: {
  msg: ConversationMessage; index: number; isStreaming?: boolean;
}) {
  const isUser = msg.isUser;
  const isSystem = msg.isSystem;
  const isFile = !!msg.fileUrl;
  const layerClass = msg.a2aLayer ? layerColors[msg.a2aLayer] || "" : "";
  const fmt = msg.fileFormat || msg.downloadName?.split(".").pop() || "docx";
  const isXlsx = fmt === "xlsx";
  const isDocx = fmt === "docx";
  const isDocFile = isXlsx || isDocx;

  if (isFile) {
    const actionLabel = msg.toolAction || (isXlsx ? "生成 XLSX 文档" : isDocx ? "生成 DOCX 文档" : "工具调用");
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center my-4 max-w-[380px] w-full mx-auto"
      >
        <div className="flex items-center gap-2 mb-1.5 self-start px-1">
          <span className="pixel-text text-[9px] tracking-[0.18em] uppercase text-ink/55 font-semibold">
            🔧 {actionLabel}
          </span>
          <span className="pixel-text text-[9px] text-ink/30">— {msg.speaker}</span>
        </div>
        <a
          href={msg.fileUrl} download={msg.downloadName}
          className="flex items-center gap-4 px-5 py-3.5 border-2 border-ink bg-white hover:bg-ink hover:text-white transition-all duration-200 group w-full cursor-pointer text-left"
        >
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-gray-300 transition-colors duration-200"
            style={{ backgroundColor: isDocFile ? (isXlsx ? "rgba(16,124,65,0.06)" : "rgba(24,90,189,0.06)") : "rgba(40,40,40,0.04)" }}>
            {isDocFile ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill={isXlsx ? "#107c41" : "#185abd"} stroke="currentColor" strokeWidth="1.5" style={{ transition: "fill 0.2s" }} />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <text x={isXlsx ? "6" : "5"} y="17" fontSize={isXlsx ? "6.5" : "5.5"} fontWeight="bold" fill="white" style={{ transition: "fill 0.2s" }}>{isXlsx ? "xls" : "doc"}</text>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6" />
                <text x="7" y="18" fontSize="6" fontWeight="bold" fill="currentColor" stroke="none">{fmt.slice(0, 3)}</text>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="pixel-text text-[11px] tracking-[0.1em] text-ink/70 group-hover:text-white/70 truncate">{msg.downloadName}</p>
            <p className="pixel-text text-[9px] tracking-[0.15em] uppercase text-ink/35 group-hover:text-white/50 mt-0.5">{fmt.toUpperCase()} — Click to download</p>
          </div>
          <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center border border-gray-300 transition-colors duration-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs select-none ${isSystem ? "opacity-50" : ""}`}>{msg.emoji}</div>
      <div className={`max-w-[80%] md:max-w-[65%] px-4 py-2.5 border-l-2 ${isUser ? "bg-ink text-white border-l-ink" : isSystem ? "bg-[#fafafa] text-ink/50 border-l-grid" : `bg-white text-ink/80 ${layerClass}`}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`pixel-text text-[10px] tracking-[0.12em] ${isUser ? "text-white/60" : isSystem ? "text-ink/45" : "text-ink/50"}`}>{msg.speaker}</span>
          {msg.a2aLayer && <span className="pixel-text text-[9px] tracking-[0.15em] text-ink/40">{msg.a2aLayer}</span>}
        </div>
        <p className={`text-xs leading-relaxed ${isUser ? "text-white/90" : ""}`}>
          {msg.content}
          {isStreaming && <motion.span className="inline-block w-[2px] h-[10px] bg-ink/60 ml-0.5 align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
        </p>
      </div>
    </motion.div>
  );
}

// ── Live Chat Component ──
interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number; messageCount: number; }

function LiveChat() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/sessions").then((r) => r.json()).then((d) => { if (d.sessions) setSessions(d.sessions); }).catch(() => {});
  }, []);

  const refreshSessions = useCallback(async () => {
    try { const r = await fetch("/api/sessions"); const d = await r.json(); if (d.sessions) setSessions(d.sessions); } catch {}
  }, []);

  const saveSession = useCallback(async (msgs: ConversationMessage[], sessionId: string) => {
    if (msgs.length === 0 || !sessionId) return;
    const title = msgs.find((m) => m.isUser)?.content?.slice(0, 60) || "New Session";
    setSaving(true);
    try {
      await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, title, messages: msgs }) });
      await refreshSessions();
    } catch {}
    setSaving(false);
  }, [refreshSessions]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshSessions();
      if (id === currentSessionId) { setCurrentSessionId(""); setMessages([]); setUploadedFile(null); }
    } catch {}
  }, [currentSessionId, refreshSessions]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/sessions?id=${encodeURIComponent(id)}&load=1`);
      const d = await r.json();
      if (d.session?.messages) { setMessages(d.session.messages); setCurrentSessionId(id); setShowSessions(false); }
    } catch {}
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["docx", "doc", "xlsx", "xls"].includes(ext)) { setError(`不支持的文件类型 .${ext}`); return; }
    setUploading(true); setError(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const data = await res.json();
      setUploadedFile({ name: file.name, content: data.content, type: data.type });
      setMessages((prev) => [...prev, { speaker: "System", emoji: "📎", content: `已上传：${file.name}`, isSystem: true }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, []);

  const handleSend = useCallback(async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setError(null); setLoading(true);
    const sessionId = currentSessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (!currentSessionId) setCurrentSessionId(sessionId);

    const userMsg: ConversationMessage = { speaker: "YOU", emoji: "👤", content: uploadedFile ? `[${uploadedFile.name}] ${text}` : text, isUser: true };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const body: Record<string, unknown> = { message: text, history: messages };
      if (uploadedFile) body.fileContext = uploadedFile.content;
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed?.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.streaming === "delta" && parsed.delta) {
                setMessages((prev) => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: last.content + parsed.delta }]; return prev; });
                continue;
              }
              if (parsed.streaming === "start") {
                setMessages((prev) => [...prev, { speaker: parsed.speaker || "Agent", emoji: parsed.emoji || "🤖", content: "", a2aLayer: parsed.a2aLayer, isSystem: false, isUser: false }]);
                continue;
              }
              if (parsed.streaming === "end") {
                setMessages((prev) => { const last = prev[prev.length - 1]; if (last && !last.fileUrl) return [...prev.slice(0, -1), { ...last, content: parsed.content || last.content, speaker: parsed.speaker || last.speaker, emoji: parsed.emoji || last.emoji, a2aLayer: parsed.a2aLayer || last.a2aLayer }]; return prev; });
                continue;
              }
              if (parsed.speaker && (parsed.content || parsed.fileUrl)) {
                setMessages((prev) => [...prev, { speaker: parsed.speaker, emoji: parsed.emoji || "🤖", content: parsed.content || "", a2aLayer: parsed.a2aLayer, isSystem: parsed.isSystem || false, isUser: false, fileUrl: parsed.fileUrl, downloadName: parsed.downloadName, fileFormat: parsed.fileFormat, toolName: parsed.toolName, toolAction: parsed.toolAction }]);
              }
            } catch {}
          }
        }
      } catch (e) { console.error("Stream read error:", e); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setMessages((prev) => [...prev, { speaker: "System", emoji: "⚠️", content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`, isSystem: true }]);
    } finally {
      setLoading(false);
      setMessages((prev) => { saveSession(prev, sessionId); return prev; });
    }
  }, [input, loading, messages, uploadedFile, currentSessionId, saveSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); };
  const handleNewSession = () => { setMessages([]); setCurrentSessionId(""); setUploadedFile(null); setError(null); setShowSessions(false); };
  const formatDate = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Session header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-ink bg-[#fafafa]">
        <button onClick={() => setShowSessions(!showSessions)} className="pixel-text text-[10px] tracking-[0.1em] text-ink/50 hover:text-ink transition-colors">
          {showSessions ? "✕ CLOSE" : "☰ HISTORY"}{sessions.length > 0 && <span className="text-ink/30 ml-0.5">({sessions.length})</span>}
        </button>
        <span className="text-ink/15">|</span>
        <button onClick={handleNewSession} className="pixel-text text-[10px] tracking-[0.1em] text-ink/50 hover:text-ink transition-colors">+ NEW</button>
        {currentSessionId && <><span className="text-ink/15">|</span><span className="pixel-text text-[9px] text-ink/30 truncate max-w-[140px]">{messages.find((m) => m.isUser)?.content?.slice(0, 30) || "SESSION"}</span></>}
        {saving && <span className="pixel-text text-[9px] text-ink/25 ml-auto">SAVING...</span>}
        {error && <span className="pixel-text text-[9px] text-red-500 ml-auto truncate max-w-[200px]">{error}</span>}
      </div>

      {/* Session list */}
      {showSessions && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-b-2 border-ink bg-white overflow-y-auto max-h-[200px]">
          {sessions.length === 0 ? (
            <p className="pixel-text text-[10px] text-ink/25 text-center py-6">NO SAVED SESSIONS</p>
          ) : sessions.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-grid/50 last:border-0 hover:bg-[#fafafa] transition-colors cursor-pointer ${s.id === currentSessionId ? "bg-[#f5f5f5]" : ""}`}
              onClick={() => loadSession(s.id)}>
              <span className="text-xs">💬</span>
              <div className="flex-1 min-w-0">
                <p className="pixel-text text-[11px] text-ink/70 truncate">{s.title}</p>
                <p className="pixel-text text-[9px] text-ink/35 mt-0.5">{formatDate(s.updatedAt)} · {s.messageCount} msg</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="pixel-text text-[10px] text-ink/25 hover:text-red-500 transition-colors px-1">✕</button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Pipeline view */}
      <PipelineView messages={messages} loading={loading} />

      {/* Input */}
      <div className="border-t-2 border-ink p-4 bg-[#fafafa]">
        {uploadedFile && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <span className="text-xs">📎</span>
            <span className="pixel-text text-[10px] text-ink/60">{uploadedFile.name}</span>
            <span className="pixel-text text-[9px] text-ink/30 uppercase">{uploadedFile.type}</span>
            <button onClick={() => { setUploadedFile(null); setMessages((prev) => [...prev, { speaker: "System", emoji: "📎", content: `已移除：${uploadedFile.name}`, isSystem: true }]); }} className="pixel-text text-[10px] text-ink/40 hover:text-ink ml-auto">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".docx,.doc,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading}
            className="pixel-text text-[11px] bg-white border-2 border-ink px-3 py-2.5 hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ boxShadow: "2px 2px 0 #ccc" }}>{uploading ? "···" : "📎"}</button>
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={uploadedFile ? "分析这份文件..." : "输入任务，启动 Agent 流水线..."}
            className="flex-1 pixel-text text-xs bg-white border-2 border-ink px-4 py-2.5 outline-none focus:shadow-[2px_2px_0_#ccc] transition-shadow placeholder:text-ink/25" disabled={loading} />
          <button type="button" onClick={(e) => handleSend(e)} disabled={loading || !input.trim()}
            className="pixel-text text-[11px] tracking-[0.15em] uppercase bg-ink text-white px-6 py-2.5 hover:bg-white hover:text-ink border-2 border-ink transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ boxShadow: "2px 2px 0 #ccc" }}>SEND</button>
        </div>
      </div>
    </div>
  );
}

// ── Demo Chat Component ──
function DemoChat({ scenario }: { scenario: ConversationScenario }) {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const totalMessages = scenario.messages.length;

  const startConversation = useCallback(() => { setHasStarted(true); setVisibleMessages(0); }, []);
  useEffect(() => { if (!hasStarted) return; setVisibleMessages(0); const timer = setInterval(() => { setVisibleMessages((prev) => { if (prev < totalMessages) return prev + 1; clearInterval(timer); return prev; }); }, 700); return () => clearInterval(timer); }, [hasStarted, totalMessages]);
  useEffect(() => { const el = messagesContainerRef.current; if (el) el.scrollTop = el.scrollHeight; }, [visibleMessages]);

  return (
    <div className="flex flex-col h-[500px]">
      <div ref={messagesContainerRef} className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
        <div key={scenario.id}>{scenario.messages.slice(0, visibleMessages).map((msg, i) => (<MessageBubble key={i} msg={msg} index={i} />))}</div>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-grid bg-[#fafafa]">
        <div className="flex items-center gap-3">
          {!hasStarted || visibleMessages >= totalMessages ? (
            <button onClick={startConversation} className="pixel-text text-[10px] tracking-[0.15em] uppercase text-ink/60 hover:text-ink transition-colors flex items-center gap-1.5">
              <span className="w-0 h-0 border-l-[7px] border-l-ink/60 border-y-[5px] border-y-transparent" />{visibleMessages >= totalMessages ? "REPLAY" : "PLAY"}</button>
          ) : (
            <span className="flex items-center gap-2 pixel-text text-[10px] tracking-[0.15em] text-ink/45 uppercase">
              <motion.span className="w-1.5 h-3 bg-ink/30 inline-block" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} />Running...</span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-3">
          {["L1", "L2", "L3", "L4", "L5", "L6", "L7"].map((layer) => (
            <div key={layer} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5" style={{ backgroundColor: layer === "L7" ? "#1a1a1a" : layer === "L6" ? "#525252" : layer === "L5" ? "#707070" : layer === "L4" ? "#8a8a8a" : layer === "L3" ? "#a3a3a3" : layer === "L2" ? "#bfbfbf" : "#d4d4d4" }} />
              <span className="pixel-text text-[9px] text-ink/40">{layer}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
const allTabs = [...conversationScenarios.map((s) => ({ id: s.id, subtitle: s.subtitle, title: s.title, isLive: false })), { id: "live", subtitle: "Real-time", title: "Live", isLive: true }];

function ScenarioTab({ tab, isActive, onClick, index }: { tab: (typeof allTabs)[0]; isActive: boolean; onClick: () => void; index: number }) {
  return (
    <motion.button onClick={onClick}
      className={`relative flex-1 text-left px-5 py-4 border-b-2 transition-colors duration-200 ${isActive ? "border-ink" : "border-grid hover:border-grid-hover"}`}
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.08 }}>
      <div className="flex items-center gap-2">
        <span className={`block pixel-text text-[11px] tracking-[0.15em] uppercase mb-1 ${isActive ? "text-ink" : "text-ink/40"}`}>{tab.subtitle}</span>
        {tab.isLive && <span className="w-[5px] h-[5px] bg-ink animate-pulse" />}
      </div>
      <span className={`block text-sm font-semibold tracking-[-0.01em] ${isActive ? "text-ink" : "text-ink/50"}`}>{tab.title}</span>
    </motion.button>
  );
}

export default function AgentConversation() {
  const [activeIndex, setActiveIndex] = useState(allTabs.length - 1);
  const activeTab = allTabs[activeIndex];
  const liveDescription = "输入任意任务，真实的 LLM 将驱动多个 Agent 通过 A2A 协议协作完成。需要配置 OPENAI_API_KEY。";

  return (
    <section className="relative z-10 px-8 py-32 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} className="mb-16">
        <p className="pixel-text text-[10px] tracking-[0.3em] text-ink/50 uppercase mb-4">Live Demo</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-ink mb-3">Agent 对话系统演示</h2>
        <p className="pixel-text text-sm text-ink/45 max-w-lg">观察 A2A 协议如何驱动多个 Agent 之间进行真实的发现、协商、辩论、仲裁与联邦决策。</p>
      </motion.div>
      <motion.div className="flex flex-wrap border-b border-grid mb-8" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
        {allTabs.map((tab, i) => (<ScenarioTab key={tab.id} tab={tab} isActive={activeIndex === i} onClick={() => setActiveIndex(i)} index={i} />))}
      </motion.div>
      <motion.p key={activeTab.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="pixel-text text-[11px] text-ink/50 leading-relaxed mb-8 px-1">
        {activeTab.isLive ? liveDescription : conversationScenarios[activeIndex].description}
      </motion.p>
      <div className="border-2 border-ink bg-white overflow-hidden" style={{ boxShadow: "4px 4px 0 #1a1a1a" }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-ink bg-[#fafafa]">
          <div className="flex gap-1.5">
            <div className={`w-3 h-3 ${activeTab.isLive ? "bg-green-600" : "bg-ink"}`} style={{ imageRendering: "pixelated" }} />
            <div className="w-3 h-3 bg-grid-hover" style={{ imageRendering: "pixelated" }} />
            <div className="w-3 h-3 bg-grid" style={{ imageRendering: "pixelated" }} />
          </div>
          <span className="pixel-text text-[10px] tracking-[0.15em] text-ink/45 ml-2">a2a://{activeTab.id}.omnimind.nexus</span>
          {activeTab.isLive && <span className="pixel-text text-[9px] text-green-700 ml-2">● LIVE</span>}
        </div>
        {activeTab.isLive ? <LiveChat key="live" /> : <DemoChat key={activeTab.id} scenario={conversationScenarios[activeIndex]} />}
      </div>
    </section>
  );
}