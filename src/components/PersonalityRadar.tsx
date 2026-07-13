"use client";

import { motion } from "framer-motion";
import type { PersonalityTraits } from "@/lib/personality";

// ── 雷达图组件 / Radar chart component ──
export default function PersonalityRadar({
  traits,
  size = 180,
  color = "#3b82f6",
  animate = true,
}: {
  traits: PersonalityTraits;
  size?: number;
  color?: string;
  animate?: boolean;
}) {
  const center = size / 2;
  const radius = size * 0.35;
  const labels = ["创造力", "严谨度", "风险偏好", "协作性", "表达欲"];
  const keys: (keyof PersonalityTraits)[] = ["creativity", "precision", "riskTolerance", "collaboration", "expressiveness"];
  const values = keys.map((k) => traits[k] / 100);

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
    const x = center + radius * Math.cos(angle) * value;
    const y = center + radius * Math.sin(angle) * value;
    return { x, y };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    const points = keys.map((_, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
      const x = center + radius * Math.cos(angle) * level;
      const y = center + radius * Math.sin(angle) * level;
      return `${x},${y}`;
    });
    return points.join(" ");
  });

  const axisLines = keys.map((_, i) => {
    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x1: center, y1: center, x2: x, y2: y };
  });

  const dataPoints = keys.map((_, i) => getPoint(i, values[i]));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* 网格 */}
      {gridPolygons.map((points, i) => (
        <polygon
          key={`grid-${i}`}
          points={points}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={i === 3 ? 1.5 : 0.5}
          strokeDasharray={i < 3 ? "3 3" : "0"}
        />
      ))}

      {/* 轴线 */}
      {axisLines.map((line, i) => (
        <line key={`axis-${i}`} {...line} stroke="#e5e7eb" strokeWidth={0.5} />
      ))}

      {/* 数据多边形 */}
      {animate ? (
        <motion.polygon
          points={dataPolygon}
          fill={`${color}20`}
          stroke={color}
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      ) : (
        <polygon
          points={dataPolygon}
          fill={`${color}20`}
          stroke={color}
          strokeWidth={2}
        />
      )}

      {/* 数据点 */}
      {dataPoints.map((point, i) => (
        animate ? (
          <motion.circle
            key={`dot-${i}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          />
        ) : (
          <circle key={`dot-${i}`} cx={point.x} cy={point.y} r={4} fill={color} />
        )
      ))}

      {/* 标签 */}
      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
        const labelR = radius + 22;
        const lx = center + labelR * Math.cos(angle);
        const ly = center + labelR * Math.sin(angle);
        return (
          <text
            key={`label-${i}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink/50"
            style={{ fontSize: "10px", fontFamily: "monospace" }}
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

// ── 迷你进化历史 / Mini evolution history ──
export function PersonalityEvolution({
  personality,
}: {
  personality: import("@/lib/personality").AgentPersonality;
}) {
  if (personality.history.length < 2) return null;

  const recent = personality.history.slice(-5);
  const first = personality.history[0];
  const last = personality.history[personality.history.length - 1];

  const changedKeys = (Object.keys(last.traits) as (keyof PersonalityTraits)[])
    .filter((k) => Math.abs(last.traits[k] - first.traits[k]) >= 5);

  if (changedKeys.length === 0) return null;

  return (
    <div className="mt-3 p-3 border-2 border-[#0f0f0f] bg-white">
      <p className="pixel-text text-[10px] tracking-[0.1em] uppercase text-ink/40 mb-2">性格进化</p>
      <div className="space-y-1.5">
        {changedKeys.map((key) => {
          const labelMap: Record<string, string> = {
            creativity: "创造力",
            precision: "严谨度",
            riskTolerance: "风险偏好",
            collaboration: "协作性",
            expressiveness: "表达欲",
          };
          const delta = last.traits[key] - first.traits[key];
          const isUp = delta > 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="pixel-text text-[9px] text-ink/50 w-14">{labelMap[key]}</span>
              <div className="flex-1 h-1.5 bg-ink/10 relative">
                <div
                  className={`h-full ${isUp ? "bg-green-500" : "bg-red-400"}`}
                  style={{ width: `${Math.abs(delta)}%` }}
                />
              </div>
              <span className={`pixel-text text-[9px] ${isUp ? "text-green-600" : "text-red-500"}`}>
                {isUp ? "+" : ""}{delta}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}