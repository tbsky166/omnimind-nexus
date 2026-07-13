"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import EmojiSVG from "@/components/EmojiSVG";

interface TopologyNode {
  id: string;
  label: string;
  count: number;
}
interface TopologyEdge {
  source: string;
  target: string;
  weight: number;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function TopologyPage() {
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const WIDTH = 700;
  const HEIGHT = 500;

  useEffect(() => {
    fetch("/api/topology")
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        const posMap = new Map<string, NodePosition>();
        const nodeCount = (data.nodes || []).length;
        (data.nodes || []).forEach((node: TopologyNode, i: number) => {
          const angle = (i / Math.max(nodeCount, 1)) * 2 * Math.PI;
          const radius = Math.min(WIDTH, HEIGHT) * 0.35;
          posMap.set(node.id, {
            id: node.id,
            x: WIDTH / 2 + Math.cos(angle) * radius,
            y: HEIGHT / 2 + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
          });
        });
        setPositions(posMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 力导向布局模拟
  const simulate = useCallback(() => {
    if (nodes.length === 0) return;
    setPositions((prev) => {
      const pos = new Map(prev);
      const posArr = Array.from(pos.values());

      // 斥力
      for (let i = 0; i < posArr.length; i++) {
        for (let j = i + 1; j < posArr.length; j++) {
          const a = posArr[i];
          const b = posArr[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 8000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (a.id !== dragging) { a.vx -= fx; a.vy -= fy; }
          if (b.id !== dragging) { b.vx += fx; b.vy += fy; }
        }
      }

      // 引力（边）
      for (const edge of edges) {
        const a = pos.get(edge.source);
        const b = pos.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = dist * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (a.id !== dragging) { a.vx += fx; a.vy += fy; }
        if (b.id !== dragging) { b.vx -= fx; b.vy -= fy; }
      }

      // 中心引力
      for (const p of posArr) {
        if (p.id === dragging) continue;
        p.vx += (WIDTH / 2 - p.x) * 0.005;
        p.vy += (HEIGHT / 2 - p.y) * 0.005;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.max(40, Math.min(WIDTH - 40, p.x));
        p.y = Math.max(30, Math.min(HEIGHT - 30, p.y));
      }

      for (const p of posArr) {
        pos.set(p.id, { ...p });
      }
      return pos;
    });

    animRef.current = requestAnimationFrame(simulate);
  }, [nodes, edges, dragging]);

  useEffect(() => {
    if (nodes.length > 0 && !loading) {
      animRef.current = requestAnimationFrame(simulate);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [simulate, nodes.length, loading]);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(nodeId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    setPositions((prev) => {
      const pos = new Map(prev);
      const node = pos.get(dragging);
      if (node) { node.x = x; node.y = y; node.vx = 0; node.vy = 0; }
      return pos;
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // 全局监听 mouseup，防止拖出 SVG 后松手丢失
  useEffect(() => {
    if (dragging) {
      const handleGlobalUp = () => setDragging(null);
      window.addEventListener("mouseup", handleGlobalUp);
      return () => window.removeEventListener("mouseup", handleGlobalUp);
    }
  }, [dragging]);

  const maxCount = Math.max(...nodes.map((n) => n.count), 1);
  const connectedNodes = new Set<string>();
  if (hoveredNode) {
    edges.forEach((e) => {
      if (e.source === hoveredNode) connectedNodes.add(e.target);
      if (e.target === hoveredNode) connectedNodes.add(e.source);
    });
  }

  return (
    <main className="relative min-h-screen bg-white">
      {/* 像素网格背景 */}
      <div className="pixel-grid-bg" />
      

      {/* 顶部导航 */}
      <nav className="nav-bar relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回</Link>
          <span className="pixel-text text-[10px] text-ink/40 uppercase tracking-[0.12em]">🌐 拓扑图</span>
          <Link href="/settings" className="nav-link">设置 →</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <div className="page-header">
          <p className="page-label">协作关系图</p>
          <h1>协作拓扑图</h1>
          <p>Agent 之间的协作关系网络。拖拽节点可调整位置，悬停高亮关联。</p>
        </div>

        {loading ? (
          <div className="pixel-text text-sm text-ink/30 text-center py-16">加载中...</div>
        ) : nodes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
            <p className="empty-title">暂无协作数据</p>
            <p className="empty-desc">Agent 协作后，这里会显示协作关系图</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {/* SVG 图表 */}
            <div
              ref={containerRef}
              className="pixel-area pixel-area-hover p-1 mb-6"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full block"
                style={{ height: "auto", minHeight: 400, background: "#fafbfc" }}
              >
                {/* 网格背景 */}
                <defs>
                  <pattern id="topoGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="800" height="500" fill="url(#topoGrid)" />

                {/* 边 */}
                {edges.map((edge, i) => {
                  const a = positions.get(edge.source);
                  const b = positions.get(edge.target);
                  if (!a || !b) return null;
                  const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;
                  const opacity = hoveredNode ? (isHighlighted ? 0.8 : 0.08) : 0.25;
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isHighlighted ? "#0f0f0f" : "#9ca3af"}
                      strokeWidth={Math.min(edge.weight * 1.5 + 1, 5)}
                      opacity={opacity}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* 节点 */}
                {nodes.map((node) => {
                  const pos = positions.get(node.id);
                  if (!pos) return null;
                  const r = 12 + (node.count / maxCount) * 20;
                  const isHovered = hoveredNode === node.id;
                  const isConnected = connectedNodes.has(node.id);
                  const isDimmed = hoveredNode && !isHovered && !isConnected;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseDown={(e) => handleMouseDown(e, node.id)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: "grab" }}
                      opacity={isDimmed ? 0.25 : 1}
                    >
                      <circle
                        r={r}
                        fill={isHovered ? "#0f0f0f" : "#ffffff"}
                        stroke={isConnected ? "#0f0f0f" : "#0f0f0f"}
                        strokeWidth={isConnected ? 2.5 : 2}
                      />
                      <text
                        textAnchor="middle"
                        dy="0.35em"
                        fontSize={Math.max(8, r * 0.35)}
                        fill={isHovered ? "#ffffff" : "#0f0f0f"}
                        style={{ fontWeight: "bold", pointerEvents: "none", fontFamily: "monospace" }}
                      >
                        {node.label.slice(0, 8)}
                      </text>
                      <text
                        textAnchor="middle"
                        dy={r + 12}
                        fontSize={9}
                        fill="#6b7280"
                        style={{ pointerEvents: "none", fontFamily: "monospace" }}
                      >
                        {node.count} 次
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* 图例 */}
            <div className="flex items-center flex-wrap gap-5 pixel-text text-[10px] text-ink/40">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-[#0f0f0f] bg-white inline-block" /> 节点大小 = 使用频率
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#0f0f0f] inline-block" /> 线条粗细 = 协作次数
              </span>
              <span className="inline-flex items-center gap-1.5">
                <EmojiSVG emoji="💡" size={12} /> 拖拽节点可调整位置
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}