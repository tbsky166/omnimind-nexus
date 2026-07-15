// ═══════════════════════════════════════════════════════════════
// 自动技能创建器 — 参考 Hermes Agent 的"自我进化"
// 从对话中自动提取可复用的技能模式
// ═══════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";

export interface Skill {
  id: string;
  name: string;
  description: string;
  /** 技能触发关键词 / Skill trigger keywords */
  triggers: string[];
  /** 技能使用的工具 / Tools used by the skill */
  tools: string[];
  /** 技能的系统提示词 / System prompt for the skill */
  systemPrompt: string;
  /** 使用次数 / Usage count */
  usageCount: number;
  /** 创建时间 / Creation time */
  createdAt: number;
  /** 来源 Agent / Source agent */
  source: string;
  /** 置信度 / Confidence */
  confidence: number;
}

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getSkillsFile(userId: string): string {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "skills.json");
}

/** 加载所有技能 / Load all skills */
export function loadSkills(userId: string): Skill[] {
  try {
    const filePath = getSkillsFile(userId);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 保存技能 / Save skills */
export function saveSkills(userId: string, skills: Skill[]): void {
  const filePath = getSkillsFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(skills, null, 2), "utf-8");
}

/**
 * 从 Agent 响应中提取技能 / Extract skills from agent responses
 * 分析内容模式，识别可复用的技能模式
 */
export function extractSkills(userId: string, content: string, agentName: string): Skill[] {
  const skills = loadSkills(userId);
  const newSkills: Skill[] = [];

  // 模式 1：代码生成类技能 / Pattern 1: code generation skills
  const codeGenMatch = content.match(/(?:我写了|创建了|生成了|编写了)(?:一个|一段)?\s*(?:代码|脚本|函数|组件|页面)(?:\s*[：:]\s*)?([^。\n]+)/);
  if (codeGenMatch) {
    const skillName = extractSkillName(codeGenMatch[1] || "代码生成");
    newSkills.push({
      id: `skill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: skillName,
      description: `自动生成 ${skillName} 的代码`,
      triggers: [skillName, "生成", "创建", "代码"],
      tools: ["file_write", "codebase_edit"],
      systemPrompt: `你是 ${skillName} 专家。当用户需要 ${skillName} 时，请生成高质量的代码。`,
      usageCount: 1,
      createdAt: Date.now(),
      source: agentName,
      confidence: 0.6,
    });
  }

  // 模式 2：分析/报告类技能 / Pattern 2: analysis/report skills
  const analysisMatch = content.match(/(?:分析|报告|总结|评估|审查)(?:\s*[：:]\s*)?([^。\n]{5,})/);
  if (analysisMatch) {
    const skillName = extractSkillName(analysisMatch[0] || "分析报告");
    newSkills.push({
      id: `skill_${Date.now() + 1}_${Math.random().toString(36).substring(2, 6)}`,
      name: skillName,
      description: `自动生成 ${skillName}`,
      triggers: [skillName, "分析", "报告", "总结"],
      tools: ["generate_document", "web_search"],
      systemPrompt: `你是 ${skillName} 专家。当用户需要 ${skillName} 时，请提供专业的分析报告。`,
      usageCount: 1,
      createdAt: Date.now(),
      source: agentName,
      confidence: 0.5,
    });
  }

  // 模式 3：搜索/查询类技能 / Pattern 3: search/query skills
  const searchMatch = content.match(/(?:搜索|查询|查找|检索)(?:\s*[：:]\s*)?([^。\n]{3,})/);
  if (searchMatch) {
    const skillName = extractSkillName(searchMatch[0] || "信息检索");
    newSkills.push({
      id: `skill_${Date.now() + 2}_${Math.random().toString(36).substring(2, 6)}`,
      name: skillName,
      description: `自动进行 ${skillName}`,
      triggers: [skillName, "搜索", "查询", "信息"],
      tools: ["web_search"],
      systemPrompt: `你是 ${skillName} 专家。当用户需要搜索信息时，请提供准确的结果。`,
      usageCount: 1,
      createdAt: Date.now(),
      source: agentName,
      confidence: 0.5,
    });
  }

  // 去重并合并到技能库 / Deduplicate and merge into skill library
  for (const ns of newSkills) {
    const existing = skills.find((s) => s.name === ns.name);
    if (existing) {
      existing.usageCount++;
      existing.confidence = Math.min(1, existing.confidence + 0.05);
    } else {
      skills.push(ns);
    }
  }

  saveSkills(userId, skills);
  return newSkills;
}

function extractSkillName(text: string): string {
  // 清理文本，提取技能名 / Clean text and extract skill name
  return text
    .replace(/[，。！？,!?\n]/g, "")
    .trim()
    .substring(0, 20) || "未命名技能";
}