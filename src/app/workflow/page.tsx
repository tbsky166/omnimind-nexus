"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { agents } from "@/data/agents";
import type { Workflow, WorkflowNode, WorkflowEdge } from "@/lib/workflow";

/** 预设模板数据（与 workflow.ts 同步） */
const TEMPLATES = [
  { name: "需求分析管道", description: "产品需求 → 技术方案 → 代码实现 → 代码审查 → 文档生成", nodes: [{ agentName: "ProductManager", x: 50, y: 200, customPrompt: "分析用户需求，输出产品需求文档", outputFormat: "document" as const }, { agentName: "Architect", x: 250, y: 200, customPrompt: "根据需求设计技术方案和架构", outputFormat: "text" as const }, { agentName: "Coder", x: 450, y: 200, customPrompt: "根据技术方案编写代码", outputFormat: "code" as const }, { agentName: "Auditor", x: 650, y: 200, customPrompt: "审查代码质量和安全性", outputFormat: "text" as const }, { agentName: "Documenter", x: 850, y: 200, customPrompt: "生成项目文档", outputFormat: "document" as const }] },
  { name: "市场调研管道", description: "关键词分析 → 竞品调研 → 数据分析 → 策略报告", nodes: [{ agentName: "WebScout", x: 50, y: 200, customPrompt: "搜索市场信息和竞品动态", outputFormat: "text" as const }, { agentName: "DataAnalyst", x: 300, y: 200, customPrompt: "分析搜索数据，提取关键洞察", outputFormat: "text" as const }, { agentName: "Strategist", x: 550, y: 200, customPrompt: "根据数据洞察制定市场策略", outputFormat: "document" as const }] },
  { name: "代码审查管道", description: "安全扫描 → 性能分析 → 代码规范 → 修复建议", nodes: [{ agentName: "SecurityBot", x: 50, y: 200, customPrompt: "扫描代码安全漏洞", outputFormat: "text" as const }, { agentName: "CodeReviewer", x: 300, y: 200, customPrompt: "审查代码质量和规范", outputFormat: "text" as const }, { agentName: "Coder", x: 550, y: 200, customPrompt: "根据审查意见修复代码", outputFormat: "code" as const }] },
];

