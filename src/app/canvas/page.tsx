"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { callLLM, type ChatMessage } from "@/lib/prompt";
import { trackCanvasAction } from "@/lib/achievements";

// ── 类型定义 ──
interface CanvasElement {
  id: string;
  type: "path" | "rect" | "circle" | "text";
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  r?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
}

type ToolType = "pen" | "rect" | "circle" | "text" | "eraser";

const PRESET_COLORS = ["#0f0f0f", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b"];
const STORAGE_KEY = "omnimind-canvas";
const MAX_HISTORY = 50;

function generateId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── 主组件 ──
export default function CanvasPage() {
  const { settings } = useSettings();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 画布状态 ──
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [currentColor, setCurrentColor] = useState("#0f0f0f");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const [loaded, setLoaded] = useState(false);

  // ── 从 localStorage 加载 ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.elements && Array.isArray(data.elements)) {
          setElements(data.elements);
          setHistory(data.history || []);
          setHistoryIndex(data.historyIndex ?? -1);
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  // ── 保存到 localStorage ──
  const saveToStorage = useCallback((els: CanvasElement[], hist: CanvasElement[][] | null, histIdx: number | null) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          elements: els,
          history: hist ?? history,
          historyIndex: histIdx ?? historyIndex,
        }),
      );
    } catch {}
  }, [history, historyIndex]);

  // ── 推入历史记录 ──
  const pushHistory = useCallback(
    (els: CanvasElement[]) => {
      setHistory((prev) => {
        const newHist = prev.slice(0, historyIndex + 1);
        newHist.push(els);
        if (newHist.length > MAX_HISTORY) newHist.shift();
        return newHist;
      });
      setHistoryIndex((prev) => prev + 1);
      saveToStorage(els, null, null);
    },
    [historyIndex, saveToStorage],
  );

  // ── 添加元素 ──
  const addElement = useCallback(
    (el: CanvasElement) => {
      setElements((prev) => {
        const next = [...prev, el];
        pushHistory(next);
        saveToStorage(next, null, null);
        return next;
      });
      trackCanvasAction("USER");
    },
    [pushHistory, saveToStorage],
  );

  // ── 删除元素 ──
  const deleteElement = useCallback(
    (id: string) => {
      setElements((prev) => {
        const next = prev.filter((e) => e.id !== id);
        pushHistory(next);
        saveToStorage(next, null, null);
        return next;
      });
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, pushHistory, saveToStorage],
  );

  // ── 撤销/重做 ──
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    const els = history[newIdx] || [];
    setElements(els);
    setHistoryIndex(newIdx);
    saveToStorage(els, null, newIdx);
  }, [history, historyIndex, saveToStorage]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    const els = history[newIdx] || [];
    setElements(els);
    setHistoryIndex(newIdx);
    saveToStorage(els, null, newIdx);
  }, [history, historyIndex, saveToStorage]);

  // ── 清空画布 ──
  const clearCanvas = useCallback(() => {
    setElements([]);
    setSelectedId(null);
    setHistory([]);
    setHistoryIndex(-1);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // ── 获取 SVG 坐标 ──
  const getSVGPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0]?.clientX ?? 0;
        clientY = e.touches[0]?.clientY ?? 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const transformed = point.matrixTransform(ctm.inverse());
      return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
    },
    [],
  );

  // ── 鼠标/触摸事件 ──
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const point = getSVGPoint(e);

      if (currentTool === "text") {
        setTextInput({ x: point.x, y: point.y });
        setTextValue("");
        return;
      }

      if (currentTool === "eraser") {
        const hit = findElementAtPoint(point.x, point.y);
        if (hit) {
          deleteElement(hit.id);
        }
        return;
      }

      setIsDrawing(true);
      setStartPoint(point);
      setCurrentMouse(point);
      if (currentTool === "pen") {
        setCurrentPath([point]);
      }
    },
    [currentTool, getSVGPoint, deleteElement],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getSVGPoint(e);
      setCurrentMouse(point);

      if (currentTool === "pen") {
        setCurrentPath((prev) => [...prev, point]);
      }
    },
    [isDrawing, currentTool, getSVGPoint],
  );

  const handlePointerUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !startPoint) return;
      setIsDrawing(false);
      const point = currentMouse || getSVGPoint(e);
      setCurrentMouse(null);

      if (currentTool === "pen" && currentPath.length > 1) {
        addElement({
          id: generateId(),
          type: "path",
          points: currentPath,
          color: currentColor,
          strokeWidth,
        });
        setCurrentPath([]);
      } else if (currentTool === "rect") {
        const x = Math.min(startPoint.x, point.x);
        const y = Math.min(startPoint.y, point.y);
        const w = Math.abs(point.x - startPoint.x);
        const h = Math.abs(point.y - startPoint.y);
        if (w > 2 || h > 2) {
          addElement({
            id: generateId(),
            type: "rect",
            x,
            y,
            width: w,
            height: h,
            color: currentColor,
            strokeWidth,
          });
        }
      } else if (currentTool === "circle") {
        const cx = (startPoint.x + point.x) / 2;
        const cy = (startPoint.y + point.y) / 2;
        const r = Math.sqrt(
          Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2),
        ) / 2;
        if (r > 2) {
          addElement({
            id: generateId(),
            type: "circle",
            x: cx,
            y: cy,
            r,
            color: currentColor,
            strokeWidth,
          });
        }
      }

      setStartPoint(null);
    },
    [isDrawing, startPoint, currentTool, currentPath, currentColor, strokeWidth, addElement, getSVGPoint, currentMouse],
  );

  // ── 碰撞检测（用于橡皮擦和选中） ──
  function findElementAtPoint(px: number, py: number): CanvasElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "rect") {
        if (
          px >= (el.x ?? 0) &&
          px <= (el.x ?? 0) + (el.width ?? 0) &&
          py >= (el.y ?? 0) &&
          py <= (el.y ?? 0) + (el.height ?? 0)
        ) {
          return el;
        }
      } else if (el.type === "circle") {
        const dist = Math.sqrt(
          Math.pow(px - (el.x ?? 0), 2) + Math.pow(py - (el.y ?? 0), 2),
        );
        if (dist <= (el.r ?? 0) + 5) return el;
      } else if (el.type === "path" && el.points) {
        for (const pt of el.points) {
          if (Math.abs(pt.x - px) < 8 && Math.abs(pt.y - py) < 8) return el;
        }
      } else if (el.type === "text") {
        if (
          px >= (el.x ?? 0) - 5 &&
          px <= (el.x ?? 0) + 100 &&
          py >= (el.y ?? 0) - 20 &&
          py <= (el.y ?? 0) + 5
        ) {
          return el;
        }
      }
    }
    return null;
  }

  // ── 点击画布背景选中元素 ──
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDrawing) return;
      const point = getSVGPoint(e);
      const hit = findElementAtPoint(point.x, point.y);
      setSelectedId(hit ? hit.id : null);
    },
    [isDrawing, getSVGPoint],
  );

  // ── 文本输入确认 ──
  const confirmText = useCallback(() => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }
    addElement({
      id: generateId(),
      type: "text",
      x: textInput.x,
      y: textInput.y,
      text: textValue.trim(),
      color: currentColor,
      strokeWidth,
    });
    setTextInput(null);
    setTextValue("");
  }, [textInput, textValue, currentColor, strokeWidth, addElement]);

  // ── Agent 绘制 ──
  const handleAgentDraw = useCallback(async () => {
    if (!settings.apiKey) {
      setAgentMessage("请先在设置中配置 API Key");
      return;
    }

    setAgentLoading(true);
    setAgentMessage("Agent 正在思考...");

    const canvasDesc = elements.length === 0
      ? "画布当前为空。"
      : `画布上当前有 ${elements.length} 个元素：\n${elements
          .map(
            (el) =>
              `- ${el.type}: ${el.type === "text" ? `"${el.text}"` : el.type === "path" ? `${el.points?.length ?? 0} 个点的路径` : `${el.type === "rect" ? `${el.width}×${el.height}` : `半径${el.r}`}`}，颜色 ${el.color}，位置 (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)})`,
          )
          .join("\n")}`;

    const systemPrompt = `你是一个协作画布上的绘画助手。用户和一个画布工具在协作绘制。

画布尺寸为 800×500。

你需要回复 JSON 格式的绘图指令。每个指令一个元素，放在一个数组中。

指令格式：
- 矩形: { "action": "draw", "type": "rect", "x": 数字, "y": 数字, "width": 数字, "height": 数字, "color": "#颜色值", "strokeWidth": 数字 }
- 圆形: { "action": "draw", "type": "circle", "x": 数字(圆心x), "y": 数字(圆心y), "r": 数字(半径), "color": "#颜色值", "strokeWidth": 数字 }
- 文字: { "action": "draw", "type": "text", "x": 数字, "y": 数字, "text": "文字内容", "color": "#颜色值", "strokeWidth": 数字 }

可用颜色: #0f0f0f(黑), #3b82f6(蓝), #10b981(绿), #ef4444(红), #8b5cf6(紫), #f59e0b(橙)

请绘制 1-4 个有意义、美观的元素，与画布当前内容呼应。坐标必须合理，在 0-800 和 0-500 范围内。
直接输出 JSON 数组，不要其他文字。`;

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `画布当前状态：\n${canvasDesc}\n\n请添加一些绘图元素来丰富画布。`,
      },
    ];

    try {
      const result = await callLLM(
        systemPrompt,
        messages,
        settings.apiKey,
        settings.baseUrl,
        settings.model,
        2048,
      );

      const raw = result.content || "";
      // 尝试提取 JSON
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const commands = JSON.parse(jsonMatch[0]);
        if (Array.isArray(commands)) {
          const newElements: CanvasElement[] = [];
          for (const cmd of commands) {
            if (cmd.action === "draw" && (cmd.type === "rect" || cmd.type === "circle" || cmd.type === "text")) {
              const el: CanvasElement = {
                id: generateId(),
                type: cmd.type,
                x: cmd.x,
                y: cmd.y,
                color: cmd.color || "#0f0f0f",
                strokeWidth: cmd.strokeWidth || 3,
              };
              if (cmd.type === "rect") {
                el.width = cmd.width || 100;
                el.height = cmd.height || 80;
              } else if (cmd.type === "circle") {
                el.r = cmd.r || 40;
              } else if (cmd.type === "text") {
                el.text = cmd.text || "文字";
              }
              newElements.push(el);
            }
          }

          if (newElements.length > 0) {
            setElements((prev) => {
              const next = [...prev, ...newElements];
              pushHistory(next);
              saveToStorage(next, null, null);
              return next;
            });
            for (let i = 0; i < newElements.length; i++) {
              trackCanvasAction("Agent");
            }
            setAgentMessage(`Agent 添加了 ${newElements.length} 个元素！`);
          } else {
            setAgentMessage("Agent 未能生成有效绘图指令，请重试。");
          }
        }
      } else {
        setAgentMessage("Agent 返回了无效格式，请重试。");
      }
    } catch (err) {
      setAgentMessage(
        `绘制失败: ${err instanceof Error ? err.message : "未知错误"}`,
      );
    } finally {
      setAgentLoading(false);
    }
  }, [elements, settings, pushHistory, saveToStorage]);

  // ── 导出 SVG ──
  const exportSVG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── 键盘快捷键 ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && document.activeElement === document.body) {
          deleteElement(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, undo, redo, deleteElement]);

  // ── 当前绘制预览（绘制中） ──
  const renderPreview = () => {
    if (!isDrawing || !startPoint) return null;

    if (currentTool === "pen" && currentPath.length > 1) {
      const d = currentPath.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      return (
        <path
          d={d}
          fill="none"
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      );
    }

    if (currentTool === "rect" && currentMouse) {
      const x = Math.min(startPoint.x, currentMouse.x);
      const y = Math.min(startPoint.y, currentMouse.y);
      const w = Math.abs(currentMouse.x - startPoint.x);
      const h = Math.abs(currentMouse.y - startPoint.y);
      return (
        <rect
          x={x} y={y} width={w} height={h}
          fill="none"
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeDasharray="6 4"
          opacity={0.8}
        />
      );
    }

    if (currentTool === "circle" && currentMouse) {
      const cx = (startPoint.x + currentMouse.x) / 2;
      const cy = (startPoint.y + currentMouse.y) / 2;
      const r = Math.sqrt(
        Math.pow(currentMouse.x - startPoint.x, 2) +
        Math.pow(currentMouse.y - startPoint.y, 2),
      ) / 2;
      return (
        <ellipse
          cx={cx} cy={cy} rx={r} ry={r}
          fill="none"
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeDasharray="6 4"
          opacity={0.8}
        />
      );
    }

    return null;
  };

  // ── 选中元素的高亮框 ──
  const selectedElement = elements.find((e) => e.id === selectedId);

  const renderSelectionBox = () => {
    if (!selectedElement) return null;
    let bounds = { x: 0, y: 0, width: 0, height: 0 };
    if (selectedElement.type === "rect") {
      bounds = {
        x: selectedElement.x ?? 0,
        y: selectedElement.y ?? 0,
        width: selectedElement.width ?? 0,
        height: selectedElement.height ?? 0,
      };
    } else if (selectedElement.type === "circle") {
      bounds = {
        x: (selectedElement.x ?? 0) - (selectedElement.r ?? 0),
        y: (selectedElement.y ?? 0) - (selectedElement.r ?? 0),
        width: (selectedElement.r ?? 0) * 2,
        height: (selectedElement.r ?? 0) * 2,
      };
    } else if (selectedElement.type === "text") {
      bounds = {
        x: (selectedElement.x ?? 0) - 4,
        y: (selectedElement.y ?? 0) - 18,
        width: (selectedElement.text?.length ?? 0) * 10 + 8,
        height: 24,
      };
    } else if (selectedElement.type === "path" && selectedElement.points) {
      const xs = selectedElement.points.map((p) => p.x);
      const ys = selectedElement.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      bounds = {
        x: minX - 5,
        y: minY - 5,
        width: Math.max(...xs) - minX + 10,
        height: Math.max(...ys) - minY + 10,
      };
    }

    return (
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeDasharray="6 3"
        rx={2}
        pointerEvents="none"
      />
    );
  };

  // ── 渲染元素 ──
  const renderElement = (el: CanvasElement) => {
    const isSelected = el.id === selectedId;
    switch (el.type) {
      case "path":
        if (!el.points || el.points.length < 2) return null;
        const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return (
          <motion.path
            key={el.id}
            d={d}
            fill="none"
            stroke={el.color}
            strokeWidth={el.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
            style={{ cursor: "pointer" }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedId(el.id);
            }}
          />
        );
      case "rect":
        return (
          <motion.rect
            key={el.id}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            fill={el.fill || "none"}
            stroke={el.color}
            strokeWidth={el.strokeWidth}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ cursor: "pointer" }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedId(el.id);
            }}
          />
        );
      case "circle":
        return (
          <motion.ellipse
            key={el.id}
            cx={el.x}
            cy={el.y}
            rx={el.r}
            ry={el.r}
            fill={el.fill || "none"}
            stroke={el.color}
            strokeWidth={el.strokeWidth}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ cursor: "pointer" }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedId(el.id);
            }}
          />
        );
      case "text":
        return (
          <motion.text
            key={el.id}
            x={el.x}
            y={el.y}
            fill={el.color}
            fontSize={el.strokeWidth * 5 + 8}
            fontWeight="600"
            style={{ fontFamily: "var(--font-sans)", cursor: "pointer" }}
            initial={{ opacity: 0, y: (el.y ?? 0) + 10 }}
            animate={{ opacity: 1, y: el.y }}
            transition={{ duration: 0.25 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedId(el.id);
            }}
          >
            {el.text}
          </motion.text>
        );
      default:
        return null;
    }
  };

  // ── 工具栏按钮组件 ──
  const ToolButton = ({
    tool,
    icon,
    label,
  }: {
    tool: ToolType;
    icon: string;
    label: string;
  }) => (
    <button
      className={`btn-pixel px-2.5 py-1.5 text-[0.625rem] flex items-center gap-1 ${
        currentTool === tool ? "bg-ink text-white border-ink" : ""
      }`}
      onClick={() => setCurrentTool(tool)}
      title={label}
    >
      <span className="text-sm">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  if (!loaded) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <p className="empty-title">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-white">
      {/* 背景像素网格 / Background pixel grid */}
      <div className="pixel-grid-bg" />
      

      {/* 顶部导航 */}
      <nav className="nav-bar">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="nav-link">
            ← 返回
          </Link>
          <span className="pixel-text text-[0.625rem] text-muted uppercase tracking-[0.12em]">
            协作画布
          </span>
          <Link href="/settings" className="nav-link">
            设置 →
          </Link>
        </div>
      </nav>

      <div className="max-w-full mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="page-header mb-6">
          <p className="page-label">🎨 协作画布</p>
          <h1>协作画布</h1>
          <p>与 Agent 在白板上协作绘图</p>
        </div>

        {/* 工具栏 */}
        <motion.div
          className="pixel-area pixel-area-hover p-4 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* 绘图工具 */}
            <div className="flex items-center gap-1.5">
              <span className="pixel-text text-[0.5625rem] text-muted uppercase mr-1">工具</span>
              <ToolButton tool="pen" icon="✏️" label="画笔" />
              <ToolButton tool="rect" icon="⬜" label="矩形" />
              <ToolButton tool="circle" icon="⭕" label="圆形" />
              <ToolButton tool="text" icon="🔤" label="文字" />
              <ToolButton tool="eraser" icon="🧹" label="橡皮" />
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-[#e5e5e5]" />

            {/* 颜色选择器 */}
            <div className="flex items-center gap-1.5">
              <span className="pixel-text text-[0.5625rem] text-muted uppercase mr-1">颜色</span>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 border-2 transition-all duration-150 ${
                    currentColor === color
                      ? "border-[#0f0f0f]"
                      : "border-[#e5e5e5]"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                  title={color}
                />
              ))}
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-[#e5e5e5]" />

            {/* 线宽 */}
            <div className="flex items-center gap-2">
              <span className="pixel-text text-[0.5625rem] text-muted uppercase">线宽</span>
              <input
                type="range"
                min={1}
                max={10}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-20 h-1.5 accent-ink cursor-pointer"
              />
              <span className="pixel-text text-[0.625rem] text-ink w-4 tabular-nums">{strokeWidth}</span>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-[#e5e5e5]" />

            {/* 操作按钮 */}
            <div className="flex items-center gap-1.5">
              <button
                className="btn-pixel px-2 py-1.5 text-[0.625rem]"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="撤销 (Ctrl+Z)"
              >
                ↩ 撤销
              </button>
              <button
                className="btn-pixel px-2 py-1.5 text-[0.625rem]"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="重做 (Ctrl+Shift+Z)"
              >
                ↪ 重做
              </button>
              <button
                className="btn-pixel px-2 py-1.5 text-[0.625rem] text-danger"
                onClick={clearCanvas}
                disabled={elements.length === 0}
                title="清空画布"
              >
                🗑 清空
              </button>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-[#e5e5e5]" />

            {/* Agent 绘制 */}
            <button
              className="btn-pixel-dark px-3 py-1.5 text-[0.625rem] flex items-center gap-1.5"
              onClick={handleAgentDraw}
              disabled={agentLoading || !settings.apiKey}
              title={!settings.apiKey ? "请先配置 API Key" : "让 Agent 在画布上绘制"}
            >
              {agentLoading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin" />
                  绘制中...
                </>
              ) : (
                <>
                  🤖 Agent 绘制
                </>
              )}
            </button>
          </div>

          {/* Agent 消息 */}
          <AnimatePresence>
            {agentMessage && (
              <motion.div
                className="mt-3 px-3 py-2 bg-white border-2 border-[#e5e5e5] text-ink text-[0.6875rem] pixel-text"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {agentMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 主体：画布 + 侧边栏 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* SVG 画布 */}
          <motion.div
            className="flex-1 pixel-area pixel-area-hover overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div
              ref={containerRef}
              className="relative w-full"
              style={{ paddingBottom: "62.5%" /* 800:500 */ }}
            >
              <svg
                ref={svgRef}
                viewBox="0 0 800 500"
                className="absolute inset-0 w-full h-full"
                style={{
                  cursor: currentTool === "text" ? "crosshair" : currentTool === "eraser" ? "pointer" : "crosshair",
                  background: "#ffffff",
                  backgroundImage:
                    "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
                onClick={handleCanvasClick}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
            onMouseLeave={() => {
              if (isDrawing) {
                setIsDrawing(false);
                setStartPoint(null);
                setCurrentPath([]);
                setCurrentMouse(null);
              }
            }}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                {/* 网格背景 */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="800" height="500" fill="url(#grid)" />

                {/* 渲染所有元素 */}
                {elements.map(renderElement)}

                {/* 选中高亮 */}
                {renderSelectionBox()}

                {/* 绘制预览 */}
                {renderPreview()}

                {/* 文本输入提示 */}
                {textInput && (
                  <foreignObject
                    x={textInput.x}
                    y={textInput.y - 16}
                    width={200}
                    height={32}
                  >
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="px-2 py-1 text-xs border-2 border-[#0f0f0f] outline-none bg-white w-32"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmText();
                          if (e.key === "Escape") setTextInput(null);
                        }}
                        onBlur={confirmText}
                        placeholder="输入文字..."
                      />
                    </div>
                  </foreignObject>
                )}
              </svg>
            </div>
          </motion.div>

          {/* 右侧边栏 */}
          <motion.div
            className="w-full lg:w-60 shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="pixel-area pixel-area-hover p-4">
              <h2 className="section-title mb-3">📋 元素列表</h2>

              {elements.length === 0 ? (
                <div className="empty-state py-6">
                  <div className="empty-icon">✦</div>
                  <p className="empty-title">画布为空</p>
                  <p className="empty-desc">使用工具栏开始绘制</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pixel-scrollbar">
                  <AnimatePresence>
                    {elements.map((el, idx) => {
                      const typeLabel =
                        el.type === "rect"
                          ? "矩形"
                          : el.type === "circle"
                            ? "圆形"
                            : el.type === "text"
                              ? "文字"
                              : "路径";
                      const typeIcon =
                        el.type === "rect"
                          ? "⬜"
                          : el.type === "circle"
                            ? "⭕"
                            : el.type === "text"
                              ? "🔤"
                              : "✏️";
                      return (
                        <motion.div
                          key={el.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={`flex items-center gap-2 p-2 border-2 cursor-pointer transition-all duration-150 ${
                            selectedId === el.id
                              ? "border-[#0f0f0f] bg-white"
                              : "border-[#e5e5e5] hover:border-[#0f0f0f]"
                          }`}
                          onClick={() => setSelectedId(el.id)}
                        >
                          <span className="text-xs">{typeIcon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="pixel-text text-[0.625rem] text-ink truncate">
                              {typeLabel} #{idx + 1}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="w-2.5 h-2.5 border-2 border-[#e5e5e5]"
                                style={{ backgroundColor: el.color }}
                              />
                              <span className="pixel-text text-[0.5625rem] text-muted">
                                {el.strokeWidth}px
                              </span>
                              {el.type === "text" && (
                                <span className="pixel-text text-[0.5625rem] text-muted truncate">
                                  &ldquo;{el.text?.slice(0, 8)}{(el.text?.length ?? 0) > 8 ? "..." : ""}&rdquo;
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            className="text-[0.625rem] text-muted hover:text-danger transition-colors p-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                            title="删除"
                          >
                            ✕
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* 导出按钮 */}
              <div className="mt-4 pt-4 border-t-2 border-[#e5e5e5]">
                <button
                  className="btn-pixel-dark w-full text-[0.6875rem] py-2 flex items-center justify-center gap-2"
                  onClick={exportSVG}
                  disabled={elements.length === 0}
                >
                  📥 导出 SVG
                </button>

                <div className="mt-3 text-center">
                  <span className="pixel-text text-[0.5625rem] text-muted">
                    共 {elements.length} 个元素
                  </span>
                </div>
              </div>

              {/* 快捷键提示 */}
              <div className="mt-3 p-3 bg-white border-2 border-[#e5e5e5]">
                <p className="pixel-text text-[0.5625rem] text-muted mb-1.5">快捷键</p>
                <div className="space-y-1 pixel-text text-[0.5625rem] text-muted">
                  <div className="flex justify-between">
                    <span>撤销</span>
                    <span className="text-ink">Ctrl+Z</span>
                  </div>
                  <div className="flex justify-between">
                    <span>重做</span>
                    <span className="text-ink">Ctrl+Shift+Z</span>
                  </div>
                  <div className="flex justify-between">
                    <span>删除选中</span>
                    <span className="text-ink">Delete</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}