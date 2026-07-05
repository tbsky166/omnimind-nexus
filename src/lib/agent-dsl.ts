// ═══════════════════════════════════════════════════════════════════════
// Agent DSL — 自创 Agent 定义语言，Python 风格，高可读性
// Agent DSL — custom agent definition language, Python-like, highly readable
// ═══════════════════════════════════════════════════════════════════════

// ── 类型定义 / Type Definitions ──

/** 性格配置 / Personality configuration */
export interface PersonalityConfig {
  type: string;           // 预设性格类型：meticulous | creative | paranoid | pragmatic | diplomatic | assertive
  detail_level: string;   // 细节程度：low | medium | high | exhaustive
  risk_tolerance: number; // 风险容忍度：0.0(极度谨慎) ~ 1.0(极度冒险)
  debate_style: string;   // 辩论风格：constructive | assertive | diplomatic | evidence_driven
  creativity: number;     // 创造力：0.0(死板) ~ 1.0(天马行空)
  verbosity: string;      // 啰嗦程度：minimal | concise | normal | detailed | verbose
  empathy: number;        // 共情能力：0.0(冷漠) ~ 1.0(过度共情)
  confidence: number;     // 自信程度：0.0(犹豫) ~ 1.0(过度自信)
}

/** 工具配置 / Tool configuration */
export interface ToolConfig {
  name: string;           // 工具名称
  type: string;           // 工具类型：file_read | file_write | shell_exec | api_call | browser | database
  config: Record<string, unknown>; // 工具特定配置
}

/** 行为规则 / Behavior rules */
export interface BehaviorConfig {
  on_error: string;       // 错误处理：report_and_continue | retry | escalate | abort
  on_conflict: string;    // 冲突处理：escalate_to_arbitrator | compromise | insist | defer
  on_uncertain: string;   // 不确定时：ask_clarification | best_guess | request_human
  max_retries: number;    // 最大重试次数
  context_window: string; // 上下文窗口：4K | 8K | 16K | 32K | 128K
  temperature: number;    // 温度参数：0.0 ~ 2.0
  top_p: number;          // Top-P 采样
  response_format: string; // 回复格式：markdown | json | plain | code
}

/** Next.js 扩展配置 / Next.js extension configuration */
export interface APIRouteConfig {
  method: string;         // HTTP 方法
  path: string;           // 路由路径
  description: string;    // 描述
  auth_required: boolean; // 是否需要认证
  params?: Record<string, string>; // 参数定义
}

export interface ComponentConfig {
  name: string;           // 组件名
  type: string;           // 组件类型：react | server | client
  props: string[];        // Props 列表
  description?: string;   // 描述
}

export interface ExtensionConfig {
  api_routes: APIRouteConfig[];
  components: ComponentConfig[];
  custom_tools?: string[];    // 自定义工具名称列表
  middleware?: string[];      // 中间件名称列表
  hooks?: string[];           // 生命周期钩子
}

/** 完整的 Agent 配置 / Complete Agent configuration */
export interface AgentDSLConfig {
  name: string;
  emoji: string;
  role: string;
  category: string;
  description: string;
  personality: PersonalityConfig;
  capabilities: string[];
  tools: ToolConfig[];
  behavior: BehaviorConfig;
  knowledge: string[];        // 知识领域
  constraints: string[];      // 行为约束
  triggers: string[];         // 触发条件
  extension: ExtensionConfig;
  use_preset?: string;        // 继承的预设名
}

// ── 预设值定义 / Preset Value Definitions ──