const NODE_W = 160;
const NODE_H = 80;
const COLORS = ["#0f0f0f", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#c026d3", "#ca8a04", "#4f46e5"];

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWf, setSelectedWf] = useState<Workflow | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const loadWorkflows = async () => {
    try {
      const res = await fetch("/api/workflow");
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (e) {
      console.error("加载工作流失败:", e);
    }
  };

  useEffect(() => { loadWorkflows(); }, []);

  const saveWorkflow = async (wf: Workflow) => {
    await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: wf.id, updates: wf }),
    });
    loadWorkflows();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newName, description: newDesc }),
    });
    const data = await res.json();
    setSelectedWf(data.workflow);
    setNewName(""); setNewDesc("");
    loadWorkflows();
  };

  const handleCreateFromTemplate = async (tpl: typeof TEMPLATES[0]) => {
    const res = await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: tpl.name, description: tpl.description }),
    });
    const data = await res.json();
    const wf = data.workflow as Workflow;

    // 添加模板节点 / Add template nodes
    const newNodes: WorkflowNode[] = [];
    const newEdges: WorkflowEdge[] = [];
    for (let i = 0; i < tpl.nodes.length; i++) {
      const n = tpl.nodes[i];
      const nodeId = `node_${Date.now()}_${i}`;
      newNodes.push({
        id: nodeId,
        agentName: n.agentName,
        x: n.x,
        y: n.y,
        customPrompt: n.customPrompt,
        outputFormat: n.outputFormat,
      });
      if (i > 0) {
        newEdges.push({
          id: `edge_${Date.now()}_${i}`,
          source: newNodes[i - 1].id,
          target: nodeId,
          condition: "always",
        });
      }
    }

    wf.nodes = newNodes;
    wf.edges = newEdges;
    wf.entryNodeId = newNodes[0]?.id || wf.entryNodeId;
    await saveWorkflow(wf);
    setSelectedWf(wf);
    setShowTemplates(false);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (selectedWf?.id === id) setSelectedWf(null);
    loadWorkflows();
  };

  const addAgentNode = (agentName: string) => {
    if (!selectedWf) return;
    const agent = agents.find((a) => a.name === agentName);
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agentName,
      x: 200 + Math.random() * 200,
      y: 100 + Math.random() * 300,
      customPrompt: agent?.description || "",
      outputFormat: "text",
    };
    const updated = { ...selectedWf, nodes: [...selectedWf.nodes, newNode] };
    setSelectedWf(updated);
    saveWorkflow(updated);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button === 2) return; // 右键忽略 / Ignore right click
    if (e.shiftKey) {
      // Shift+点击：开始连线 / Shift+click: start connecting
      setConnecting(nodeId);
      setMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    setDragging(nodeId);
    const node = selectedWf?.nodes.find((n) => n.id === nodeId);
    if (node) {
      setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    }
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging && selectedWf) {
      const updated = { ...selectedWf, nodes: selectedWf.nodes.map((n) =>
        n.id === dragging ? { ...n, x: Math.max(0, e.clientX - dragOffset.x), y: Math.max(0, e.clientY - dragOffset.y) } : n
      )};
      setSelectedWf(updated);
    }
    if (connecting) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, dragOffset, connecting, selectedWf]);

  const handleCanvasMouseUp = useCallback(() => {
    if (dragging && selectedWf) {
      saveWorkflow(selectedWf);
      setDragging(null);
    }
    if (connecting) {
      // 检查是否松在某个节点上 / Check if released on a node
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = mousePos.x - rect.left;
        const my = mousePos.y - rect.top;
        const target = selectedWf?.nodes.find((n) =>
          n.id !== connecting &&
          mx >= n.x && mx <= n.x + NODE_W &&
          my >= n.y && my <= n.y + NODE_H
        );
        if (target && selectedWf) {
          const newEdge: WorkflowEdge = {
            id: `edge_${Date.now()}`,
            source: connecting,
            target: target.id,
            condition: "always",
          };
          const updated = { ...selectedWf, edges: [...selectedWf.edges, newEdge] };
          setSelectedWf(updated);
          saveWorkflow(updated);
        }
      }
      setConnecting(null);
    }
  }, [dragging, connecting, mousePos, selectedWf]);

  const handleDeleteNode = (nodeId: string) => {
    if (!selectedWf) return;
    const updated = {
      ...selectedWf,
      nodes: selectedWf.nodes.filter((n) => n.id !== nodeId),
      edges: selectedWf.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    };
    if (selectedWf.entryNodeId === nodeId) {
      updated.entryNodeId = updated.nodes[0]?.id || "";
    }
    setSelectedWf(updated);
    saveWorkflow(updated);
  };

  const handleDeleteEdge = (edgeId: string) => {
    if (!selectedWf) return;
    const updated = { ...selectedWf, edges: selectedWf.edges.filter((e) => e.id !== edgeId) };
    setSelectedWf(updated);
    saveWorkflow(updated);
  };

  const getAgent = (name: string) => agents.find((a) => a.name === name);

  const getNodeColor = (agentName: string) => {
    const idx = agents.findIndex((a) => a.name === agentName);
    return COLORS[idx % COLORS.length];
  };

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pixel-grid-bg" />
      <nav className="nav-bar relative z-10">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 no-underline">
            <div className="w-6 h-6 bg-ink flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">N</span>
            </div>
            <span className="pixel-text text-[10px] tracking-[0.15em] text-ink/60">OmniMind</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="nav-link">Home</a>
            <a href="/workflow" className="nav-link nav-link-active">Workflow</a>
            <a href="/scheduler" className="nav-link">Scheduler</a>
            <a href="/settings" className="nav-link">Settings</a>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex h-[calc(100vh-48px)]">
        {/* 左侧面板 / Left panel */}
        <div className="w-[220px] flex-shrink-0 border-r-2 border-[#0f0f0f] bg-white flex flex-col">
          <div className="p-3 border-b-2 border-[#0f0f0f]">
            <p className="pixel-label mb-1">工作流</p>
            <div className="flex gap-1 mb-2">
              <input className="input-pixel text-[10px] py-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称" />
              <button onClick={handleCreate} className="btn-pixel-dark text-[10px] px-2 py-1 whitespace-nowrap">+ 新建</button>
            </div>
            <button onClick={() => setShowTemplates(!showTemplates)} className="btn-pixel text-[10px] w-full">
              {showTemplates ? "收起模板" : "📋 预设模板"}
            </button>
          </div>

          {showTemplates && (
            <div className="p-2 border-b-2 border-[#0f0f0f] bg-[#fafafa]">
              {TEMPLATES.map((tpl) => (
                <button key={tpl.name} onClick={() => handleCreateFromTemplate(tpl)} className="w-full text-left p-2 border-2 border-[#e5e5e5] mb-1 hover:bg-white cursor-pointer">
                  <p className="pixel-text text-[10px] font-bold">{tpl.name}</p>
                  <p className="text-[9px] text-ink/40">{tpl.description}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            <p className="pixel-label mb-2">工作流列表</p>
            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setSelectedWf(wf)}
                className={`w-full text-left p-2 border-2 mb-1 ${selectedWf?.id === wf.id ? "border-ink bg-[#fafafa]" : "border-[#e5e5e5]"}`}
              >
                <p className="pixel-text text-[10px] font-bold">{wf.name}</p>
                <p className="text-[9px] text-ink/40">{wf.nodes.length} 节点 · {wf.edges.length} 连线</p>
              </button>
            ))}
          </div>
        </div>

        {/* 主画布 / Main canvas */}
        <div className="flex-1 flex flex-col">
          {/* Agent 工具栏 / Agent toolbar */}
          <div className="border-b-2 border-[#0f0f0f] p-2 flex flex-wrap gap-1 bg-[#fafafa]">
            <span className="pixel-label text-[9px] mr-2 self-center">拖入 Agent →</span>
            {agents.map((a) => (
              <button
                key={a.name}
                onClick={() => addAgentNode(a.name)}
                disabled={!selectedWf}
                className="badge-pixel cursor-pointer disabled:opacity-30 text-[8px] px-1.5 py-0.5"
                style={{ borderColor: getNodeColor(a.name) }}
                title={a.description}
              >
                {a.emoji} {a.name}
              </button>
            ))}
          </div>

          {/* 画布 / Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-auto"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ minHeight: "500px" }}
          >
            {!selectedWf ? (
              <div className="empty-state absolute inset-0">
                <div className="empty-icon">🔀</div>
                <div className="empty-title">选择或新建一个工作流</div>
                <div className="empty-desc">从左侧创建新工作流，或使用预设模板快速开始</div>
              </div>
            ) : (
              <>
                {/* 连线 SVG / Edge SVG */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
                  {/* 已保存的连线 / Saved edges */}
                  {selectedWf.edges.map((edge) => {
                    const source = selectedWf.nodes.find((n) => n.id === edge.source);
                    const target = selectedWf.nodes.find((n) => n.id === edge.target);
                    if (!source || !target) return null;
                    const sx = source.x + NODE_W;
                    const sy = source.y + NODE_H / 2;
                    const tx = target.x;
                    const ty = target.y + NODE_H / 2;
                    const midX = (sx + tx) / 2;
                    return (
                      <g key={edge.id}>
                        <path d={`M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`} fill="none" stroke="#0f0f0f" strokeWidth="2" />
                        <polygon points={`${tx - 6},${ty - 4} ${tx},${ty} ${tx - 6},${ty + 4}`} fill="#0f0f0f" />
                        {/* 删除按钮 / Delete button */}
                        <foreignObject x={midX - 10} y={(sy + ty) / 2 - 10} width="20" height="20">
                          <button
                            className="w-5 h-5 bg-white border border-red-300 flex items-center justify-center cursor-pointer text-[10px] text-red-500 pointer-events-auto"
                            onClick={() => handleDeleteEdge(edge.id)}
                          >×</button>
                        </foreignObject>
                      </g>
                    );
                  })}
                  {/* 正在连线的临时线 / Temporary connecting line */}
                  {connecting && (() => {
                    const source = selectedWf.nodes.find((n) => n.id === connecting);
                    if (!source) return null;
                    const canvas = canvasRef.current;
                    if (!canvas) return null;
                    const rect = canvas.getBoundingClientRect();
                    const sx = source.x + NODE_W;
                    const sy = source.y + NODE_H / 2;
                    const tx = mousePos.x - rect.left;
                    const ty = mousePos.y - rect.top;
                    return (
                      <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="#0f0f0f" strokeWidth="2" strokeDasharray="4 4" />
                    );
                  })()}
                </svg>

                {/* 节点 / Nodes */}
                {selectedWf.nodes.map((node) => {
                  const agent = getAgent(node.agentName);
                  const color = getNodeColor(node.agentName);
                  const isEntry = selectedWf.entryNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      className="absolute border-2 bg-white cursor-grab active:cursor-grabbing select-none"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: NODE_W,
                        height: NODE_H,
                        borderColor: color,
                        boxShadow: isEntry ? `0 0 0 2px ${color}` : "none",
                      }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onContextMenu={(e) => { e.preventDefault(); handleDeleteNode(node.id); }}
                    >
                      {/* 入口标记 */}
                      {isEntry && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ink text-white text-[8px] px-1">入口</div>
                      )}
                      {/* 删除按钮 */}
                      <button
                        className="absolute -top-2 -right-2 w-4 h-4 bg-white border border-red-300 flex items-center justify-center cursor-pointer text-[8px] text-red-500"
                        onClick={() => handleDeleteNode(node.id)}
                      >×</button>
                      <div className="flex items-center gap-1 p-1.5 border-b border-[#e5e5e5]">
                        <span className="text-sm">{agent?.emoji || "🤖"}</span>
                        <span className="pixel-text text-[9px] font-bold truncate">{node.agentName}</span>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[8px] text-ink/40 truncate" title={node.customPrompt}>
                          {node.customPrompt.substring(0, 40)}
                        </p>
                      </div>
                      {/* 连线锚点 */}
                      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-ink bg-white rounded-full cursor-crosshair"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setConnecting(node.id);
                          setMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* 底部提示 / Bottom hint */}
          {selectedWf && (
            <div className="border-t-2 border-[#0f0f0f] p-2 bg-[#fafafa] flex items-center gap-4 text-[10px] text-ink/40">
              <span>拖拽节点移动 | Shift+拖拽锚点连线 | 右键删除节点 | 点击连线上的 × 删除连线</span>
              <span>节点数: {selectedWf.nodes.length} | 连线数: {selectedWf.edges.length}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}