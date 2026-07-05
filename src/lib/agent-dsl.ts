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

// ── 扩展类型：表达式、事件、管道、状态机、通信 / Extended types: expressions, events, pipelines, state machines, communication ──

/** DSL 表达式类型 / DSL expression types */
export type DSLPrimitive = string | number | boolean;
export type DSLArray = (string | number | boolean)[];
export type DSLObject = Record<string, string | number | boolean>;
export type DSLValue = DSLPrimitive | DSLArray | DSLObject;

/** 表达式节点（AST）/ Expression node (AST) */
export interface ExprNode {
  type: "literal" | "variable" | "call" | "binary" | "unary" | "ternary" | "array" | "object";
  value?: DSLValue;
  name?: string;
  callee?: string;
  args?: ExprNode[];
  operator?: string;
  left?: ExprNode;
  right?: ExprNode;
  consequent?: ExprNode;
  alternate?: ExprNode;
  test?: ExprNode;
  elements?: ExprNode[];
  properties?: { key: string; value: ExprNode }[];
}

/** 内置函数定义 / Built-in function definition */
export interface BuiltinFunction {
  name: string;
  description: string;
  params: { name: string; type: string; description: string; required: boolean }[];
  returns: string;
  category: string; // validation | transform | control | io | schedule | security
}

