// ═══════════════════════════════════════════════════════════════
// 工作流编排引擎 — 拖拽式 Agent 管道定义
// 参考 OpenClaw 的 Workflow + Hermes 的 Multi-Agent 编排
// ═══════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";

export interface WorkflowNode {
  id: string;
  agentName: string;
  /** 节点在画布上的位置 / Node position on canvas */
  x: number;
  y: number;
  /** 自定义提示词 / Custom prompt for this node */
  customPrompt: string;
  /** 输出格式 / Output format */
  outputFormat: "text" | "code" | "document" | "file";
}

export interface WorkflowEdge {
  id: string;
  source: string;  // 源节点 ID / Source node ID
  target: string;  // 目标节点 ID / Target node ID
  /** 传递条件 / Pass condition: "always" | "on_success" | "on_output_contains" */
  condition: "always" | "on_success" | "on_output_contains";
  conditionValue?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  /** 入口节点 ID / Entry node ID (the first node to execute) */
  entryNodeId: string;
  /** 创建时间 / Creation time */
  createdAt: number;
  /** 最后修改 / Last modified */
  updatedAt: number;
  /** 执行次数 / Execution count */
  runCount: number;
  /** 是否发布的模板 / Whether it's a published template */
  isTemplate: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getWorkflowsPath(userId: string): string {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "workflows.json");
}

/** 加载所有工作流 / Load all workflows */
export function loadWorkflows(userId: string): Workflow[] {
  try {
    const filePath = getWorkflowsPath(userId);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 保存工作流 / Save workflows */
export function saveWorkflows(userId: string, workflows: Workflow[]): void {
  const filePath = getWorkflowsPath(userId);
  fs.writeFileSync(filePath, JSON.stringify(workflows, null, 2), "utf-8");
}

/** 创建新工作流 / Create a new workflow */
export function createWorkflow(userId: string, name: string, description: string): Workflow {
  const workflows = loadWorkflows(userId);
  const entryNodeId = `node_${Date.now()}`;
  const workflow: Workflow = {
    id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    description,
    nodes: [
      {
        id: entryNodeId,
        agentName: "Router",
        x: 100,
        y: 200,
        customPrompt: "分析用户输入，分发任务",
        outputFormat: "text",
      },
    ],
    edges: [],
    entryNodeId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runCount: 0,
    isTemplate: false,
  };
  workflows.push(workflow);
  saveWorkflows(userId, workflows);
  return workflow;
}

/** 更新工作流 / Update a workflow */
export function updateWorkflow(userId: string, id: string, updates: Partial<Workflow>): Workflow | null {
  const workflows = loadWorkflows(userId);
  const idx = workflows.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  workflows[idx] = { ...workflows[idx], ...updates, updatedAt: Date.now() };
  saveWorkflows(userId, workflows);
  return workflows[idx];
}

/** 删除工作流 / Delete a workflow */
export function deleteWorkflow(userId: string, id: string): boolean {
  const workflows = loadWorkflows(userId);
  const filtered = workflows.filter((w) => w.id !== id);
  if (filtered.length === workflows.length) return false;
  saveWorkflows(userId, filtered);
  return true;
}

/**
 * 拓扑排序：计算节点的执行顺序 / Topological sort for execution order
 * 返回按执行顺序排列的节点 ID 列表
 */
export function getExecutionOrder(workflow: Workflow): string[] {
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  // 初始化 / Initialize
  for (const node of workflow.nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }

  // 构建图 / Build graph
  for (const edge of workflow.edges) {
    adjacency[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }

  // BFS 拓扑排序 / BFS topological sort
  const queue: string[] = [];
  for (const node of workflow.nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of adjacency[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  return order;
}

/** 预设工作流模板 / Preset workflow templates */
export const WORKFLOW_TEMPLATES = [
  {
    name: "需求分析管道",
    description: "产品需求 → 技术方案 → 代码实现 → 代码审查 → 文档生成",
    nodes: [
      { agentName: "ProductManager", x: 50, y: 200, customPrompt: "分析用户需求，输出产品需求文档", outputFormat: "document" as const },
      { agentName: "Architect", x: 250, y: 200, customPrompt: "根据需求设计技术方案和架构", outputFormat: "text" as const },
      { agentName: "Coder", x: 450, y: 200, customPrompt: "根据技术方案编写代码", outputFormat: "code" as const },
      { agentName: "Auditor", x: 650, y: 200, customPrompt: "审查代码质量和安全性", outputFormat: "text" as const },
      { agentName: "Documenter", x: 850, y: 200, customPrompt: "生成项目文档", outputFormat: "document" as const },
    ],
  },
  {
    name: "市场调研管道",
    description: "关键词分析 → 竞品调研 → 数据分析 → 策略报告",
    nodes: [
      { agentName: "WebScout", x: 50, y: 200, customPrompt: "搜索市场信息和竞品动态", outputFormat: "text" as const },
      { agentName: "DataAnalyst", x: 300, y: 200, customPrompt: "分析搜索数据，提取关键洞察", outputFormat: "text" as const },
      { agentName: "Strategist", x: 550, y: 200, customPrompt: "根据数据洞察制定市场策略", outputFormat: "document" as const },
    ],
  },
  {
    name: "代码审查管道",
    description: "安全扫描 → 性能分析 → 代码规范 → 修复建议",
    nodes: [
      { agentName: "SecurityBot", x: 50, y: 200, customPrompt: "扫描代码安全漏洞", outputFormat: "text" as const },
      { agentName: "CodeReviewer", x: 300, y: 200, customPrompt: "审查代码质量和规范", outputFormat: "text" as const },
      { agentName: "Coder", x: 550, y: 200, customPrompt: "根据审查意见修复代码", outputFormat: "code" as const },
    ],
  },
];