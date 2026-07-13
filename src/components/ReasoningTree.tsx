"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConversationMessage } from "@/data/agents";
import sprites, { type SpriteData } from "@/data/sprites";
import EmojiSVG from "@/components/EmojiSVG";

// ═══════════════════════════════════════════════════════════════
// 类型定义 / Type definitions
// ═══════════════════════════════════════════════════════════════

interface TreeNode {
  id: string;
  name: string;
  emoji: string;
  content: string;
  status: "waiting" | "active" | "done" | "error";
  children: TreeNode[];
  isUser?: boolean;
  layer?: string;
}

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreeLayout {
  nodes: LayoutNode[];
  edges: { from: LayoutNode; to: LayoutNode }[];
  totalWidth: number;
  totalHeight: number;
}

interface ReasoningTreeProps {
  messages: ConversationMessage[];
  loading: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 常量 / Constants
// ═══════════════════════════════════════════════════════════════

const NODE_WIDTH = 196;
const NODE_HEIGHT = 72;
const H_GAP = 64;
const V_GAP = 20;
const PADDING = 40;

// ═══════════════════════════════════════════════════════════════
// 像素精灵辅助函数 / Pixel sprite helpers
// ═══════════════════════════════════════════════════════════════

function getSpriteForAgent(name: string): SpriteData {
  return sprites[name] || sprites.default;
}

function getAgentPalette(name: string, basePalette: Record<string, string>): Record<string, string> {
  if (sprites[name]) return basePalette;
  return { ...basePalette, p: "#5a7da8", s: "#5a7da8", o: "#ffd5b8", e: "#fff", w: "#fff" };
}

function PixelArtSVG({ rows, size, palette }: { rows: string[]; size: number; palette: Record<string, string> }) {
  const n = rows.length;
  const cellW = size / n;
  const cellH = size / n;
  const rects: { x: number; y: number; fill: string }[] = [];
  for (let r = 0; r < n; r++) {
    const line = rows[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch !== " " && palette[ch]) rects.push({ x: c * cellW, y: r * cellH, fill: palette[ch] });
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated", display: "block" }}>
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={cellW} height={cellH} fill={r.fill} shapeRendering="crispEdges" />)}
    </svg>
  );
}