/** 内置函数注册表 / Built-in function registry */
export const BUILTIN_FUNCTIONS: BuiltinFunction[] = [
  // ── 验证类 / Validation ──
  { name: "validate", category: "validation",
    description: "验证数据是否符合规则，返回 [isValid, errors]",
    params: [
      { name: "data", type: "any", description: "要验证的数据", required: true },
      { name: "rules", type: "object", description: "验证规则 {type, min, max, pattern, required}", required: true },
    ], returns: "[boolean, string[]]" },
  { name: "assert", category: "validation",
    description: "断言条件为真，否则抛出错误",
    params: [
      { name: "condition", type: "boolean", description: "断言条件", required: true },
      { name: "message", type: "string", description: "错误消息", required: false },
    ], returns: "void" },
  { name: "type_check", category: "validation",
    description: "检查值的类型是否匹配",
    params: [
      { name: "value", type: "any", description: "要检查的值", required: true },
      { name: "expected_type", type: "string", description: "期望类型：string|number|boolean|array|object", required: true },
    ], returns: "boolean" },

  // ── 转换类 / Transform ──
  { name: "transform", category: "transform",
    description: "将数据从一种格式转换为另一种",
    params: [
      { name: "data", type: "any", description: "输入数据", required: true },
      { name: "from", type: "string", description: "源格式：json|yaml|xml|csv|markdown|text", required: true },
      { name: "to", type: "string", description: "目标格式：json|yaml|xml|csv|markdown|text", required: true },
    ], returns: "string" },
  { name: "template", category: "transform",
    description: "使用模板字符串渲染数据",
    params: [
      { name: "template_str", type: "string", description: "模板字符串，用 {{ }} 嵌入变量", required: true },
      { name: "data", type: "object", description: "模板数据", required: true },
    ], returns: "string" },
  { name: "extract", category: "transform",
    description: "从文本中提取匹配模式的内容",
    params: [
      { name: "text", type: "string", description: "源文本", required: true },
      { name: "pattern", type: "string", description: "正则表达式", required: true },
    ], returns: "string[]" },
  { name: "sanitize", category: "transform",
    description: "清理数据，移除敏感或危险内容",
    params: [
      { name: "data", type: "string", description: "要清理的数据", required: true },
      { name: "mode", type: "string", description: "清理模式：html|sql|url|path|filename", required: true },
    ], returns: "string" },

  // ── 控制流 / Control Flow ──
  { name: "retry", category: "control",
    description: "带重试机制执行操作",
    params: [
      { name: "action", type: "string", description: "要执行的操作名", required: true },
      { name: "max_attempts", type: "number", description: "最大重试次数", required: false },
      { name: "backoff", type: "string", description: "退避策略：fixed|exponential|linear", required: false },
      { name: "delay_ms", type: "number", description: "重试间隔（毫秒）", required: false },
    ], returns: "any" },
  { name: "timeout", category: "control",
    description: "设置操作超时时间",
    params: [
      { name: "action", type: "string", description: "要执行的操作名", required: true },
      { name: "ms", type: "number", description: "超时毫秒数", required: true },
    ], returns: "any" },
  { name: "fallback", category: "control",
    description: "主操作失败时执行备用操作",
    params: [
      { name: "primary", type: "string", description: "主操作名", required: true },
      { name: "backup", type: "string", description: "备用操作名", required: true },
    ], returns: "any" },
  { name: "parallel", category: "control",
    description: "并行执行多个操作并收集结果",
    params: [
      { name: "actions", type: "array", description: "操作名列表", required: true },
    ], returns: "any[]" },
  { name: "sequence", category: "control",
    description: "顺序执行多个操作，任一步失败则停止",
    params: [
      { name: "actions", type: "array", description: "操作名列表", required: true },
    ], returns: "any[]" },

  // ── IO 类 / IO ──
  { name: "log", category: "io",
    description: "记录日志",
    params: [
      { name: "level", type: "string", description: "日志级别：debug|info|warn|error", required: true },
      { name: "message", type: "string", description: "日志消息", required: true },
    ], returns: "void" },
  { name: "notify", category: "io",
    description: "发送通知",
    params: [
      { name: "target", type: "string", description: "通知目标：user|agent|channel|webhook", required: true },
      { name: "message", type: "string", description: "通知内容", required: true },
      { name: "priority", type: "string", description: "优先级：low|normal|high|critical", required: false },
    ], returns: "boolean" },
  { name: "fetch", category: "io",
    description: "发起 HTTP 请求",
    params: [
      { name: "url", type: "string", description: "请求 URL", required: true },
      { name: "options", type: "object", description: "请求选项 {method, headers, body}", required: false },
    ], returns: "object" },
  { name: "read_file", category: "io",
    description: "读取文件内容",
    params: [
      { name: "path", type: "string", description: "文件路径", required: true },
      { name: "encoding", type: "string", description: "编码：utf8|base64|binary", required: false },
    ], returns: "string" },
  { name: "write_file", category: "io",
    description: "写入文件",
    params: [
      { name: "path", type: "string", description: "文件路径", required: true },
      { name: "content", type: "string", description: "文件内容", required: true },
    ], returns: "boolean" },

  // ── 调度类 / Schedule ──
  { name: "schedule", category: "schedule",
    description: "创建定时任务",
    params: [
      { name: "cron", type: "string", description: "Cron 表达式", required: true },
      { name: "action", type: "string", description: "定时执行的操作名", required: true },
      { name: "timezone", type: "string", description: "时区", required: false },
    ], returns: "string" },
  { name: "delay", category: "schedule",
    description: "延迟执行操作",
    params: [
      { name: "ms", type: "number", description: "延迟毫秒数", required: true },
      { name: "action", type: "string", description: "要执行的操作名", required: true },
    ], returns: "string" },
  { name: "debounce", category: "schedule",
    description: "防抖执行，在连续调用中仅最后一次生效",
    params: [
      { name: "action", type: "string", description: "操作名", required: true },
      { name: "wait_ms", type: "number", description: "等待毫秒数", required: true },
    ], returns: "void" },

  // ── 安全类 / Security ──
  { name: "auth", category: "security",
    description: "认证检查",
    params: [
      { name: "method", type: "string", description: "认证方式：jwt|apikey|oauth|basic", required: true },
      { name: "config", type: "object", description: "认证配置", required: true },
    ], returns: "boolean" },
  { name: "rate_limit", category: "security",
    description: "速率限制检查",
    params: [
      { name: "key", type: "string", description: "限流键（如 IP 或用户 ID）", required: true },
      { name: "max_requests", type: "number", description: "最大请求数", required: true },
      { name: "period_seconds", type: "number", description: "时间窗口（秒）", required: true },
    ], returns: "boolean" },
  { name: "encrypt", category: "security",
    description: "加密数据",
    params: [
      { name: "data", type: "string", description: "明文数据", required: true },
      { name: "algorithm", type: "string", description: "加密算法：aes256|rsa|hmac", required: false },
    ], returns: "string" },
  { name: "hash", category: "security",
    description: "计算哈希值",
    params: [
      { name: "data", type: "string", description: "要哈希的数据", required: true },
      { name: "algorithm", type: "string", description: "哈希算法：sha256|sha512|md5|bcrypt", required: false },
    ], returns: "string" },

  // ── 缓存类 / Cache ──
  { name: "cache_get", category: "io",
    description: "从缓存获取值",
    params: [
      { name: "key", type: "string", description: "缓存键", required: true },
    ], returns: "any" },
  { name: "cache_set", category: "io",
    description: "设置缓存值",
    params: [
      { name: "key", type: "string", description: "缓存键", required: true },
      { name: "value", type: "any", description: "缓存值", required: true },
      { name: "ttl_seconds", type: "number", description: "过期时间（秒）", required: false },
    ], returns: "boolean" },
  { name: "cache_delete", category: "io",
    description: "删除缓存",
    params: [
      { name: "key", type: "string", description: "缓存键", required: true },
    ], returns: "boolean" },
];