/** 性格预设 / Personality presets */
export const PERSONALITY_PRESETS: Record<string, PersonalityConfig> = {
  meticulous: {
    type: "meticulous", detail_level: "exhaustive", risk_tolerance: 0.15,
    debate_style: "evidence_driven", creativity: 0.3, verbosity: "detailed",
    empathy: 0.4, confidence: 0.7,
  },
  creative: {
    type: "creative", detail_level: "medium", risk_tolerance: 0.7,
    debate_style: "constructive", creativity: 0.9, verbosity: "verbose",
    empathy: 0.8, confidence: 0.6,
  },
  paranoid: {
    type: "paranoid", detail_level: "exhaustive", risk_tolerance: 0.05,
    debate_style: "assertive", creativity: 0.2, verbosity: "detailed",
    empathy: 0.2, confidence: 0.5,
  },
  pragmatic: {
    type: "pragmatic", detail_level: "medium", risk_tolerance: 0.5,
    debate_style: "constructive", creativity: 0.5, verbosity: "concise",
    empathy: 0.5, confidence: 0.7,
  },
  diplomatic: {
    type: "diplomatic", detail_level: "medium", risk_tolerance: 0.4,
    debate_style: "diplomatic", creativity: 0.5, verbosity: "normal",
    empathy: 0.9, confidence: 0.5,
  },
  assertive: {
    type: "assertive", detail_level: "high", risk_tolerance: 0.6,
    debate_style: "assertive", creativity: 0.6, verbosity: "normal",
    empathy: 0.3, confidence: 0.9,
  },
};

/** 行为预设 / Behavior presets */
export const BEHAVIOR_PRESETS: Record<string, BehaviorConfig> = {
  safe: {
    on_error: "report_and_continue", on_conflict: "escalate_to_arbitrator",
    on_uncertain: "ask_clarification", max_retries: 3,
    context_window: "16K", temperature: 0.3, top_p: 0.9, response_format: "markdown",
  },
  aggressive: {
    on_error: "retry", on_conflict: "insist",
    on_uncertain: "best_guess", max_retries: 5,
    context_window: "32K", temperature: 0.7, top_p: 0.95, response_format: "markdown",
  },
  balanced: {
    on_error: "retry", on_conflict: "compromise",
    on_uncertain: "ask_clarification", max_retries: 3,
    context_window: "16K", temperature: 0.5, top_p: 0.9, response_format: "markdown",
  },
  minimal: {
    on_error: "abort", on_conflict: "defer",
    on_uncertain: "best_guess", max_retries: 1,
    context_window: "8K", temperature: 0.2, top_p: 0.85, response_format: "plain",
  },
};

/** 知识领域列表 / Knowledge domain list */
export const KNOWLEDGE_DOMAINS = [
  "software_engineering", "web_development", "mobile_development",
  "devops", "cloud_computing", "database", "networking", "security",
  "machine_learning", "data_science", "blockchain", "iot",
  "game_development", "embedded_systems", "quantum_computing",
  "business_strategy", "marketing", "finance", "legal", "healthcare",
  "education", "design", "writing", "translation", "multimedia",
  "accessibility", "project_management", "product_management",
  "customer_service", "human_resources", "research", "social_media",
] as const;

/** 能力标签列表 / Capability tag list */
export const CAPABILITY_TAGS = [
  "code_review", "code_generation", "debugging", "refactoring",
  "architecture_design", "api_design", "database_design",
  "security_audit", "performance_optimization", "testing",
  "documentation", "data_analysis", "data_visualization",
  "machine_learning", "nlp", "computer_vision",
  "content_writing", "copywriting", "translation",
  "ui_design", "ux_design", "graphic_design",
  "video_editing", "audio_processing",
  "project_planning", "risk_assessment", "cost_estimation",
  "market_research", "competitive_analysis",
  "contract_review", "compliance_check",
  "accessibility_audit", "localization",
  "api_development", "microservices", "serverless",
  "containerization", "ci_cd", "monitoring",
] as const;

// ── DSL 解析器 / DSL Parser ──

/** 解析行，提取键值对 / Parse a line, extract key-value pair */
function parseKeyValue(line: string): { key: string; value: string } | null {
  const match = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
  if (!match) return null;
  return { key: match[1], value: match[2].trim() };
}

