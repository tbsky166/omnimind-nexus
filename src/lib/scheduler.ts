// ═══════════════════════════════════════════════════════════════
// 定时任务调度器 — 参考 OpenClaw 的"生物钟"模块
// 支持 cron 定时执行：巡检、报告、监控、自动任务
// ═══════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";

export interface ScheduledTask {
  id: string;
  name: string;           // 任务名称 / Task name
  description: string;    // 任务描述 / Task description
  cronExpression: string; // 5 字段 cron 表达式 / 5-field cron expression
  prompt: string;         // 发给 Agent 的提示词 / Prompt sent to agents
  agents: string[];       // 参与的 Agent / Participating agents
  enabled: boolean;       // 是否启用 / Whether enabled
  createdAt: number;      // 创建时间戳 / Creation timestamp
  lastRunAt: number | null;  // 最后执行时间 / Last run timestamp
  lastResult: string | null; // 最后执行结果 / Last run result
  runCount: number;       // 执行次数 / Run count
}

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getTasksFile(userId: string): string {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "scheduled_tasks.json");
}

/** 加载所有定时任务 / Load all scheduled tasks */
export function loadTasks(userId: string): ScheduledTask[] {
  try {
    const filePath = getTasksFile(userId);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 保存所有定时任务 / Save all scheduled tasks */
export function saveTasks(userId: string, tasks: ScheduledTask[]): void {
  const filePath = getTasksFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), "utf-8");
}

/** 创建定时任务 / Create a scheduled task */
export function createTask(
  userId: string,
  name: string, description: string, cronExpression: string,
  prompt: string, agents: string[],
): ScheduledTask {
  const tasks = loadTasks(userId);
  const task: ScheduledTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name,
    description,
    cronExpression,
    prompt,
    agents,
    enabled: true,
    createdAt: Date.now(),
    lastRunAt: null,
    lastResult: null,
    runCount: 0,
  };
  tasks.push(task);
  saveTasks(userId, tasks);
  return task;
}

/** 更新定时任务 / Update a scheduled task */
export function updateTask(userId: string, id: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
  const tasks = loadTasks(userId);
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...updates };
  saveTasks(userId, tasks);
  return tasks[idx];
}

/** 删除定时任务 / Delete a scheduled task */
export function deleteTask(userId: string, id: string): boolean {
  const tasks = loadTasks(userId);
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(userId, filtered);
  return true;
}

/** 切换定时任务启用状态 / Toggle task enabled state */
export function toggleTask(userId: string, id: string): ScheduledTask | null {
  const tasks = loadTasks(userId);
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  task.enabled = !task.enabled;
  saveTasks(userId, tasks);
  return task;
}

/**
 * 解析 cron 表达式，检查当前时间是否匹配 / Parse cron expression and check if current time matches
 * 支持 5 字段 cron：minute hour day month weekday
 */
export function matchesCron(cronExpression: string, date: Date = new Date()): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, day, month, weekday] = parts;
  const d = {
    minute: date.getMinutes(),
    hour: date.getHours(),
    day: date.getDate(),
    month: date.getMonth() + 1, // 0-indexed
    weekday: date.getDay(), // 0=Sunday
  };

  const matchField = (field: string, value: number): boolean => {
    if (field === "*") return true;
    const values = field.split(",");
    for (const v of values) {
      if (v.includes("/")) {
        const [start, step] = v.split("/");
        const s = start === "*" ? 0 : parseInt(start);
        const st = parseInt(step);
        if (value >= s && (value - s) % st === 0) return true;
      } else if (v.includes("-")) {
        const [low, high] = v.split("-").map(Number);
        if (value >= low && value <= high) return true;
      } else {
        if (parseInt(v) === value) return true;
      }
    }
    return false;
  };

  return (
    matchField(minute, d.minute) &&
    matchField(hour, d.hour) &&
    matchField(day, d.day) &&
    matchField(month, d.month) &&
    matchField(weekday, d.weekday)
  );
}

/**
 * 获取当前应该执行的任务 / Get tasks that should run now
 */
export function getDueTasks(userId: string): ScheduledTask[] {
  const tasks = loadTasks(userId);
  return tasks.filter((t) => t.enabled && matchesCron(t.cronExpression));
}

/** 预设模板 / Preset templates */
export const TASK_TEMPLATES = [
  {
    name: "每日代码审查",
    description: "每天自动检查代码库，发现潜在问题",
    cronExpression: "0 9 * * 1-5",
    prompt: "请审查项目的代码质量，检查是否有明显的 bug、性能问题或安全漏洞。列出发现的问题和改进建议。",
    agents: ["Alchemist", "Coder"],
  },
  {
    name: "每周技术周报",
    description: "每周一自动生成技术周报",
    cronExpression: "0 8 * * 1",
    prompt: "请生成一份技术周报，总结项目进展、关键指标、待办事项。格式要专业清晰。",
    agents: ["Creator", "Sage"],
  },
  {
    name: "每日系统健康检查",
    description: "每天检查系统运行状态",
    cronExpression: "0 7 * * *",
    prompt: "请检查系统健康状态，包括：API 响应时间、错误率、内存使用情况。如果发现异常，给出修复建议。",
    agents: ["Sentinel", "Sage"],
  },
  {
    name: "每小时新闻摘要",
    description: "每整点获取最新行业新闻",
    cronExpression: "0 * * * *",
    prompt: "请搜索最新的 AI/技术行业新闻，给出 3-5 条最重要的新闻摘要（每条不超过 100 字）。",
    agents: ["WebScout", "Sage"],
  },
];