/** 事件钩子定义 / Event hook definition */
export interface EventHook {
  event: string;            // 事件名：task_started | task_completed | task_failed | agent_selected | agent_error | pipeline_start | pipeline_end | state_changed | message_received | timeout
  action: string;           // 触发时执行的操作
  condition?: string;       // 条件表达式（可选）
  async: boolean;           // 是否异步执行
  priority: number;         // 优先级：0=最低, 100=最高
}

/** 管道步骤定义 / Pipeline step definition */
export interface PipelineStep {
  name: string;             // 步骤名称
  description: string;      // 步骤描述
  agent?: string;           // 执行此步骤的 Agent
  tools: string[];          // 需要的工具
  timeout_seconds: number;  // 超时时间
  retry_count: number;      // 失败重试次数
  on_failure: "skip" | "retry" | "abort" | "fallback";  // 失败处理
  fallback_step?: string;   // 失败时跳转的步骤
  depends_on: string[];     // 依赖的前置步骤
  condition?: string;       // 执行条件
}

/** 管道定义 / Pipeline definition */
export interface PipelineConfig {
  name: string;             // 管道名称
  description: string;      // 描述
  trigger: string;          // 触发条件
  steps: PipelineStep[];   // 步骤列表
  max_concurrency: number;  // 最大并发数
  timeout_seconds: number;  // 整体超时
  on_complete: string;      // 完成后的操作
}

/** 状态定义 / State definition */
export interface StateDefinition {
  name: string;             // 状态名称
  description: string;      // 描述
  is_initial?: boolean;     // 是否初始状态
  is_final?: boolean;       // 是否终态
  on_enter?: string;        // 进入时执行
  on_exit?: string;         // 退出时执行
  timeout_seconds?: number; // 状态超时
}

/** 状态转换 / State transition */
export interface StateTransition {
  from: string;             // 源状态
  to: string;               // 目标状态
  trigger: string;          // 触发事件
  condition?: string;       // 转换条件
  action?: string;          // 转换时执行的操作
}

/** 状态机定义 / State machine definition */
export interface StateMachineConfig {
  name: string;             // 状态机名称
  initial: string;          // 初始状态
  states: StateDefinition[];
  transitions: StateTransition[];
}

