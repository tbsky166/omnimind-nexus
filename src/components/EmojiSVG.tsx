"use client";

// ═══════════════════════════════════════════════════════════════════════
// EmojiSVG — 像素风格 SVG 图标组件，替代所有 Unicode emoji
// Pixel-art style SVG icon component, replaces all Unicode emojis
// ═══════════════════════════════════════════════════════════════════════

interface EmojiSVGProps {
  emoji: string;
  size?: number;
  className?: string;
}

// ── SVG 图标路径数据 / SVG icon path data ──
// 每个图标都是 16x16 像素网格，使用简单的几何形状
// 颜色使用 #1a1a1a 作为主色，辅助色按功能区分

const EMOJI_SVGS: Record<string, { rects: Array<{ x: number; y: number; w: number; h: number; fill: string }> }> = {
  // ── 生物/基因组 / DNA ──
  "🧬": {
    rects: [
      { x: 2, y: 3, w: 2, h: 10, fill: "#8B5CF6" },
      { x: 7, y: 0, w: 2, h: 16, fill: "#3B82F6" },
      { x: 12, y: 3, w: 2, h: 10, fill: "#EC4899" },
      { x: 4, y: 5, w: 1, h: 1, fill: "#1a1a1a" },
      { x: 4, y: 8, w: 1, h: 1, fill: "#1a1a1a" },
      { x: 4, y: 11, w: 1, h: 1, fill: "#1a1a1a" },
      { x: 11, y: 4, w: 1, h: 1, fill: "#1a1a1a" },
      { x: 11, y: 7, w: 1, h: 1, fill: "#1a1a1a" },
      { x: 11, y: 10, w: 1, h: 1, fill: "#1a1a1a" },
    ],
  },
  // ── 建筑/架构 / Architecture ──
  "🏗️": {
    rects: [
      { x: 7, y: 0, w: 2, h: 4, fill: "#1a1a1a" },
      { x: 3, y: 4, w: 10, h: 2, fill: "#1a1a1a" },
      { x: 1, y: 6, w: 2, h: 10, fill: "#1a1a1a" },
      { x: 13, y: 6, w: 2, h: 10, fill: "#1a1a1a" },
      { x: 4, y: 8, w: 8, h: 2, fill: "#F59E0B" },
      { x: 4, y: 12, w: 8, h: 2, fill: "#F59E0B" },
      { x: 6, y: 6, w: 2, h: 2, fill: "#3B82F6" },
      { x: 6, y: 10, w: 2, h: 2, fill: "#3B82F6" },
    ],
  },
  // ── 键盘/编码 / Keyboard ──
  "⌨️": {
    rects: [
      { x: 2, y: 2, w: 12, h: 6, fill: "#1a1a1a" },
      { x: 2, y: 9, w: 12, h: 5, fill: "#1a1a1a" },
      { x: 3, y: 3, w: 2, h: 2, fill: "#fff" },
      { x: 7, y: 3, w: 2, h: 2, fill: "#fff" },
      { x: 11, y: 3, w: 2, h: 2, fill: "#fff" },
      { x: 3, y: 10, w: 2, h: 1.5, fill: "#fff" },
      { x: 7, y: 10, w: 2, h: 1.5, fill: "#fff" },
      { x: 11, y: 10, w: 2, h: 1.5, fill: "#fff" },
    ],
  },
  // ── 放大镜/搜索 / Magnifier ──
  "🔍": {
    rects: [
      { x: 3, y: 3, w: 8, h: 8, fill: "none" },
    ],
  },
  // ── 扳手/工具 / Wrench ──
  "🔧": {
    rects: [
      { x: 2, y: 2, w: 3, h: 3, fill: "#1a1a1a" },
      { x: 5, y: 5, w: 2, h: 11, fill: "#1a1a1a" },
      { x: 11, y: 2, w: 3, h: 3, fill: "#1a1a1a" },
      { x: 11, y: 5, w: 2, h: 11, fill: "#1a1a1a" },
    ],
  },
  // ── 试管/实验 / Test tube ──
  "🧪": {
    rects: [
      { x: 6, y: 0, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 2, w: 2, h: 12, fill: "#1a1a1a" },
      { x: 8, y: 2, w: 2, h: 12, fill: "#1a1a1a" },
      { x: 7, y: 5, w: 2, h: 6, fill: "#10B981" },
      { x: 7, y: 12, w: 2, h: 2, fill: "#10B981" },
    ],
  },
  // ── 盾牌/安全 / Shield ──
  "🛡️": {
    rects: [
      { x: 8, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 2, w: 8, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 4, w: 12, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 6, w: 14, h: 8, fill: "#1a1a1a" },
      { x: 4, y: 7, w: 10, h: 6, fill: "#3B82F6" },
      { x: 7, y: 8, w: 2, h: 4, fill: "#fff" },
      { x: 6, y: 9, w: 4, h: 2, fill: "#fff" },
    ],
  },
  // ── 闪电/性能 / Lightning ──
  "⚡": {
    rects: [
      { x: 8, y: 0, w: 3, h: 6, fill: "#1a1a1a" },
      { x: 4, y: 6, w: 10, h: 4, fill: "#1a1a1a" },
      { x: 6, y: 10, w: 3, h: 6, fill: "#1a1a1a" },
      { x: 9, y: 0, w: 1, h: 5, fill: "#F59E0B" },
      { x: 5, y: 7, w: 8, h: 2, fill: "#F59E0B" },
      { x: 7, y: 11, w: 1, h: 4, fill: "#F59E0B" },
    ],
  },
  // ── 循环/运维 / Refresh ──
  "🔄": {
    rects: [
      { x: 3, y: 3, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 11, y: 11, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 1, w: 1, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 13, w: 1, h: 2, fill: "#1a1a1a" },
      { x: 1, y: 5, w: 2, h: 1, fill: "#1a1a1a" },
      { x: 13, y: 10, w: 2, h: 1, fill: "#1a1a1a" },
      { x: 2, y: 3, w: 12, h: 2, fill: "#10B981" },
      { x: 2, y: 11, w: 12, h: 2, fill: "#10B981" },
      { x: 3, y: 5, w: 2, h: 6, fill: "#10B981" },
      { x: 11, y: 5, w: 2, h: 6, fill: "#10B981" },
    ],
  },
  // ── 柱状图/数据 / Bar chart ──
  "📊": {
    rects: [
      { x: 2, y: 10, w: 3, h: 6, fill: "#3B82F6" },
      { x: 6, y: 5, w: 3, h: 11, fill: "#10B981" },
      { x: 10, y: 2, w: 3, h: 14, fill: "#EC4899" },
      { x: 1, y: 14, w: 14, h: 2, fill: "#1a1a1a" },
    ],
  },
  // ── 上升趋势 / Trend up ──
  "📈": {
    rects: [
      { x: 2, y: 13, w: 3, h: 3, fill: "#10B981" },
      { x: 6, y: 9, w: 3, h: 7, fill: "#10B981" },
      { x: 10, y: 3, w: 3, h: 13, fill: "#10B981" },
      { x: 1, y: 14, w: 14, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 0, w: 2, h: 3, fill: "#10B981" },
      { x: 12, y: 0, w: 2, h: 1, fill: "#10B981" },
    ],
  },
  // ── 计算器 / Calculator ──
  "🧮": {
    rects: [
      { x: 2, y: 1, w: 12, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 1, w: 10, h: 1.5, fill: "#3B82F6" },
      { x: 2, y: 4, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 4, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 4, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 7, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 7, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 7, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 10, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 10, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 10, w: 3, h: 6, fill: "#EC4899" },
    ],
  },
  // ── 公文包/商业 / Briefcase ──
  "💼": {
    rects: [
      { x: 5, y: 2, w: 6, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 0, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 4, w: 12, h: 10, fill: "#1a1a1a" },
      { x: 3, y: 5, w: 10, h: 8, fill: "#8B5CF6" },
      { x: 7, y: 6, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 9, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },
  // ── 显微镜/研究 / Microscope ──
  "🔬": {
    rects: [
      { x: 7, y: 1, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 3, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 5, w: 6, h: 4, fill: "#1a1a1a" },
      { x: 6, y: 6, w: 4, h: 2, fill: "#3B82F6" },
      { x: 7, y: 9, w: 2, h: 7, fill: "#1a1a1a" },
      { x: 5, y: 13, w: 6, h: 2, fill: "#1a1a1a" },
    ],
  },
  // ── 握手/协作 / Handshake ──
  "🤝": {
    rects: [
      { x: 2, y: 6, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 4, w: 2, h: 4, fill: "#1a1a1a" },
      { x: 7, y: 5, w: 2, h: 4, fill: "#1a1a1a" },
      { x: 9, y: 4, w: 2, h: 4, fill: "#1a1a1a" },
      { x: 11, y: 6, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 7, w: 1, h: 1, fill: "#EC4899" },
      { x: 12, y: 7, w: 1, h: 1, fill: "#3B82F6" },
    ],
  },
  // ── 天平/法律 / Scales ──
  "⚖️": {
    rects: [
      { x: 7, y: 0, w: 2, h: 4, fill: "#1a1a1a" },
      { x: 1, y: 4, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 11, y: 4, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 0, y: 6, w: 6, h: 1, fill: "#1a1a1a" },
      { x: 10, y: 6, w: 6, h: 1, fill: "#1a1a1a" },
      { x: 7, y: 4, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 11, w: 2, h: 5, fill: "#1a1a1a" },
      { x: 5, y: 13, w: 6, h: 2, fill: "#1a1a1a" },
      { x: 1, y: 5, w: 3, h: 1, fill: "#10B981" },
      { x: 12, y: 5, w: 3, h: 1, fill: "#10B981" },
    ],
  },
  // ── 靶心/目标 / Target ──
  "🎯": {
    rects: [
      { x: 1, y: 1, w: 14, h: 14, fill: "#1a1a1a" },
      { x: 3, y: 3, w: 10, h: 10, fill: "#fff" },
      { x: 5, y: 5, w: 6, h: 6, fill: "#1a1a1a" },
      { x: 7, y: 7, w: 2, h: 2, fill: "#EF4444" },
    ],
  },
  // ── 钢笔/写作 / Pen ──
  "✍️": {
    rects: [
      { x: 12, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 11, y: 2, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 4, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 9, y: 6, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 8, y: 8, w: 2, h: 3, fill: "#1a1a1a" },
      { x: 7, y: 11, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 13, w: 2, h: 2, fill: "#3B82F6" },
    ],
  },
  // ── 调色板/创意 / Palette ──
  "🎨": {
    rects: [
      { x: 2, y: 2, w: 12, h: 10, fill: "#1a1a1a" },
      { x: 3, y: 3, w: 2, h: 2, fill: "#EF4444" },
      { x: 6, y: 3, w: 2, h: 2, fill: "#3B82F6" },
      { x: 9, y: 3, w: 2, h: 2, fill: "#F59E0B" },
      { x: 4, y: 6, w: 2, h: 2, fill: "#10B981" },
      { x: 8, y: 6, w: 2, h: 2, fill: "#8B5CF6" },
      { x: 6, y: 9, w: 2, h: 2, fill: "#EC4899" },
      { x: 7, y: 12, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },
  // ── 书本/教育 / Book ──
  "📚": {
    rects: [
      { x: 1, y: 2, w: 4, h: 12, fill: "#3B82F6" },
      { x: 6, y: 2, w: 4, h: 12, fill: "#10B981" },
      { x: 11, y: 2, w: 4, h: 12, fill: "#EC4899" },
      { x: 2, y: 3, w: 2, h: 1, fill: "#fff" },
      { x: 7, y: 3, w: 2, h: 1, fill: "#fff" },
      { x: 12, y: 3, w: 2, h: 1, fill: "#fff" },
      { x: 2, y: 6, w: 2, h: 1, fill: "#fff" },
      { x: 7, y: 6, w: 2, h: 1, fill: "#fff" },
      { x: 12, y: 6, w: 2, h: 1, fill: "#fff" },
      { x: 2, y: 9, w: 2, h: 1, fill: "#fff" },
      { x: 7, y: 9, w: 2, h: 1, fill: "#fff" },
      { x: 12, y: 9, w: 2, h: 1, fill: "#fff" },
    ],
  },
  // ── 地球/全球化 / Globe ──
  "🌐": {
    rects: [
      { x: 2, y: 2, w: 12, h: 12, fill: "#1a1a1a" },
      { x: 8, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 8, y: 14, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 3, w: 10, h: 10, fill: "#3B82F6" },
      { x: 7, y: 3, w: 2, h: 10, fill: "#10B981" },
      { x: 3, y: 7, w: 10, h: 2, fill: "#10B981" },
    ],
  },
  // ── 摄像机/视频 / Camera ──
  "🎬": {
    rects: [
      { x: 2, y: 3, w: 10, h: 8, fill: "#1a1a1a" },
      { x: 12, y: 5, w: 3, h: 4, fill: "#1a1a1a" },
      { x: 3, y: 4, w: 8, h: 6, fill: "#fff" },
      { x: 5, y: 5, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 9, y: 5, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 11, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 13, w: 6, h: 2, fill: "#1a1a1a" },
    ],
  },
  // ── 大脑/AI / Brain ──
  "🧠": {
    rects: [
      { x: 4, y: 2, w: 8, h: 10, fill: "#1a1a1a" },
      { x: 5, y: 3, w: 2, h: 2, fill: "#EC4899" },
      { x: 9, y: 3, w: 2, h: 2, fill: "#EC4899" },
      { x: 5, y: 6, w: 6, h: 2, fill: "#EC4899" },
      { x: 6, y: 4, w: 4, h: 2, fill: "#EC4899" },
      { x: 7, y: 9, w: 2, h: 2, fill: "#EC4899" },
      { x: 7, y: 12, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },
  // ── 游戏手柄 / Gamepad ──
  "🎮": {
    rects: [
      { x: 1, y: 4, w: 14, h: 8, fill: "#1a1a1a" },
      { x: 3, y: 2, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 2, w: 3, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 6, w: 2, h: 2, fill: "#EF4444" },
      { x: 11, y: 6, w: 2, h: 2, fill: "#3B82F6" },
      { x: 6, y: 8, w: 2, h: 1, fill: "#10B981" },
      { x: 8, y: 8, w: 2, h: 1, fill: "#F59E0B" },
    ],
  },
  // ── 手机/移动端 / Phone ──
  "📱": {
    rects: [
      { x: 4, y: 1, w: 8, h: 14, fill: "#1a1a1a" },
      { x: 5, y: 2, w: 6, h: 10, fill: "#3B82F6" },
      { x: 6, y: 13, w: 4, h: 1, fill: "#1a1a1a" },
    ],
  },
  // ── 天线/通信 / Antenna ──
  "📡": {
    rects: [
      { x: 7, y: 0, w: 2, h: 6, fill: "#1a1a1a" },
      { x: 1, y: 6, w: 14, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 8, w: 10, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 10, w: 6, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 12, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 7, w: 2, h: 1, fill: "#3B82F6" },
      { x: 12, y: 7, w: 2, h: 1, fill: "#3B82F6" },
      { x: 4, y: 9, w: 2, h: 1, fill: "#3B82F6" },
      { x: 10, y: 9, w: 2, h: 1, fill: "#3B82F6" },
    ],
  },
  // ── 数据库/存储 / Database ──
  "🗄️": {
    rects: [
      { x: 3, y: 2, w: 10, h: 3, fill: "#1a1a1a" },
      { x: 1, y: 5, w: 14, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 7, w: 10, h: 3, fill: "#1a1a1a" },
      { x: 1, y: 10, w: 14, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 12, w: 10, h: 3, fill: "#1a1a1a" },
      { x: 4, y: 3, w: 2, h: 1, fill: "#F59E0B" },
      { x: 4, y: 8, w: 2, h: 1, fill: "#F59E0B" },
      { x: 4, y: 13, w: 2, h: 1, fill: "#F59E0B" },
    ],
  },
  // ── 人群/HR / People ──
  "👥": {
    rects: [
      { x: 2, y: 2, w: 3, h: 3, fill: "#1a1a1a" },
      { x: 11, y: 2, w: 3, h: 3, fill: "#1a1a1a" },
      { x: 1, y: 5, w: 5, h: 5, fill: "#1a1a1a" },
      { x: 10, y: 5, w: 5, h: 5, fill: "#1a1a1a" },
      { x: 3, y: 6, w: 1, h: 1, fill: "#fff" },
      { x: 12, y: 6, w: 1, h: 1, fill: "#fff" },
    ],
  },
  // ── 对话气泡 / Chat bubble ──
  "💬": {
    rects: [
      { x: 2, y: 2, w: 12, h: 9, fill: "#1a1a1a" },
      { x: 3, y: 11, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 12, w: 2, h: 1, fill: "#1a1a1a" },
      { x: 3, y: 3, w: 10, h: 7, fill: "#fff" },
      { x: 5, y: 5, w: 2, h: 1, fill: "#1a1a1a" },
      { x: 8, y: 5, w: 2, h: 1, fill: "#1a1a1a" },
      { x: 5, y: 7, w: 5, h: 1, fill: "#1a1a1a" },
    ],
  },
  // ── 无障碍 / Accessibility ──
  "♿": {
    rects: [
      { x: 2, y: 2, w: 12, h: 12, fill: "#1a1a1a" },
      { x: 3, y: 3, w: 10, h: 10, fill: "#3B82F6" },
      { x: 6, y: 4, w: 2, h: 2, fill: "#fff" },
      { x: 5, y: 6, w: 4, h: 2, fill: "#fff" },
      { x: 6, y: 8, w: 2, h: 2, fill: "#fff" },
      { x: 7, y: 10, w: 2, h: 2, fill: "#fff" },
    ],
  },

  // ── 系统 emoji / System emojis ──

  // 路由器 / Router
  "🔀": {
    rects: [
      { x: 2, y: 4, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 4, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 2, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 10, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 10, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 12, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 6, w: 2, h: 4, fill: "#1a1a1a" },
      { x: 3, y: 5, w: 2, h: 1, fill: "#8B5CF6" },
      { x: 11, y: 5, w: 2, h: 1, fill: "#8B5CF6" },
      { x: 3, y: 11, w: 2, h: 1, fill: "#8B5CF6" },
      { x: 11, y: 11, w: 2, h: 1, fill: "#8B5CF6" },
    ],
  },

  // 蜜蜂/蜂群 / Bee
  "🐝": {
    rects: [
      { x: 6, y: 2, w: 4, h: 6, fill: "#1a1a1a" },
      { x: 2, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 12, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 3, w: 2, h: 4, fill: "#F59E0B" },
      { x: 5, y: 8, w: 6, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 10, w: 2, h: 2, fill: "#F59E0B" },
      { x: 9, y: 10, w: 2, h: 2, fill: "#F59E0B" },
      { x: 6, y: 12, w: 4, h: 2, fill: "#1a1a1a" },
    ],
  },

  // 对勾/质量 / Check
  "✅": {
    rects: [
      { x: 3, y: 8, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 10, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 12, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 9, y: 8, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 11, y: 4, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 4, y: 9, w: 1, h: 1, fill: "#10B981" },
      { x: 6, y: 11, w: 1, h: 1, fill: "#10B981" },
      { x: 8, y: 11, w: 1, h: 1, fill: "#10B981" },
      { x: 10, y: 7, w: 1, h: 1, fill: "#10B981" },
    ],
  },

  // 包裹/文件 / Package
  "📦": {
    rects: [
      { x: 2, y: 4, w: 12, h: 10, fill: "#1a1a1a" },
      { x: 4, y: 2, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 2, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 5, w: 10, h: 8, fill: "#8B5CF6" },
      { x: 7, y: 8, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },

  // 警告/错误 / Warning
  "⚠️": {
    rects: [
      { x: 7, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 2, w: 6, h: 2, fill: "#1a1a1a" },
      { x: 3, y: 4, w: 10, h: 2, fill: "#1a1a1a" },
      { x: 1, y: 6, w: 14, h: 6, fill: "#1a1a1a" },
      { x: 2, y: 7, w: 12, h: 4, fill: "#F59E0B" },
      { x: 7, y: 8, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 12, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },

  // 镜子/元认知 / Mirror
  "🪞": {
    rects: [
      { x: 3, y: 2, w: 6, h: 10, fill: "#1a1a1a" },
      { x: 4, y: 3, w: 4, h: 8, fill: "#3B82F6" },
      { x: 9, y: 0, w: 2, h: 14, fill: "#1a1a1a" },
      { x: 11, y: 2, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 11, y: 10, w: 4, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 4, w: 2, h: 2, fill: "#fff" },
      { x: 5, y: 7, w: 2, h: 2, fill: "#fff" },
    ],
  },

  // 用户 / User
  "👤": {
    rects: [
      { x: 6, y: 1, w: 4, h: 4, fill: "#1a1a1a" },
      { x: 2, y: 5, w: 12, h: 8, fill: "#1a1a1a" },
      { x: 3, y: 6, w: 10, h: 6, fill: "#6B7280" },
      { x: 7, y: 2, w: 2, h: 2, fill: "#fff" },
    ],
  },

  // 回形针/附件 / Paperclip
  "📎": {
    rects: [
      { x: 4, y: 1, w: 2, h: 14, fill: "#1a1a1a" },
      { x: 6, y: 1, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 8, y: 3, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 8, y: 11, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 13, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 5, y: 2, w: 1, h: 12, fill: "#9CA3AF" },
    ],
  },

  // 齿轮/系统 / Gear
  "⚙️": {
    rects: [
      { x: 7, y: 0, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 14, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 0, y: 7, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 14, y: 7, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 2, w: 12, h: 12, fill: "#1a1a1a" },
      { x: 4, y: 4, w: 8, h: 8, fill: "#fff" },
      { x: 5, y: 5, w: 6, h: 6, fill: "#1a1a1a" },
      { x: 7, y: 7, w: 2, h: 2, fill: "#fff" },
    ],
  },

  // 机器人/默认 Agent / Robot
  "🤖": {
    rects: [
      { x: 4, y: 1, w: 8, h: 4, fill: "#1a1a1a" },
      { x: 6, y: 2, w: 2, h: 2, fill: "#10B981" },
      { x: 8, y: 2, w: 2, h: 2, fill: "#10B981" },
      { x: 3, y: 5, w: 10, h: 6, fill: "#1a1a1a" },
      { x: 4, y: 6, w: 8, h: 4, fill: "#6B7280" },
      { x: 5, y: 7, w: 2, h: 2, fill: "#EF4444" },
      { x: 9, y: 7, w: 2, h: 2, fill: "#10B981" },
      { x: 5, y: 11, w: 2, h: 3, fill: "#1a1a1a" },
      { x: 9, y: 11, w: 2, h: 3, fill: "#1a1a1a" },
    ],
  },

  // 关闭/删除 / Close
  "✕": {
    rects: [
      { x: 2, y: 1, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 4, y: 3, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 5, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 8, y: 7, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 9, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 12, y: 11, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 12, y: 1, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 10, y: 3, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 8, y: 5, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 6, y: 7, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 4, y: 9, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 11, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },

  // 汉堡菜单 / Menu
  "☰": {
    rects: [
      { x: 2, y: 3, w: 12, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 7, w: 12, h: 2, fill: "#1a1a1a" },
      { x: 2, y: 11, w: 12, h: 2, fill: "#1a1a1a" },
    ],
  },

  // 工作中 / Working
  "···": {
    rects: [
      { x: 2, y: 6, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 7, y: 6, w: 2, h: 2, fill: "#1a1a1a" },
      { x: 12, y: 6, w: 2, h: 2, fill: "#1a1a1a" },
    ],
  },
};

// ── 组件 / Component ──
export default function EmojiSVG({ emoji, size = 16, className }: EmojiSVGProps) {
  const data = EMOJI_SVGS[emoji];
  if (!data) {
    // 没有对应 SVG 时回退到文本 emoji / Fallback to text emoji if no SVG
    return <span className={className} style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{ imageRendering: "pixelated", display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      aria-label={emoji}
    >
      {data.rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} shapeRendering="crispEdges" />
      ))}
    </svg>
  );
}

// 导出 emoji 映射表，方便外部判断 / Export emoji map for external use
export { EMOJI_SVGS };