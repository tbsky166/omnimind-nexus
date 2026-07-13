"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import EmojiSVG from "@/components/EmojiSVG";

interface EntityData {
  id: string;
  name: string;
  type: string;
  confidence: number;
  accessCount: number;
  tags: string[];
  lastAccessed: number;
  decayed: boolean;
}

interface RelationData {
  id: string;
  from: string;
  to: string;
  type: string;
  weight: number;
  confidence: number;
  context: string;
}

interface GraphData {
  stats: {
    totalEntities: number;
    totalRelations: number;
    avgConfidence: number;
    lastUpdated: number;
    sessionCount: number;
  };
  entities: EntityData[];
  relations: RelationData[];
  summary: string;
}

interface NodePos {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const WIDTH = 800;
const HEIGHT = 500;

const typeColors: Record<string, string> = {
  concept: "#3B82F6",
  person: "#8B5CF6",
  tool: "#10B981",
  file: "#F59E0B",
  decision: "#EC4899",
  error: "#EF4444",
  pattern: "#14B8A6",
};

const relationColors: Record<string, string> = {
  supports: "#10B981",
  depends_on: "#3B82F6",
  contradicts: "#EF4444",
  extends: "#8B5CF6",
  relates_to: "#9CA3AF",
  produces: "#F59E0B",
  replaces: "#EC4899",
  caused_by: "#F97316",
  prevents: "#06B6D4",
  example_of: "#14B8A6",
};

export default function KnowledgeGraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Map<string, NodePos>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    fetch("/api/knowledge-graph")
      .then((r) => r.json())
      .then((d: GraphData) => {
        setData(d);
        const posMap = new Map<string, NodePos>();
        d.entities.forEach((node, i) => {
          const angle = (i / Math.max(d.entities.length, 1)) * 2 * Math.PI;
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

  const simulate = useCallback(() => {
    if (!data || data.entities.length === 0) return;
    setPositions((prev) => {
      const pos = new Map(prev);
      const posArr = Array.from(pos.values());
      for (let i = 0; i < posArr.length; i++) {
        for (let j = i + 1; j < posArr.length; j++) {
          const a = posArr[i], b = posArr[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 5000 / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          if (a.id !== dragging) { a.vx -= fx; a.vy -= fy; }
          if (b.id !== dragging) { b.vx += fx; b.vy += fy; }
        }
      }
      for (const rel of data.relations) {
        const a = pos.get(rel.from), b = pos.get(rel.to);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = dist * 0.005;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (a.id !== dragging) { a.vx += fx; a.vy += fy; }
        if (b.id !== dragging) { b.vx -= fx; b.vy -= fy; }
      }
      for (const p of posArr) {
        if (p.id === dragging) continue;
        p.vx += (WIDTH / 2 - p.x) * 0.003;
        p.vy += (HEIGHT / 2 - p.y) * 0.003;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;
      }
      for (const p of posArr) pos.set(p.id, { ...p });
      return pos;
    });
    animRef.current = requestAnimationFrame(simulate);
  }, [data, dragging]);

  useEffect(() => {
    if (data && data.entities.length > 0 && !loading) {
      animRef.current = requestAnimationFrame(simulate);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [simulate, data, loading]);

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

  useEffect(() => {
    if (dragging) {
      const up = () => setDragging(null);
      window.addEventListener("mouseup", up);
      return () => window.removeEventListener("mouseup", up);
    }
  }, [dragging]);

  const connectedNodes = new Set<string>();
  const connectedRelations = new Set<string>();
  if (hoveredNode) {
    data?.relations.forEach((r) => {
      if (r.from === hoveredNode) { connectedNodes.add(r.to); connectedRelations.add(r.id); }
      if (r.to === hoveredNode) { connectedNodes.add(r.from); connectedRelations.add(r.id); }
    });
  }

  const selectedEntity = selectedNode ? data?.entities.find((e) => e.id === selectedNode) : null;
  const selectedRelations = selectedNode
    ? data?.relations.filter((r) => r.from === selectedNode || r.to === selectedNode)
    : [];

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pixel-grid-bg" />
      

      <nav className="nav-bar relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">← 返回</Link>
          <span className="pixel-text text-[10px] text-ink/40 uppercase tracking-[0.12em]">📊 知识图谱</span>
          <Link href="/settings" className="nav-link">设置 →</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <div className="page-header">
          <p className="page-label">Knowledge Graph</p>
          <h1>知识图谱</h1>
          <p>带遗忘曲线的语义记忆系统。Agent 协作中自动提取概念，长期未访问的知识会衰减。</p>
        </div>

        {loading ? (
          <div className="pixel-text text-sm text-ink/30 text-center py-16">加载中...</div>
        ) : !data || data.entities.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
            <p className="empty-title">图谱为空</p>
            <p className="empty-desc">Agent 协作后，知识图谱会自动填充概念和关系。</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* 图谱可视化 */}
            <div className="flex-1">
              <div
                className="pixel-area pixel-area-hover p-1"
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDragging(null)}
                onMouseLeave={() => setDragging(null)}
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  className="w-full block"
                  style={{ height: "auto", minHeight: 400, background: "#fafbfc" }}
                >
                  <defs>
                    <pattern id="kgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="800" height="500" fill="url(#kgGrid)" />

                  {/* 关系线 */}
                  {data.relations.map((rel) => {
                    const a = positions.get(rel.from);
                    const b = positions.get(rel.to);
                    if (!a || !b) return null;
                    const isHighlighted = hoveredNode === rel.from || hoveredNode === rel.to;
                    const isDimmed = hoveredNode && !connectedRelations.has(rel.id);
                    return (
                      <line
                        key={rel.id}
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        stroke={relationColors[rel.type] || "#9CA3AF"}
                        strokeWidth={Math.min(3, Math.abs(rel.weight) * 2 + 1)}
                        opacity={isDimmed ? 0.05 : isHighlighted ? 0.8 : 0.3}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* 节点 */}
                  {data.entities.map((entity) => {
                    const pos = positions.get(entity.id);
                    if (!pos) return null;
                    const r = 8 + Math.min(entity.accessCount, 20);
                    const isHovered = hoveredNode === entity.id;
                    const isConnected = connectedNodes.has(entity.id);
                    const isDimmed = hoveredNode && !isHovered && !isConnected;
                    const color = typeColors[entity.type] || "#0f0f0f";
                    return (
                      <g
                        key={entity.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onMouseDown={(e) => handleMouseDown(e, entity.id)}
                        onMouseEnter={() => setHoveredNode(entity.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => setSelectedNode(selectedNode === entity.id ? null : entity.id)}
                        style={{ cursor: "pointer" }}
                        opacity={isDimmed ? 0.2 : 1}
                      >
                        <circle
                          r={r}
                          fill={isHovered ? "#0f0f0f" : "#ffffff"}
                          stroke={color}
                          strokeWidth={isHovered || isConnected ? 2.5 : 2}
                        />
                        <text
                          textAnchor="middle"
                          dy="0.35em"
                          fontSize={Math.max(8, r * 0.45)}
                          fill={isHovered ? "#ffffff" : "#0f0f0f"}
                          style={{ fontWeight: "bold", pointerEvents: "none", fontFamily: "monospace" }}
                        >
                          {entity.name.slice(0, 6)}
                        </text>
                        {entity.decayed && (
                          <text
                            textAnchor="middle"
                            dy={r + 14}
                            fontSize={8}
                            fill="#EF4444"
                            style={{ pointerEvents: "none", fontFamily: "monospace" }}
                          >
                            衰减中
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* 图例 */}
              <div className="flex flex-wrap gap-3 mt-4">
                {Object.entries(typeColors).map(([type, color]) => (
                  <span key={type} className="badge-pixel flex items-center gap-1.5 text-[10px]">
                    <span className="w-2.5 h-2.5 border-2" style={{ borderColor: color, backgroundColor: color + "20" }} />
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* 侧边栏：统计 + 详情 */}
            <div className="w-full lg:w-72 shrink-0 space-y-4">
              {/* 统计卡片 */}
              <div className="pixel-area pixel-area-hover p-4">
                <h3 className="section-title mb-3">📊 统计</h3>
                <div className="space-y-2">
                  <div className="flex justify-between pixel-text text-[10px]">
                    <span className="text-muted">实体</span>
                    <span className="text-ink font-bold">{data.stats.totalEntities}</span>
                  </div>
                  <div className="flex justify-between pixel-text text-[10px]">
                    <span className="text-muted">关系</span>
                    <span className="text-ink font-bold">{data.stats.totalRelations}</span>
                  </div>
                  <div className="flex justify-between pixel-text text-[10px]">
                    <span className="text-muted">平均置信度</span>
                    <span className="text-ink font-bold">{(data.stats.avgConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between pixel-text text-[10px]">
                    <span className="text-muted">会话数</span>
                    <span className="text-ink font-bold">{data.stats.sessionCount}</span>
                  </div>
                </div>
              </div>

              {/* 选中节点详情 */}
              {selectedEntity && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pixel-area pixel-area-hover p-4"
                >
                  <h3 className="section-title mb-3">
                    <span className="w-2.5 h-2.5 border-2 inline-block" style={{ borderColor: typeColors[selectedEntity.type] || "#0f0f0f" }} />
                    {selectedEntity.name}
                  </h3>
                  <div className="space-y-1.5 pixel-text text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted">类型</span>
                      <span className="badge-pixel text-[9px]">{selectedEntity.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">置信度</span>
                      <span>{(selectedEntity.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">访问</span>
                      <span>{selectedEntity.accessCount} 次</span>
                    </div>
                    {selectedEntity.tags.length > 0 && (
                      <div>
                        <span className="text-muted">标签</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedEntity.tags.map((t) => (
                            <span key={t} className="badge-pixel text-[8px]">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedEntity.decayed && (
                      <div className="text-danger font-bold mt-2">⚠ 此实体正在衰减</div>
                    )}
                  </div>

                  {/* 关联关系 */}
                  {(selectedRelations ?? []).length > 0 && (
                    <div className="mt-3 pt-3 border-t-2 border-[#e5e5e5]">
                      <span className="pixel-text text-[9px] text-muted">关联关系</span>
                      <div className="space-y-1 mt-1">
                        {(selectedRelations ?? []).map((r) => {
                          const other = r.from === selectedNode ? r.to : r.from;
                          const otherEntity = data.entities.find((e) => e.id === other);
                          const color = relationColors[r.type] || "#9CA3AF";
                          const isOutgoing = r.from === selectedNode;
                          return (
                            <div key={r.id} className="flex items-center gap-1.5 pixel-text text-[9px]">
                              <span>{isOutgoing ? "→" : "←"}</span>
                              <span style={{ color }}>{r.type}</span>
                              <span className="text-ink">{otherEntity?.name || other}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 提示 */}
              <div className="pixel-area p-4">
                <p className="pixel-text text-[9px] text-muted leading-relaxed">
                  💡 拖拽节点调整位置，点击查看详情，悬停高亮关联。遗忘曲线会随时间衰减未访问的知识。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}