/** 通信配置 / Communication configuration */
export interface CommunicationConfig {
  protocol: string;         // 协议：a2a | rest | websocket | grpc | message_queue
  encoding: string;         // 编码：json | protobuf | msgpack | text
  timeout_ms: number;       // 通信超时
  retry_policy: string;     // 重试策略：none | fixed | exponential
  max_retries: number;      // 最大重试次数
  heartbeat_interval_ms: number; // 心跳间隔
  compression: string;      // 压缩：none | gzip | brotli
  encryption: string;       // 加密：none | tls | custom
  batch_size: number;       // 批量大小
  queue_capacity: number;   // 队列容量
}

/** 内存配置 / Memory configuration */
export interface MemoryConfig {
  type: string;             // 类型：episodic | semantic | procedural | working
  capacity: string;         // 容量：unlimited | 1K | 10K | 100K | 1M
  persistence: boolean;     // 是否持久化
  ttl_seconds: number;      // 存活时间
  search_method: string;    // 检索方式：exact | fuzzy | semantic | hybrid
  priority: number;         // 优先级
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
  // 扩展字段 / Extended fields
  events?: EventHook[];       // 事件钩子
  pipelines?: PipelineConfig[]; // 管道定义
  state_machine?: StateMachineConfig; // 状态机
  communication?: CommunicationConfig; // 通信配置
  memory?: MemoryConfig;      // 内存配置
  variables?: Record<string, DSLValue>; // 变量定义
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