function PixelSprite({ name, size = 24, active = false }: { name: string; size?: number; active?: boolean }) {
  const sprite = getSpriteForAgent(name);
  const palette = getAgentPalette(name, sprite.palette);
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{
        width: size + 4, height: size + 4, imageRendering: "pixelated",
        border: "2px solid #374151",
        background: active ? "#064e3b" : "#1f2937",
        transition: "all 0.3s",
      }}
    >
      <PixelArtSVG rows={sprite.rows} size={size} palette={palette} />
      {active && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-gray-900"
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 状态指示器 / Status indicator
// ═══════════════════════════════════════════════════════════════

function StatusDot({ status }: { status: TreeNode["status"] }) {
  if (status === "waiting") return <span className="w-2 h-2 bg-gray-600" />;
  if (status === "active") return (
    <motion.span
      className="w-2 h-2 bg-green-500"
      animate={{ opacity: [1, 0.4, 1] }}
      transition={{ duration: 0.6, repeat: Infinity }}
    />
  );
  if (status === "done") return (
    <span className="w-2 h-2 bg-green-500 flex items-center justify-center">
      <svg width="6" height="6" viewBox="0 0 6 6"><path d="M1 3l1.5 1.5L5 1.5" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
  return <span className="w-2 h-2 bg-red-500" />;
}

// ═══════════════════════════════════════════════════════════════
// 构建树 / Build tree
// ═══════════════════════════════════════════════════════════════

function buildTree(messages: ConversationMessage[], loading: boolean): TreeNode | null {
  if (messages.length === 0) return null;

  // 找到用户任务作为根节点 / Find user task as root
  const userMsg = messages.find(m => m.isUser);
  const rootContent = userMsg?.content || "Task";
  const rootEmoji = userMsg?.emoji || "🎯";

  const root: TreeNode = {
    id: "root",
    name: "YOU",
    emoji: rootEmoji,
    content: rootContent,
    status: "done",
    children: [],
    isUser: true,
  };

  // 收集所有非用户消息，按 speaker 去重 / Collect non-user messages, deduplicate by speaker
  const seen = new Set<string>();
  const agentNodes: TreeNode[] = [];

  for (const msg of messages) {
    if (msg.isUser) continue;
    const key = msg.speaker;
    if (seen.has(key)) continue;
    seen.add(key);

    const isSystem = ["Router", "Planner", "仲裁组", "Quality Gate"].includes(msg.speaker);
    const layer = msg.a2aLayer || "";

    agentNodes.push({
      id: key,
      name: msg.speaker,
      emoji: msg.emoji || (isSystem ? "⚙️" : "🤖"),
      content: msg.content,
      status: "done",
      children: [],
      layer,
    });
  }

  // 如果正在加载，最后一个 agent 设为 active / If loading, mark last agent as active
  if (loading && agentNodes.length > 0) {
    const lastWorker = [...agentNodes].reverse().find(n => !["Router", "Planner", "仲裁组", "Quality Gate"].includes(n.name));
    if (lastWorker) lastWorker.status = "active";
    else agentNodes[agentNodes.length - 1].status = "active";
  }

  // 构建层级结构：系统 agent 在第一层，工作 agent 在第二层 / Build hierarchy
  const systemAgents = agentNodes.filter(n => ["Router", "Planner", "仲裁组", "Quality Gate"].includes(n.name));
  const workerAgents = agentNodes.filter(n => !["Router", "Planner", "仲裁组", "Quality Gate"].includes(n.name));

  if (systemAgents.length > 0) {
    // 系统 agent 作为根的直接子节点 / System agents as direct children of root
    root.children = systemAgents;

    // 工作 agent 挂到最后一个系统 agent 下 / Worker agents under last system agent
    const lastSystem = systemAgents[systemAgents.length - 1];
    if (workerAgents.length > 0) {
      lastSystem.children = workerAgents;
    }
  } else if (workerAgents.length > 0) {
    // 没有系统 agent，工作 agent 直接作为根的子节点 / No system agents, workers direct under root
    root.children = workerAgents;
  }

  return root;
}

// ═══════════════════════════════════════════════════════════════
// 计算布局 / Calculate layout
// ═══════════════════════════════════════════════════════════════

function calcSubtreeHeight(node: TreeNode): number {
  if (node.children.length === 0) return NODE_HEIGHT;
  const childrenHeight = node.children.reduce((sum, child) => sum + calcSubtreeHeight(child) + V_GAP, 0) - V_GAP;
  return Math.max(NODE_HEIGHT, childrenHeight);
}

function layoutNode(
  node: TreeNode,
  depth: number,
  yOffset: number,
  result: LayoutNode[],
  edges: { from: LayoutNode; to: LayoutNode }[]
): number {
  const x = PADDING + depth * (NODE_WIDTH + H_GAP);
  const subtreeHeight = calcSubtreeHeight(node);
  const y = yOffset + (subtreeHeight - NODE_HEIGHT) / 2;

  const layout: LayoutNode = {
    node,
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  };
  result.push(layout);

  let childY = yOffset;
  for (const child of node.children) {
    const childLayout = result.find(l => l.node.id === child.id);
    if (!childLayout) {
      const childHeight = layoutNode(child, depth + 1, childY, result, edges);
      childY += childHeight + V_GAP;
    }
  }

  // 添加边 / Add edges
  for (const child of node.children) {
    const childLayout = result.find(l => l.node.id === child.id);
    if (childLayout) {
      edges.push({ from: layout, to: childLayout });
    }
  }

  return subtreeHeight;
}

function calculateLayout(root: TreeNode): TreeLayout {
  const layoutNodes: LayoutNode[] = [];
  const edges: { from: LayoutNode; to: LayoutNode }[] = [];

  const totalHeight = layoutNode(root, 0, 0, layoutNodes, edges);

  // 计算总宽度 / Calculate total width
  const maxDepth = Math.max(...layoutNodes.map(n => {
    // 推断深度 / Infer depth
    const depth = Math.round((n.x - PADDING) / (NODE_WIDTH + H_GAP));
    return depth;
  }), 0);
  const totalWidth = PADDING * 2 + (maxDepth + 1) * (NODE_WIDTH + H_GAP) - H_GAP;

  return {
    nodes: layoutNodes,
    edges,
    totalWidth: Math.max(totalWidth, 400),
    totalHeight: Math.max(totalHeight + PADDING * 2, 200),
  };
}

// ═══════════════════════════════════════════════════════════════
// SVG 连线路径 / SVG edge path
// ═══════════════════════════════════════════════════════════════

function EdgePath({ from, to }: { from: LayoutNode; to: LayoutNode }) {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const midX = (x1 + x2) / 2;

  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <motion.path
      d={d}
      stroke="#4b5563"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// 内容截断 / Content truncation
// ═══════════════════════════════════════════════════════════════

function truncateContent(content: string, maxLen: number = 60): string {
  if (!content) return "";
  const cleaned = content.replace(/\n/g, " ").replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + "...";
}

// ═══════════════════════════════════════════════════════════════
// 主组件 / Main component
// ═══════════════════════════════════════════════════════════════

export default function ReasoningTree({ messages, loading }: ReasoningTreeProps) {
  const [expanded, setExpanded] = useState(false);

  const tree = useMemo(() => buildTree(messages, loading), [messages, loading]);
  const layout = useMemo(() => (tree ? calculateLayout(tree) : null), [tree]);

  const statusLabel = (s: TreeNode["status"]) => {
    switch (s) {
      case "waiting": return "等待";
      case "active": return "执行中";
      case "done": return "完成";
      case "error": return "错误";
    }
  };

  // 空状态 / Empty state
  if (!tree || !layout) {
    return (
      <div className="border border-gray-800 bg-gray-900/60 p-4">
        <button
          disabled
          className="flex items-center gap-2 text-gray-500 cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="pixel-text text-[10px] tracking-[0.1em] uppercase">推理树</span>
        </button>
        <div className="flex items-center justify-center py-8">
          <p className="pixel-text text-[10px] text-gray-500">暂无推理数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 bg-gray-900/60 overflow-hidden">
      {/* 标题栏 / Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <motion.svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" />
        </motion.svg>
        <span className="pixel-text text-[10px] tracking-[0.1em] uppercase text-gray-400">推理树</span>
        <span className="pixel-text text-[9px] text-gray-600 ml-2">
          {layout.nodes.length} 节点
        </span>
        {loading && (
          <motion.span
            className="ml-auto w-2 h-2 bg-green-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        {!loading && layout.nodes.length > 0 && (
          <span className="ml-auto w-2 h-2 bg-green-600" />
        )}
      </button>

      {/* 树形可视化 / Tree visualization */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="overflow-x-auto border-t border-gray-800"
              style={{ maxHeight: layout.totalHeight + 40 }}
            >
              <div
                className="relative"
                style={{ width: layout.totalWidth, height: layout.totalHeight }}
              >
                {/* SVG 连线层 / SVG edge layer */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={layout.totalWidth}
                  height={layout.totalHeight}
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4b5563" />
                      <stop offset="100%" stopColor="#6b7280" />
                    </linearGradient>
                    <filter id="edgeGlow">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {layout.edges.map((edge, i) => (
                    <EdgePath key={`edge-${i}`} from={edge.from} to={edge.to} />
                  ))}
                </svg>

                {/* 节点层 / Node layer */}
                {layout.nodes.map((ln) => {
                  const isUser = ln.node.isUser;
                  const isActive = ln.node.status === "active";
                  const isDone = ln.node.status === "done";
                  const isSystem = ["Router", "Planner", "仲裁组", "Quality Gate"].includes(ln.node.name);

                  return (
                    <motion.div
                      key={ln.node.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.05 * layout.nodes.indexOf(ln) }}
                      className="absolute"
                      style={{ left: ln.x, top: ln.y, width: ln.width, height: ln.height }}
                    >
                      <motion.div
                        className={`
                          h-full border px-3 py-2.5 flex items-center gap-2.5
                          ${isUser
                            ? "bg-gray-800 border-gray-700"
                            : isActive
                            ? "bg-gray-800 border-green-500/50"
                            : isDone
                            ? "bg-gray-800/80 border-gray-700"
                            : "bg-gray-800/80 border-red-500/50"
                          }
                          ${isSystem ? "border-dashed" : "border-solid"}
                          transition-all duration-200
                        `}
                        animate={isActive ? { opacity: [1, 0.85, 1] } : {}}
                        transition={isActive ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                      >
                        {/* 左侧：精灵图 / Left: sprite */}
                        {isUser ? (
                          <div className="w-[28px] h-[28px] bg-gray-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[8px] font-bold pixel-text">YOU</span>
                          </div>
                        ) : (
                          <PixelSprite name={ln.node.name} size={20} active={isActive} />
                        )}

                        {/* 中间：信息 / Middle: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {ln.node.emoji && !isUser && (
                              <EmojiSVG emoji={ln.node.emoji} size={10} />
                            )}
                            <span className={`pixel-text text-[9px] font-medium truncate ${isUser ? "text-gray-200" : "text-gray-300"}`}>
                              {ln.node.name}
                            </span>
                            {isSystem && (
                              <span className="pixel-text text-[7px] px-1.5 py-0.5 bg-gray-700/60 text-gray-400 border border-gray-600">
                                {ln.node.name === "Router" ? "路由" : ln.node.name === "Planner" ? "规划" : ln.node.name === "仲裁组" ? "仲裁" : "质检"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <StatusDot status={ln.node.status} />
                            <span className={`pixel-text text-[7px] ${isActive ? "text-green-400" : isDone ? "text-green-500" : "text-gray-500"}`}>
                              {statusLabel(ln.node.status)}
                            </span>
                            {ln.node.layer && (
                              <span className="pixel-text text-[7px] text-gray-600 truncate">{ln.node.layer}</span>
                            )}
                          </div>
                          {ln.node.content && (
                            <p className="pixel-text text-[8px] text-gray-500 mt-1 truncate leading-tight">
                              {truncateContent(ln.node.content)}
                            </p>
                          )}
                        </div>

                        {/* 右侧：完成标记 / Right: done check */}
                        {isDone && !isUser && (
                          <motion.div
                            className="flex-shrink-0 w-4 h-4 bg-green-500/20 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4l2 2 3-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部统计 / Footer stats */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="px-4 py-2 border-t border-gray-800 flex items-center gap-3"
        >
          <span className="pixel-text text-[8px] text-gray-500">
            {layout.nodes.length} 节点
          </span>
          <span className="text-gray-700">·</span>
          <span className="pixel-text text-[8px] text-gray-500">
            {layout.edges.length} 连线
          </span>
          <span className="text-gray-700">·</span>
          <span className="pixel-text text-[8px] text-gray-500">
            {layout.nodes.filter(n => n.node.status === "done").length} 完成
          </span>
          {loading && (
            <>
              <span className="text-gray-700">·</span>
              <span className="pixel-text text-[8px] text-green-500 flex items-center gap-1">
                <motion.span className="w-1.5 h-1.5 bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
                运行中
              </span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}