// ═══════════════════════════════════════════════════════════════
// 用户模型 — 每用户独立画像，跨会话记忆
// User Model — Per-user profile, cross-session memory
// ═══════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";

export interface UserProfile {
  /** 偏好领域 / Preferred domains */
  domains: Record<string, number>;
  /** 偏好 Agent / Preferred agents */
  favoriteAgents: Record<string, number>;
  /** 常用工具 / Frequently used tools */
  frequentTools: Record<string, number>;
  /** 语言偏好 / Language preference */
  language: string;
  /** 活跃时段 / Active hours */
  activeHours: Record<number, number>;
  /** 交互次数 / Total interactions */
  totalInteractions: number;
  /** 最近主题 / Recent topics */
  recentTopics: string[];
  /** 知识水平 / Knowledge level (0-100) */
  knowledgeLevel: number;
  /** 偏好输出格式 / Preferred output format */
  preferredFormat: "detailed" | "concise" | "code-heavy" | "visual";
  /** 最后活跃时间 / Last active time */
  lastActive: number;
  /** 创建时间 / Creation time */
  createdAt: number;
}

const DATA_DIR = path.join(process.cwd(), "data", "users");

function getProfilePath(userId: string): string {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "user_profile.json");
}

const DEFAULT_PROFILE: UserProfile = {
  domains: {},
  favoriteAgents: {},
  frequentTools: {},
  language: "zh",
  activeHours: {},
  totalInteractions: 0,
  recentTopics: [],
  knowledgeLevel: 50,
  preferredFormat: "detailed",
  lastActive: Date.now(),
  createdAt: Date.now(),
};

/** 加载用户画像 / Load user profile */
export function loadProfile(userId: string): UserProfile {
  try {
    const filePath = getProfilePath(userId);
    if (!fs.existsSync(filePath)) return { ...DEFAULT_PROFILE };
    const raw = fs.readFileSync(filePath, "utf-8");
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

/** 保存用户画像 / Save user profile */
export function saveProfile(userId: string, profile: UserProfile): void {
  const filePath = getProfilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), "utf-8");
}

/**
 * 从用户消息中更新画像 / Update profile from user message
 */
export function updateProfileFromMessage(
  userId: string,
  message: string,
  agents: string[],
  tools: string[],
): UserProfile {
  const profile = loadProfile(userId);
  profile.totalInteractions++;
  profile.lastActive = Date.now();

  // 检测语言 / Detect language
  if (/[a-zA-Z]{3,}/.test(message)) {
    profile.language = "en";
  } else if (/[\u4e00-\u9fa5]/.test(message)) {
    profile.language = "zh";
  }

  // 追踪活跃时段 / Track active hours
  const hour = new Date().getHours();
  profile.activeHours[hour] = (profile.activeHours[hour] || 0) + 1;

  // 追踪 Agent 使用 / Track agent usage
  for (const agent of agents) {
    profile.favoriteAgents[agent] = (profile.favoriteAgents[agent] || 0) + 1;
  }

  // 追踪工具使用 / Track tool usage
  for (const tool of tools) {
    profile.frequentTools[tool] = (profile.frequentTools[tool] || 0) + 1;
  }

  // 检测领域关键词 / Detect domain keywords
  const domainKeywords: Record<string, RegExp> = {
    "前端开发": /(react|vue|angular|css|html|前端|组件|页面|UI|界面)/i,
    "后端开发": /(api|数据库|server|后端|node|python|go|rust|java|spring|django|fastapi)/i,
    "AI/ML": /(AI|机器学习|深度学习|模型|训练|神经网络|LLM|GPT|Transformer|NLP|CV|embedding|向量)/i,
    "DevOps": /(docker|kubernetes|部署|CI|CD|运维|监控|日志|报警|AWS|GCP|Azure|云原生)/i,
    "数据分析": /(数据|分析|统计|报表|图表|可视化|dashboard|ETL|SQL|pandas)/i,
    "安全": /(安全|漏洞|加密|认证|授权|OAuth|JWT|HTTPS|SSL|渗透|防火墙)/i,
    "架构设计": /(架构|设计模式|微服务|分布式|消息队列|系统设计|领域驱动|DDD|CQRS)/i,
  };

  for (const [domain, regex] of Object.entries(domainKeywords)) {
    if (regex.test(message)) {
      profile.domains[domain] = (profile.domains[domain] || 0) + 1;
    }
  }

  // 更新最近主题 / Update recent topics
  const topicMatch = message.match(/^.{5,50}/);
  if (topicMatch) {
    profile.recentTopics.unshift(topicMatch[0]);
    if (profile.recentTopics.length > 20) {
      profile.recentTopics = profile.recentTopics.slice(0, 20);
    }
  }

  // 检测输出格式偏好 / Detect preferred output format
  if (/(简短|简洁|简要|一句话|tl;dr|short|concise)/i.test(message)) {
    profile.preferredFormat = "concise";
  } else if (/(详细|完整|全面|深入|detail|comprehensive|thorough)/i.test(message)) {
    profile.preferredFormat = "detailed";
  } else if (/(代码|code|示例|example|demo|实现|编写|写一个)/i.test(message)) {
    profile.preferredFormat = "code-heavy";
  } else if (/(图表|图|可视化|visual|diagram|chart|画|绘制)/i.test(message)) {
    profile.preferredFormat = "visual";
  }

  // 知识水平评估 / Knowledge level assessment
  if (/(高级|advanced|expert|资深|底层|原理|源码|优化|performance)/i.test(message)) {
    profile.knowledgeLevel = Math.min(100, profile.knowledgeLevel + 2);
  } else if (/(新手|入门|基础|beginner|basic|什么是|怎么|如何|how|what is)/i.test(message)) {
    profile.knowledgeLevel = Math.max(0, profile.knowledgeLevel - 1);
  }

  saveProfile(userId, profile);
  return profile;
}

/**
 * 生成用户画像摘要 / Generate user profile summary
 */
export function generateProfileSummary(profile: UserProfile): string {
  const topDomains = Object.entries(profile.domains)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([d]) => d);

  const topAgents = Object.entries(profile.favoriteAgents)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([a]) => a);

  const topHour = Object.entries(profile.activeHours)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([h]) => `${h}:00`);

  return `## 用户画像
- 交互次数：${profile.totalInteractions}
- 语言偏好：${profile.language === "zh" ? "中文" : "English"}
- 知识水平：${profile.knowledgeLevel}/100
- 输出偏好：${profile.preferredFormat}
- 关注领域：${topDomains.join("、") || "暂无"}
- 常用 Agent：${topAgents.join("、") || "暂无"}
- 活跃时段：${topHour.join("、") || "暂无"}
- 最近主题：${profile.recentTopics.slice(0, 5).join(" / ")}`;
}