      // 特殊块类型处理 / Special block type handling
      if (blockKey === "events" || blockKey === "on") {
        // 事件列表 / Event list
        const events = parseEvents(lines, i + 1);
        config["events"] = events.events;
        i = events.endIdx + 1;
        continue;
      }
      if (blockKey === "pipeline") {
        // 管道定义 / Pipeline definition
        const pipelineName = trimmed.match(/pipeline\s+["']([^"']+)["']\s*\{/);
        if (pipelineName) {
          const nested = parseBlock(lines, i + 1);
          const pipelineConfig = parsePipelineConfig(pipelineName[1], nested.config);
          const existing = (config["pipelines"] as PipelineConfig[]) || [];
          existing.push(pipelineConfig);
          config["pipelines"] = existing;
          i = nested.endIdx + 1;
          continue;
        }
      }
      if (blockKey === "state_machine" || blockKey === "state") {
        const stateName = trimmed.match(/(?:state_machine|state)\s+["']([^"']+)["']\s*\{/);
        const nested = parseBlock(lines, i + 1);
        config["state_machine"] = parseStateMachine(stateName?.[1] || "default", nested.config);
        i = nested.endIdx + 1;
        continue;
      }
      if (blockKey === "communication" || blockKey === "comm") {
        const nested = parseBlock(lines, i + 1);
        config["communication"] = parseCommunicationConfig(nested.config);
        i = nested.endIdx + 1;
        continue;
      }
      if (blockKey === "memory") {
        const nested = parseBlock(lines, i + 1);
        config["memory"] = parseMemoryConfig(nested.config);
        i = nested.endIdx + 1;
        continue;
      }
      if (blockKey === "variables" || blockKey === "vars") {
        const nested = parseBlock(lines, i + 1);
        config["variables"] = nested.config;
        i = nested.endIdx + 1;
        continue;
      }

      // 通用嵌套块 / Generic nested block
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

// ── 扩展解析器：事件、管道、状态机、通信、内存 / Extended parsers: events, pipelines, state machines, communication, memory ──

/** 解析事件钩子块 / Parse event hooks block */
function parseEvents(lines: string[], startIdx: number): { events: EventHook[]; endIdx: number } {
  const events: EventHook[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === "}") return { events, endIdx: i };
    if (!trimmed || trimmed.startsWith("#")) { i++; continue; }

    // 格式: on "event_name" { ... } / Format: on "event_name" { ... }
    const eventMatch = trimmed.match(/on\s+["'](\w+)["']\s*\{/);
    if (eventMatch) {
      const nested = parseBlock(lines, i + 1);
      const eventConfig = nested.config;
      events.push({
        event: eventMatch[1],
        action: (eventConfig.action as string) || (eventConfig.do as string) || "",
        condition: eventConfig.condition as string,
        async: (eventConfig.async as boolean) ?? true,
        priority: (eventConfig.priority as number) || 50,
      });
      i = nested.endIdx + 1;
      continue;
    }

    // 格式: key = value / Format: key = value
    const kv = parseKeyValue(trimmed);
    if (kv) {
      // 单行事件定义: event_name = "action"
      if (i > 0) {
        events.push({
          event: kv.key,
          action: typeof kv.value === "string" ? kv.value : String(kv.value),
          async: true,
          priority: 50,
        });
      }
    }

    i++;
  }

  return { events, endIdx: i };
}

/** 解析管道配置 / Parse pipeline configuration */
function parsePipelineConfig(name: string, config: Record<string, unknown>): PipelineConfig {
  const steps: PipelineStep[] = [];
  const rawSteps = config.steps as unknown[] || [];

  for (const step of rawSteps) {
    if (typeof step === "object" && step !== null) {
      const s = step as Record<string, unknown>;
      steps.push({
        name: (s.name as string) || "",
        description: (s.description as string) || "",
        agent: s.agent as string,
        tools: (s.tools as string[]) || [],
        timeout_seconds: (s.timeout as number) || (s.timeout_seconds as number) || 60,
        retry_count: (s.retry as number) || (s.retry_count as number) || 0,
        on_failure: (s.on_failure as PipelineStep["on_failure"]) || "skip",
        fallback_step: s.fallback as string || s.fallback_step as string,
        depends_on: (s.depends_on as string[]) || [],
        condition: s.condition as string,
      });
    }
  }

  return {
    name,
    description: (config.description as string) || "",
    trigger: (config.trigger as string) || "",
    steps,
    max_concurrency: (config.max_concurrency as number) || (config.concurrent as number) || 1,
    timeout_seconds: (config.timeout as number) || (config.timeout_seconds as number) || 300,
    on_complete: (config.on_complete as string) || (config.then as string) || "",
  };
}

/** 解析状态机配置 / Parse state machine configuration */
function parseStateMachine(name: string, config: Record<string, unknown>): StateMachineConfig {
  const states: StateDefinition[] = [];
  const transitions: StateTransition[] = [];

  const rawStates = config.states as Record<string, unknown>[] || [];
  for (const s of rawStates) {
    states.push({
      name: (s.name as string) || "",
      description: (s.description as string) || "",
      is_initial: s.initial as boolean || s.is_initial as boolean,
      is_final: s.final as boolean || s.is_final as boolean,
      on_enter: s.on_enter as string,
      on_exit: s.on_exit as string,
      timeout_seconds: s.timeout as number,
    });
  }

  const rawTransitions = config.transitions as Record<string, unknown>[] || [];
  for (const t of rawTransitions) {
    transitions.push({
      from: (t.from as string) || "",
      to: (t.to as string) || "",
      trigger: (t.trigger as string) || (t.on as string) || "",
      condition: t.condition as string,
      action: t.action as string || t.do as string,
    });
  }

  return {
    name,
    initial: (config.initial as string) || states[0]?.name || "",
    states,
    transitions,
  };
}

/** 解析通信配置 / Parse communication configuration */
function parseCommunicationConfig(config: Record<string, unknown>): CommunicationConfig {
  return {
    protocol: (config.protocol as string) || "a2a",
    encoding: (config.encoding as string) || "json",
    timeout_ms: (config.timeout as number) || (config.timeout_ms as number) || 30000,
    retry_policy: (config.retry_policy as string) || "exponential",
    max_retries: (config.max_retries as number) || 3,
    heartbeat_interval_ms: (config.heartbeat as number) || (config.heartbeat_interval_ms as number) || 10000,
    compression: (config.compression as string) || "none",
    encryption: (config.encryption as string) || "tls",
    batch_size: (config.batch_size as number) || 10,
    queue_capacity: (config.queue_capacity as number) || 100,
  };
}

/** 解析内存配置 / Parse memory configuration */
function parseMemoryConfig(config: Record<string, unknown>): MemoryConfig {
  return {
    type: (config.type as string) || "episodic",
    capacity: (config.capacity as string) || "10K",
    persistence: (config.persistence as boolean) ?? true,
    ttl_seconds: (config.ttl as number) || (config.ttl_seconds as number) || 3600,
    search_method: (config.search as string) || (config.search_method as string) || "hybrid",
    priority: (config.priority as number) || 50,
  };
}

// ── 表达式求值器 / Expression Evaluator ──

/** 求值上下文 / Evaluation context */
export interface EvalContext {
  variables: Record<string, DSLValue>;
  functions: Record<string, (...args: any[]) => any>;
  data: Record<string, unknown>;
}

/** 表达式求值 / Evaluate an expression */
export function evaluateExpression(expr: string | ExprNode, ctx: EvalContext): unknown {
  if (typeof expr === "string") {
    // 变量引用 / Variable reference
    if (expr.startsWith("$")) {
      const varName = expr.slice(1);
      return ctx.variables[varName] ?? ctx.data[varName];
    }
    // 函数调用 / Function call
    const callMatch = expr.match(/^(\w+)\s*\((.*)\)$/);
    if (callMatch && ctx.functions[callMatch[1]]) {
      const args = callMatch[2].split(",").map((a) => evalArg(a.trim(), ctx));
      return ctx.functions[callMatch[1]](...args);
    }
    // 字面量 / Literal
    return parseValue(expr);
  }

  // AST 节点 / AST node
  const node = expr;
  switch (node.type) {
    case "literal":
      return node.value;
    case "variable":
      return ctx.variables[node.name!] ?? ctx.data[node.name!];
    case "call": {
      const fn = ctx.functions[node.callee!];
      if (!fn) throw new Error(`Unknown function: ${node.callee}`);
      const args = (node.args || []).map((a) => evaluateExpression(a, ctx));
      return fn(...args);
    }
    case "binary": {
      const left = evaluateExpression(node.left!, ctx);
      const right = evaluateExpression(node.right!, ctx);
      return evalBinary(left, node.operator!, right);
    }
    case "unary": {
      const val = evaluateExpression(node.left!, ctx);
      if (node.operator === "!") return !val;
      if (node.operator === "-") return -(val as number);
      return val;
    }
    case "ternary": {
      const test = evaluateExpression(node.test!, ctx);
      return test ? evaluateExpression(node.consequent!, ctx) : evaluateExpression(node.alternate!, ctx);
    }
    case "array":
      return (node.elements || []).map((e) => evaluateExpression(e, ctx));
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties || []) {
        obj[prop.key] = evaluateExpression(prop.value, ctx);
      }
      return obj;
    }
    default:
      return null;
  }
}

/** 求值函数参数 / Evaluate function argument */
function evalArg(arg: string, ctx: EvalContext): unknown {
  if (arg.startsWith("$")) return ctx.variables[arg.slice(1)] ?? ctx.data[arg.slice(1)];
  return parseValue(arg);
}

/** 二元运算求值 / Binary operation evaluation */
function evalBinary(left: unknown, op: string, right: unknown): unknown {
  const l = left as number;
  const r = right as number;
  switch (op) {
    case "+": return (typeof left === "string" || typeof right === "string") ? String(left) + String(right) : l + r;
    case "-": return l - r;
    case "*": return l * r;
    case "/": return l / r;
    case "%": return l % r;
    case "**": return Math.pow(l, r);
    case "==": return left === right;
    case "!=": return left !== right;
    case ">": return l > r;
    case "<": return l < r;
    case ">=": return l >= r;
    case "<=": return l <= r;
    case "&&": return left && right;
    case "||": return left || right;
    case "??": return left ?? right;
    default: return null;
  }
}

/** 创建标准求值上下文 / Create standard evaluation context */
export function createEvalContext(variables?: Record<string, DSLValue>): EvalContext {
  return {
    variables: variables || {},
    functions: {
      // 验证 / Validation
      validate: (data: unknown, rules: unknown) => {
        const errors: string[] = [];
        const r = rules as Record<string, unknown>;
        if (r?.required && (data === null || data === undefined)) errors.push("value is required");
        if (r?.min !== undefined && typeof data === "number" && (data as number) < (r.min as number)) errors.push(`min ${r.min}`);
        if (r?.max !== undefined && typeof data === "number" && (data as number) > (r.max as number)) errors.push(`max ${r.max}`);
        return [errors.length === 0, errors];
      },
      // 转换 / Transform
      transform: (data: unknown, from: string, to: string) => {
        if (from === "json" && to === "markdown") return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        return String(data);
      },
      template: (templateStr: string, data: unknown) => {
        return templateStr.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
          const d = data as Record<string, unknown>;
          return String(d[key] ?? "");
        });
      },
      // 控制 / Control
      retry: (action: string, maxAttempts = 3) => ({ action, maxAttempts, status: "pending" }),
      timeout: (action: string, ms: number) => ({ action, ms, status: "pending" }),
      fallback: (primary: string, backup: string) => ({ primary, backup, status: "pending" }),
      parallel: (actions: string[]) => actions.map((a) => ({ action: a, status: "pending" })),
      sequence: (actions: string[]) => actions.map((a) => ({ action: a, status: "pending" })),
      // IO
      log: (level: string, message: string) => { console.log(`[${level.toUpperCase()}] ${message}`); },
      notify: (target: string, msg: string) => ({ target, msg, status: "sent" }),
      // 安全 / Security
      rate_limit: (key: string, max: number) => ({ key, max, allowed: true }),
      hash: (data: string, algo = "sha256") => `${algo}:${data.slice(0, 8)}...`,
      encrypt: (data: string, algo = "aes256") => `${algo}:${data.slice(0, 8)}...`,
      auth: () => true,
      // 缓存 / Cache
      cache_get: (key: string) => null,
      cache_set: (key: string, value: unknown) => true,
      cache_delete: (key: string) => true,
    },
    data: {},
  };
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
    events: partial.events || [],
    pipelines: partial.pipelines || [],
    state_machine: partial.state_machine,
    communication: partial.communication,
    memory: partial.memory,
    variables: partial.variables || {},
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