/** 解析值：字符串、数字、布尔、数组 / Parse value: string, number, boolean, array */
function parseValue(raw: string): unknown {
  raw = raw.trim();
  // 布尔 / Boolean
  if (raw === "true") return true;
  if (raw === "false") return false;
  // 数字 / Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
  // 字符串（去除引号） / String (remove quotes)
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // 数组 / Array
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => {
      const trimmed = s.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    });
  }
  // 对象 / Object
  if (raw.startsWith("{") && raw.endsWith("}")) {
    return parseObject(raw);
  }
  return raw;
}

/** 解析对象字面量 / Parse object literal */
function parseObject(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const inner = raw.slice(1, -1).trim();
  if (!inner) return result;

  let depth = 0;
  let current = "";
  const pairs: string[] = [];

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      pairs.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) pairs.push(current.trim());

  for (const pair of pairs) {
    const colonIdx = findColon(pair);
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim().replace(/^["']|["']$/g, "");
    const val = pair.slice(colonIdx + 1).trim();
    result[key] = parseValue(val);
  }
  return result;
}

/** 查找冒号位置（跳过嵌套） / Find colon position (skip nested) */
function findColon(str: string): number {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "{" || str[i] === "[") depth++;
    else if (str[i] === "}" || str[i] === "]") depth--;
    else if (str[i] === ":" && depth === 0) return i;
  }
  return -1;
}

/** 解析块内容（花括号内） / Parse block content (inside braces) */
function parseBlock(lines: string[], startIdx: number): { config: Record<string, unknown>; endIdx: number } {
  const config: Record<string, unknown> = {};
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 结束 / End of block
    if (trimmed === "}") {
      return { config, endIdx: i };
    }

    // 跳过空行和注释 / Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    // 嵌套块 / Nested block
    if (trimmed.endsWith("{")) {
      const blockKey = trimmed.slice(0, -1).trim();
      const nested = parseBlock(lines, i + 1);
      config[blockKey] = nested.config;
      i = nested.endIdx + 1;
      continue;
    }

    // 键值对 / Key-value pair
    const kv = parseKeyValue(line);
    if (kv) {
      config[kv.key] = parseValue(kv.value);
    }

    i++;
  }

  return { config, endIdx: i };
}

/** 解析 tool() 调用 / Parse tool() call */
function parseToolCall(line: string): ToolConfig | null {
  const match = line.match(/tool\s*\(\s*["'](\w+)["']\s*,\s*(\{[\s\S]*\})\s*\)/);
  if (!match) return null;
  return {
    name: match[1],
    type: match[1],
    config: parseObject(match[2]) as Record<string, unknown>,
  };
}

/** 解析 tool 数组 / Parse tool array */
function parseTools(raw: string): ToolConfig[] {
  const tools: ToolConfig[] = [];
  // 匹配 tool(...) 调用 / Match tool(...) calls
  const regex = /tool\s*\(\s*["'](\w+)["']\s*,\s*(\{[\s\S]*?\})\s*\)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    tools.push({
      name: match[1],
      type: match[1],
      config: parseObject(match[2]) as Record<string, unknown>,
    });
  }
  return tools;
}

/** 解析扩展块中的 route() 调用 / Parse route() calls in extension block */
function parseRoutes(raw: string): APIRouteConfig[] {
  const routes: APIRouteConfig[] = [];
  const regex = /route\s*\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']\s*,\s*(\{[\s\S]*?\})\s*\)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const config = parseObject(match[3]) as Record<string, unknown>;
    routes.push({
      method: match[1],
      path: match[2],
      description: (config.description as string) || "",
      auth_required: (config.auth_required as boolean) || false,
      params: config.params as Record<string, string> | undefined,
    });
  }
  return routes;
}

/** 解析扩展块中的 component() 调用 / Parse component() calls in extension block */
function parseComponents(raw: string): ComponentConfig[] {
  const components: ComponentConfig[] = [];
  const regex = /component\s*\(\s*["']([^"']+)["']\s*,\s*(\{[\s\S]*?\})\s*\)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const config = parseObject(match[2]) as Record<string, unknown>;
    components.push({
      name: match[1],
      type: (config.type as string) || "react",
      props: (config.props as string[]) || [],
      description: config.description as string,
    });
  }
  return components;
}