  // 事件钩子 / Event hooks
  if (config.events && config.events.length > 0) {
    lines.push("");
    lines.push(`    events {`);
    for (const ev of config.events) {
      lines.push(`        on "${ev.event}" {`);
      lines.push(`            action = "${ev.action}"`);
      if (ev.condition) lines.push(`            condition = "${ev.condition}"`);
      lines.push(`            async = ${ev.async}`);
      lines.push(`            priority = ${ev.priority}`);
      lines.push(`        }`);
    }
    lines.push(`    }`);
  }

  // 变量 / Variables
  if (config.variables && Object.keys(config.variables).length > 0) {
    lines.push("");
    lines.push(`    variables {`);
    for (const [k, v] of Object.entries(config.variables)) {
      if (typeof v === "string") lines.push(`        ${k} = "${v}"`);
      else lines.push(`        ${k} = ${JSON.stringify(v)}`);
    }
    lines.push(`    }`);
  }

  // 管道 / Pipelines
  if (config.pipelines && config.pipelines.length > 0) {
    for (const pipe of config.pipelines) {
      lines.push("");
      lines.push(`    pipeline "${pipe.name}" {`);
      if (pipe.description) lines.push(`        description = "${pipe.description}"`);
      if (pipe.trigger) lines.push(`        trigger = "${pipe.trigger}"`);
      lines.push(`        max_concurrency = ${pipe.max_concurrency}`);
      lines.push(`        timeout = ${pipe.timeout_seconds}`);
      if (pipe.on_complete) lines.push(`        on_complete = "${pipe.on_complete}"`);
      if (pipe.steps.length > 0) {
        lines.push(`        steps = [`);
        for (const step of pipe.steps) {
          lines.push(`            {`);
          lines.push(`                name: "${step.name}",`);
          lines.push(`                description: "${step.description}",`);
          if (step.agent) lines.push(`                agent: "${step.agent}",`);
          lines.push(`                timeout: ${step.timeout_seconds},`);
          lines.push(`                retry: ${step.retry_count},`);
          lines.push(`                on_failure: "${step.on_failure}",`);
          if (step.tools.length > 0) lines.push(`                tools: ${JSON.stringify(step.tools)},`);
          if (step.depends_on.length > 0) lines.push(`                depends_on: ${JSON.stringify(step.depends_on)},`);
          if (step.condition) lines.push(`                condition: "${step.condition}",`);
          lines.push(`            },`);
        }
        lines.push(`        ]`);
      }
      lines.push(`    }`);
    }
  }

  // 状态机 / State machine
  if (config.state_machine) {
    const sm = config.state_machine;
    lines.push("");
    lines.push(`    state_machine "${sm.name}" {`);
    lines.push(`        initial = "${sm.initial}"`);
    if (sm.states.length > 0) {
      lines.push(`        states = [`);
      for (const s of sm.states) {
        lines.push(`            {`);
        lines.push(`                name: "${s.name}",`);
        if (s.description) lines.push(`                description: "${s.description}",`);
        if (s.is_initial) lines.push(`                initial: true,`);
        if (s.is_final) lines.push(`                final: true,`);
        if (s.on_enter) lines.push(`                on_enter: "${s.on_enter}",`);
        if (s.on_exit) lines.push(`                on_exit: "${s.on_exit}",`);
        if (s.timeout_seconds) lines.push(`                timeout: ${s.timeout_seconds},`);
        lines.push(`            },`);
      }
      lines.push(`        ]`);
    }
    if (sm.transitions.length > 0) {
      lines.push(`        transitions = [`);
      for (const t of sm.transitions) {
        lines.push(`            {`);
        lines.push(`                from: "${t.from}",`);
        lines.push(`                to: "${t.to}",`);
        lines.push(`                on: "${t.trigger}",`);
        if (t.condition) lines.push(`                condition: "${t.condition}",`);
        if (t.action) lines.push(`                do: "${t.action}",`);
        lines.push(`            },`);
      }
      lines.push(`        ]`);
    }
    lines.push(`    }`);
  }