// ── 主解析函数 / Main Parsing Function ──

/** 解析 Agent DSL 源代码 / Parse Agent DSL source code */
export function parseAgentDSL(source: string): { success: boolean; config?: AgentDSLConfig; errors: string[] } {
  const errors: string[] = [];
  const lines = source.split("\n");
  const config: Partial<AgentDSLConfig> = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 跳过空行和注释 / Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    // use preset 指令 / use preset directive
    if (trimmed.startsWith("use preset")) {
      const presetMatch = trimmed.match(/use preset\s+["'](\w+)["']/);
      if (presetMatch) {
        config.use_preset = presetMatch[1];
      }
      i++;
      continue;
    }

    // agent 定义 / agent definition
    if (trimmed.startsWith("agent ")) {
      const agentMatch = trimmed.match(/agent\s+["']([^"']+)["']\s*\{/);
      if (agentMatch) {
        config.name = agentMatch[1];
        const block = parseBlock(lines, i + 1);
        Object.assign(config, block.config);
        i = block.endIdx + 1;
        continue;
      }
    }

    // 顶层键值对 / Top-level key-value pairs
    const kv = parseKeyValue(line);
    if (kv) {
      if (kv.key === "capabilities" || kv.key === "knowledge" || kv.key === "constraints" || kv.key === "triggers") {
        config[kv.key as keyof AgentDSLConfig] = parseValue(kv.value) as never;
      } else if (kv.key === "tools") {
        config.tools = parseTools(kv.value);
      } else {
        (config as Record<string, unknown>)[kv.key] = parseValue(kv.value);
      }
    }

    i++;
  }

  // 验证必填字段 / Validate required fields
  if (!config.name) errors.push("缺少 agent 名称定义");
  if (!config.role) errors.push("缺少 role 定义");
  if (!config.category) errors.push("缺少 category 定义");

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // 合并预设 / Merge presets
  const finalConfig = applyPresets(config);

  return { success: true, config: finalConfig, errors: [] };
}

/** 应用预设值 / Apply preset values */
function applyPresets(partial: Partial<AgentDSLConfig>): AgentDSLConfig {
  // 默认值 / Default values
  const defaults: AgentDSLConfig = {
    name: partial.name || "Unnamed Agent",
    emoji: partial.emoji || "🤖",
    role: partial.role || "General Assistant",
    category: partial.category || "Specialized",
    description: partial.description || "",
    personality: PERSONALITY_PRESETS.pragmatic,
    capabilities: partial.capabilities || [],
    tools: partial.tools || [],
    behavior: BEHAVIOR_PRESETS.balanced,
    knowledge: partial.knowledge || [],
    constraints: partial.constraints || [],
    triggers: partial.triggers || [],
    extension: partial.extension || { api_routes: [], components: [] },
  };

  // 应用 use_preset 预设 / Apply use_preset
  if (partial.use_preset && PERSONALITY_PRESETS[partial.use_preset]) {
    defaults.personality = { ...PERSONALITY_PRESETS[partial.use_preset] };
  }
  if (partial.use_preset && BEHAVIOR_PRESETS[partial.use_preset]) {
    defaults.behavior = { ...BEHAVIOR_PRESETS[partial.use_preset] };
  }

  // 合并用户配置 / Merge user config
  if (partial.personality) {
    defaults.personality = { ...defaults.personality, ...partial.personality };
  }
  if (partial.behavior) {
    defaults.behavior = { ...defaults.behavior, ...partial.behavior };
  }
  if (partial.extension) {
    defaults.extension = {
      api_routes: [...(partial.extension.api_routes || [])],
      components: [...(partial.extension.components || [])],
      custom_tools: partial.extension.custom_tools || [],
      middleware: partial.extension.middleware || [],
      hooks: partial.extension.hooks || [],
    };
  }

  // 直接覆盖 / Direct override
  for (const key of ["emoji", "role", "category", "description", "capabilities", "tools", "knowledge", "constraints", "triggers"] as const) {
    if (partial[key] !== undefined) {
      (defaults as unknown as Record<string, unknown>)[key] = partial[key];
    }
  }

  return defaults;
}

/** 将 DSL 配置序列化回 DSL 源代码 / Serialize DSL config back to DSL source */
export function serializeDSL(config: AgentDSLConfig): string {
  const lines: string[] = [];

  lines.push(`# Agent Definition — ${config.name}`);
  lines.push(`# Generated by OmniMind Nexus Creator`);
  lines.push("");

  if (config.use_preset) {
    lines.push(`use preset "${config.use_preset}"`);
    lines.push("");
  }

  lines.push(`agent "${config.name}" {`);

  // 基本属性 / Basic properties
  lines.push(`    emoji = "${config.emoji}"`);
  lines.push(`    role = "${config.role}"`);
  lines.push(`    category = "${config.category}"`);
  if (config.description) {
    lines.push(`    description = "${config.description}"`);
  }

  // 性格配置 / Personality config
  lines.push("");
  lines.push(`    personality {`);
  for (const [k, v] of Object.entries(config.personality)) {
    if (typeof v === "string") lines.push(`        ${k} = "${v}"`);
    else lines.push(`        ${k} = ${v}`);
  }
  lines.push(`    }`);

  // 能力 / Capabilities
  if (config.capabilities.length > 0) {
    lines.push("");
    lines.push(`    capabilities = [`);
    for (const c of config.capabilities) {
      lines.push(`        "${c}",`);
    }
    lines.push(`    ]`);
  }

  // 工具 / Tools
  if (config.tools.length > 0) {
    lines.push("");
    lines.push(`    tools = [`);
    for (const t of config.tools) {
      lines.push(`        tool("${t.name}", {`);
      for (const [k, v] of Object.entries(t.config)) {
        if (typeof v === "string") lines.push(`            ${k}: "${v}",`);
        else lines.push(`            ${k}: ${JSON.stringify(v)},`);
      }
      lines.push(`        }),`);
    }
    lines.push(`    ]`);
  }

  // 行为 / Behavior
  lines.push("");
  lines.push(`    behavior {`);
  for (const [k, v] of Object.entries(config.behavior)) {
    if (typeof v === "string") lines.push(`        ${k} = "${v}"`);
    else lines.push(`        ${k} = ${v}`);
  }
  lines.push(`    }`);

  // 知识 / Knowledge
  if (config.knowledge.length > 0) {
    lines.push("");
    lines.push(`    knowledge = [`);
    for (const k of config.knowledge) lines.push(`        "${k}",`);
    lines.push(`    ]`);
  }

  // 约束 / Constraints
  if (config.constraints.length > 0) {
    lines.push("");
    lines.push(`    constraints = [`);
    for (const c of config.constraints) lines.push(`        "${c}",`);
    lines.push(`    ]`);
  }

  // 触发条件 / Triggers
  if (config.triggers.length > 0) {
    lines.push("");
    lines.push(`    triggers = [`);
    for (const t of config.triggers) lines.push(`        "${t}",`);
    lines.push(`    ]`);
  }

  // 扩展 / Extension
  if (config.extension.api_routes.length > 0 || config.extension.components.length > 0) {
    lines.push("");
    lines.push(`    extension {`);
    for (const r of config.extension.api_routes) {
      lines.push(`        route("${r.method}", "${r.path}", {`);
      lines.push(`            description: "${r.description}",`);
      lines.push(`            auth_required: ${r.auth_required},`);
      if (r.params) {
        lines.push(`            params: ${JSON.stringify(r.params)},`);
      }
      lines.push(`        }),`);
    }
    for (const c of config.extension.components) {
      lines.push(`        component("${c.name}", {`);
      lines.push(`            type: "${c.type}",`);
      lines.push(`            props: ${JSON.stringify(c.props)},`);
      if (c.description) lines.push(`            description: "${c.description}",`);
      lines.push(`        }),`);
    }
    lines.push(`    }`);
  }

  lines.push(`}`);
  return lines.join("\n");
}