  // 通信 / Communication
  if (config.communication) {
    const c = config.communication;
    lines.push("");
    lines.push(`    communication {`);
    lines.push(`        protocol = "${c.protocol}"`);
    lines.push(`        encoding = "${c.encoding}"`);
    lines.push(`        timeout = ${c.timeout_ms}`);
    lines.push(`        retry_policy = "${c.retry_policy}"`);
    lines.push(`        max_retries = ${c.max_retries}`);
    lines.push(`        heartbeat = ${c.heartbeat_interval_ms}`);
    lines.push(`        compression = "${c.compression}"`);
    lines.push(`        encryption = "${c.encryption}"`);
    lines.push(`        batch_size = ${c.batch_size}`);
    lines.push(`        queue_capacity = ${c.queue_capacity}`);
    lines.push(`    }`);
  }

  // 内存 / Memory
  if (config.memory) {
    const m = config.memory;
    lines.push("");
    lines.push(`    memory {`);
    lines.push(`        type = "${m.type}"`);
    lines.push(`        capacity = "${m.capacity}"`);
    lines.push(`        persistence = ${m.persistence}`);
    lines.push(`        ttl = ${m.ttl_seconds}`);
    lines.push(`        search = "${m.search_method}"`);
    lines.push(`        priority = ${m.priority}`);
    lines.push(`    }`);
  }

  lines.push(`}`);
  return lines.join("\n");
}