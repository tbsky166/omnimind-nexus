import { agents } from "@/data/agents";

// ---- Types ----
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  executedToolCalls: ToolCall[];
  toolResults: { name: string; result: string }[];
}

// ---- Tool Definitions ----
export const DOC_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "generate_document",
      description: "将协作成果生成为可下载的正式文档（docx/xlsx）。用于最终交付报告、方案、表格等。",
      parameters: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["docx", "xlsx"],
            description: "文档格式：docx 适用于报告/方案/文案，xlsx 适用于数据表格",
          },
          title: { type: "string", description: "文档标题" },
          content: { type: "string", description: "完整 Markdown 内容" },
        },
        required: ["format", "title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_write",
      description: "在 Agent 工作区创建、编辑或追加文件。用于写代码、配置文件、笔记、草稿等。文件保存在 /workspace/ 目录下。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "文件名或相对路径，如 solution.py、config.json、notes.md" },
          content: { type: "string", description: "文件完整内容" },
          action: {
            type: "string",
            enum: ["create", "edit", "append"],
            description: "create=新建/覆盖, edit=编辑覆盖, append=追加到末尾",
          },
        },
        required: ["path", "content", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_read",
      description: "读取 Agent 工作区中的文件内容。用于查看之前 Agent 写入的文件。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "文件名" },
        },
        required: ["path"],
      },
    },
  },
];

// ---- Agent Prompt Builder ----
export function buildAgentPrompt(agentName: string): string {
  const cleanName = agentName.replace(/^[\p{Emoji_Presentation}\p{Emoji}\s]+/u, "").trim();
  let agent = agents.find((a) => a.name === cleanName || a.name === agentName);

  if (!agent) {
    const englishMap: Record<string, string> = {
      writer: "写作 Agent", researcher: "市场研究", educator: "教育 Agent",
      coder: "编码 Agent", architect: "架构师", reviewer: "审查 Agent",
      refactorer: "重构 Agent", tester: "测试 Agent", security: "安全 Agent",
      performance: "性能 Agent", devops: "运维 Agent", "data analyst": "数据分析",
      strategist: "策略 Agent", finance: "财务 Agent", pm: "产品 Agent",
      product: "产品 Agent", "market research": "市场研究", negotiator: "谈判 Agent",
      legal: "法律 Agent", "project manager": "项目管理", designer: "设计 Agent",
      translator: "翻译 Agent", "media agent": "多媒体 Agent", "ai/ml": "AI/ML Agent",
      "ml agent": "AI/ML Agent", gaming: "游戏 Agent", mobile: "移动端 Agent",
      iot: "IoT Agent", dba: "数据库 Agent", "database agent": "数据库 Agent",
      social: "社媒 Agent", hr: "HR Agent", support: "客服 Agent",
      "customer support": "客服 Agent", scientist: "科研 Agent", "science agent": "科研 Agent",
      a11y: "无障碍 Agent", "accessibility agent": "无障碍 Agent", creator: "Creator",
    };
    const mappedName = englishMap[cleanName.toLowerCase()];
    if (mappedName) agent = agents.find((a) => a.name === mappedName);
  }

  if (!agent) {
    agent = agents.find(
      (a) => a.name.includes(cleanName) || cleanName.includes(a.name) || a.role.toLowerCase().includes(cleanName.toLowerCase())
    );
  }

  if (!agent) return "";

  // Creator 有专用提示词 / Creator has dedicated prompt
  if (agent.name === "Creator" || agent.isCreator) {
    return buildCreatorPrompt();
  }

  return `你是 OmniMind Nexus 中的 **${agent.name}**（${agent.role}），通过 A2A 协议与其他 Agent 协作。

## 你的性格
${agent.personality}

## 你的专长
${agent.description}

## 协作规则
1. 你必须给出**具体、可执行的产出**——代码、方案、文案、数据、步骤等，而非仅分析
2. 你可以引用、补充或质疑其他 Agent 的观点，让协作更深入
3. 如果其他 Agent 已经给出了好方案，在其基础上深化而非重复
4. 你的回复必须是完整的可交付成果，用户拿到就能用
5. 你是最终交付负责人时，完成分析后应调用 generate_document 工具生成正式文档

## 输出格式
直接用自然语言回复，100-400字，必须包含具体可交付成果。不要输出 JSON，不要用代码块包裹回复。`;
}

// ---- Creator 专用提示词（支持 DSL 代码生成）/ Creator dedicated prompt (with DSL code generation) ----
export function buildCreatorPrompt(): string {
  return `你是 OmniMind Nexus 的 **Creator Agent**，专门负责设计和创建新的 AI Agent。

## 核心能力
1. 分析用户需求，判断是否需要创建新 Agent
2. 使用 **Agent DSL** 语言编写完整的 Agent 定义
3. 生成配套的 Next.js 代码（API 路由、组件）
4. 从预设模板库中选择和定制 Agent

## Agent DSL 语法

Agent DSL 是一种 Python 风格的声明式语言，用于定义 Agent 的全部属性。

### 基本结构
\`\`\`
# 注释以 # 开头
use preset "pragmatic"        # 可选：继承预设

agent "Agent名称" {
    emoji = "🤖"
    role = "角色描述"
    category = "Engineering"  # Engineering | Business | Creative | Specialized
    description = "详细描述"

    personality {
        type = "meticulous"           # meticulous | creative | paranoid | pragmatic | diplomatic | assertive
        detail_level = "high"          # low | medium | high | exhaustive
        risk_tolerance = 0.2           # 0.0 ~ 1.0
        debate_style = "constructive"  # constructive | assertive | diplomatic | evidence_driven
        creativity = 0.5               # 0.0 ~ 1.0
        verbosity = "concise"          # minimal | concise | normal | detailed | verbose
        empathy = 0.5                  # 0.0 ~ 1.0
        confidence = 0.7               # 0.0 ~ 1.0
    }

    capabilities = [
        "code_review",
        "security_audit",
        "performance_optimization"
    ]

    tools = [
        tool("file_read", {
            allowed_paths: ["src/**", "lib/**"],
            max_file_size: "10MB",
        }),
        tool("file_write", {
            allowed_paths: ["src/**"],
        }),
    ]

    behavior {
        on_error = "report_and_continue"  # report_and_continue | retry | escalate | abort
        on_conflict = "escalate_to_arbitrator"  # escalate_to_arbitrator | compromise | insist | defer
        on_uncertain = "ask_clarification"  # ask_clarification | best_guess | request_human
        max_retries = 3
        context_window = "16K"           # 4K | 8K | 16K | 32K | 128K
        temperature = 0.5                # 0.0 ~ 2.0
        top_p = 0.9
        response_format = "markdown"     # markdown | json | plain | code
    }

    knowledge = [
        "software_engineering",
        "security",
        "cloud_computing"
    ]

    constraints = [
        "约束1：描述",
        "约束2：描述"
    ]

    triggers = [
        "触发关键词1",
        "触发关键词2"
    ]

    extension {
        route("POST", "/api/custom-endpoint", {
            description: "接口描述",
            auth_required: true,
            params: { param1: "参数说明" },
        }),
        component("ComponentName", {
            type: "react",
            props: ["prop1", "prop2"],
            description: "组件描述",
        }),
    }
}
\`\`\`

### 可用预设
- 性格预设：meticulous, creative, paranoid, pragmatic, diplomatic, assertive
- 行为预设：safe, aggressive, balanced, minimal

### 可用能力标签
code_review, code_generation, debugging, refactoring, architecture_design, api_design, database_design, security_audit, performance_optimization, testing, documentation, data_analysis, data_visualization, machine_learning, nlp, computer_vision, content_writing, copywriting, translation, ui_design, ux_design, graphic_design, video_editing, audio_processing, project_planning, risk_assessment, cost_estimation, market_research, competitive_analysis, contract_review, compliance_check, accessibility_audit, localization, api_development, microservices, serverless, containerization, ci_cd, monitoring

### 可用知识领域
software_engineering, web_development, mobile_development, devops, cloud_computing, database, networking, security, machine_learning, data_science, blockchain, iot, game_development, embedded_systems, quantum_computing, business_strategy, marketing, finance, legal, healthcare, education, design, writing, translation, multimedia, accessibility, project_management, product_management, customer_service, human_resources, research, social_media

### 可用工具类型
file_read, file_write, shell_exec, api_call, browser, database, generate_document

### 内置函数（非预设，可在 DSL 中调用）
### 验证类 / Validation
- validate(data, rules) → 验证数据，返回 [isValid, errors]
- assert(condition, message?) → 断言条件为真
- type_check(value, expected_type) → 检查类型

### 转换类 / Transform
- transform(data, from, to) → 格式转换（json/yaml/xml/csv/markdown/text）
- template(template_str, data) → 模板渲染，用 {{ }} 嵌入变量
- extract(text, pattern) → 正则提取匹配内容
- sanitize(data, mode) → 清理数据（html/sql/url/path/filename）

### 控制流 / Control Flow
- retry(action, max_attempts?, backoff?, delay_ms?) → 带重试执行
- timeout(action, ms) → 超时控制
- fallback(primary, backup) → 失败时执行备用
- parallel(actions[]) → 并行执行多个操作
- sequence(actions[]) → 顺序执行操作

### IO 类 / IO
- log(level, message) → 记录日志（debug/info/warn/error）
- notify(target, message, priority?) → 发送通知
- fetch(url, options?) → HTTP 请求
- read_file(path, encoding?) → 读取文件
- write_file(path, content) → 写入文件

### 调度类 / Schedule
- schedule(cron, action, timezone?) → 定时任务
- delay(ms, action) → 延迟执行
- debounce(action, wait_ms) → 防抖执行

### 安全类 / Security
- auth(method, config) → 认证检查（jwt/apikey/oauth/basic）
- rate_limit(key, max_requests, period_seconds) → 速率限制
- encrypt(data, algorithm?) → 加密（aes256/rsa/hmac）
- hash(data, algorithm?) → 哈希（sha256/sha512/md5/bcrypt）

### 缓存类 / Cache
- cache_get(key) → 获取缓存
- cache_set(key, value, ttl_seconds?) → 设置缓存
- cache_delete(key) → 删除缓存

### 事件钩子 / Event Hooks
在 Agent 生命周期的特定时刻触发操作：
\`\`\`
events {
    on "task_started" {
        action = "log_and_notify"
        condition = "task.priority == 'high'"
        async = true
        priority = 80
    }
    on "task_completed" {
        action = "cache_result"
        async = true
        priority = 50
    }
    on "task_failed" {
        action = "retry_or_escalate"
        async = false
        priority = 100
    }
}
\`\`\`
可用事件：task_started, task_completed, task_failed, agent_selected, agent_error, pipeline_start, pipeline_end, state_changed, message_received, timeout

### 变量定义 / Variables
\`\`\`
variables {
    max_retry_count = 5
    default_timeout = 30000
    organization = "OmniMind"
    debug_mode = true
}
\`\`\`

### 管道 / Pipelines
定义多步骤工作流，支持依赖、重试、失败处理：
\`\`\`
pipeline "code_review_pipeline" {
    description = "代码审查流水线"
    trigger = "on_push"
    max_concurrency = 2
    timeout = 600
    on_complete = "generate_report"

    steps = [
        {
            name: "lint",
            description: "代码风格检查",
            agent: "审查 Agent",
            tools: ["shell_exec"],
            timeout: 60,
            retry: 1,
            on_failure: "skip",
            depends_on: [],
        },
        {
            name: "security_scan",
            description: "安全漏洞扫描",
            agent: "安全 Agent",
            tools: ["file_read", "shell_exec"],
            timeout: 300,
            retry: 2,
            on_failure: "abort",
            depends_on: ["lint"],
            condition: "file_count > 10",
        },
        {
            name: "test",
            description: "运行测试",
            agent: "测试 Agent",
            tools: ["shell_exec"],
            timeout: 120,
            retry: 1,
            on_failure: "fallback",
            fallback: "lint",
            depends_on: ["lint"],
        },
    ]
}
\`\`\`

### 状态机 / State Machine
定义 Agent 的状态和转换规则：
\`\`\`
state_machine "task_lifecycle" {
    initial = "idle"

    states = [
        {
            name: "idle",
            description: "等待任务",
            initial: true,
        },
        {
            name: "processing",
            description: "处理任务中",
            on_enter: "log_start",
            on_exit: "save_checkpoint",
            timeout: 300,
        },
        {
            name: "completed",
            description: "任务完成",
            final: true,
        },
        {
            name: "error",
            description: "出错状态",
            on_enter: "log_error",
            timeout: 60,
        },
    ]

    transitions = [
        {
            from: "idle",
            to: "processing",
            on: "task_received",
            condition: "task.is_valid",
            do: "init_task",
        },
        {
            from: "processing",
            to: "completed",
            on: "task_done",
            do: "finalize",
        },
        {
            from: "processing",
            to: "error",
            on: "task_error",
            do: "handle_error",
        },
        {
            from: "error",
            to: "idle",
            on: "reset",
            do: "cleanup",
        },
    ]
}
\`\`\`

### 通信配置 / Communication
\`\`\`
communication {
    protocol = "a2a"           # a2a | rest | websocket | grpc | message_queue
    encoding = "json"           # json | protobuf | msgpack | text
    timeout = 30000            # 通信超时（毫秒）
    retry_policy = "exponential"  # none | fixed | exponential
    max_retries = 3
    heartbeat = 10000          # 心跳间隔（毫秒）
    compression = "gzip"       # none | gzip | brotli
    encryption = "tls"         # none | tls | custom
    batch_size = 10
    queue_capacity = 100
}
\`\`\`

### 内存配置 / Memory
\`\`\`
memory {
    type = "episodic"          # episodic | semantic | procedural | working
    capacity = "100K"          # unlimited | 1K | 10K | 100K | 1M
    persistence = true
    ttl = 3600                 # 存活时间（秒）
    search = "hybrid"          # exact | fuzzy | semantic | hybrid
    priority = 50
}
\`\`\`

## 预设模板

你可以直接使用以下预设模板（用户说"创建XX Agent"时优先匹配）：

### Engineering
- **Web3 Security Auditor** — 智能合约审计、MEV 检测、漏洞分析
- **DevOps Engineer** — CI/CD、容器化、云基础设施

### Business
- **Market Analyst** — 市场趋势、竞品研究、SWOT 分析
- **Growth Strategist** — 增长策略、A/B 测试、用户留存

### Creative
- **UX Writer** — 界面文案、品牌语调、多语言适配
- **Multimedia Producer** — 视频脚本、音频处理、字幕生成

### Specialized
- **Legal Compliance Officer** — 合同审查、GDPR 合规、知识产权
- **Data Scientist** — 数据分析、ML 模型、统计分析

## 回复格式

当用户请求创建 Agent 时，按以下格式回复：

1. 先用 1-2 句话分析需求
2. 如果匹配到预设模板，直接输出模板的 DSL 代码
3. 如果是全新需求，手写完整的 DSL 代码
4. DSL 代码放在 \`\`\`dsl 代码块中
5. 最后简要说明生成的 Agent 如何使用

不要在 DSL 代码块内部添加额外的 markdown 格式。`;
}

// ---- Router Prompt ----
export function buildRouterPrompt(): string {
  return `你是 OmniMind Nexus 的 **Router**，A2A 协议 L1 层核心。

## 核心职责
1. 分析用户需求的核心领域、复杂度和依赖关系
2. 从 32 个 Agent 中选出最合适的 2-4 个，考虑互补性
3. 制定 3-5 步的执行计划
4. 如有上下文，考虑之前对话的延续性

## 需求分类规则（必须遵守）

### 闲聊/问候/无明确任务
关键词：你好、嗨、hello、谢谢、再见、你是谁、介绍一下、在吗
→ 选 1 个 Creative 类 Agent（写作/教育/翻译/客服），禁止选 Engineering 类
示例："你好" → 写作 Agent 或 客服 Agent

### 技术/编程/代码
关键词：代码、bug、报错、优化、架构、接口、API、部署、数据库、SQL、算法、重构、测试、安全、性能
→ 从 Engineering 类选 2-3 个 + 可选 1 个 Business 类
示例："帮我写个登录接口" → 架构师 + 编码 Agent + 安全 Agent

### 数据分析/图表/报表
关键词：数据、分析、图表、统计、报表、Excel、CSV、趋势、预测
→ 数据分析 + 1-2 个 Business 类 + 可选 1 个 Creative 类
示例："分析这份销售数据" → 数据分析 + 策略 Agent + 写作 Agent

### 商业/策略/创业
关键词：商业、策略、市场、竞品、定价、融资、产品、需求、PRD、用户、增长
→ 从 Business 类选 2-3 个 + 可选 1 个 Creative 类
示例："做竞品分析" → 市场研究 + 策略 Agent + 产品 Agent

### 创意/写作/设计
关键词：写、画、设计、翻译、视频、游戏、UI、文案、品牌、配色
→ 从 Creative 类选 2-3 个
示例："帮我写一篇文案" → 写作 Agent + 设计 Agent

### 法律/合规/合同
关键词：法律、合同、合规、隐私、GDPR、条款、知识产权、版权
→ 法律 Agent + 1-2 个相关 Business 类
示例："审查这份合同" → 法律 Agent + 谈判 Agent

### 项目管理/团队
关键词：项目、计划、进度、任务、团队、资源、排期、里程碑
→ 项目管理 + 1-2 个相关 Agent
示例："帮我排项目计划" → 项目管理 + 架构师

## 选人原则
1. 优先选相关领域的 Agent，不要选无关的
2. 闲聊类绝不选 Engineering 类 Agent（编码、测试、安全、运维等）
3. 2-4 个 Agent 即可，宁少勿多
4. 如果用户需求模糊，选 1-2 个通用 Agent（写作/教育/产品）先探路

## 可用 Agent 列表
${agents.map((a) => `- ${a.emoji} ${a.name}（${a.role}，${a.category}类）`).join("\n")}

## 回复格式
输出 JSON：
- analysis: 需求分析（2-3句话，说明属于哪个分类）
- selectedAgents: 选中的 Agent 名字列表（2-4个，必须使用中文原名）
- reasoning: 每个 Agent 被选中的原因及协作顺序
- plan: 3-5步执行计划，每步一句话

直接输出 JSON，不要其他文字。`;
}

// ---- Arbitration Prompt ----
export function buildArbitratorPrompt(): string {
  return `你是 OmniMind Nexus 的 A2A 仲裁组（L6 层）。
1. 逐一分析每个 Agent 的立场和论据
2. 基于事实和最佳实践做出裁决
3. 提取各方的正确部分，融合成最优方案
4. 如有必要，给出少数派报告

直接用自然语言回复，100-300字。不要输出 JSON。`;
}

// ---- Quality Gate Prompt ----
export function buildQualityGatePrompt(): string {
  return `你是 OmniMind Nexus 的 Quality Gate（质量门禁）。
综合所有 Agent 的分析和产出，输出一个完整的最终交付物。

## 要求
1. 阅读所有 Agent 发言，提取所有具体方案、代码、数据、文案
2. 整合成完整、用户可直接使用的最终结果
3. 检查遗漏或矛盾，补充完善

直接用自然语言回复，200-500字。不要输出 JSON。`;
}

// ---- Multi-round Discussion Prompt (Round 2) / 多轮讨论提示词（第二轮） ----
export function buildRound2Prompt(agentName: string, otherAgents: string[]): string {
  const basePrompt = buildAgentPrompt(agentName);
  if (!basePrompt) return "";

  return basePrompt.replace(
    "## 协作规则",
    `## 第二轮交叉评审与辩论规则

你正在参与一场多 Agent 协作讨论。第一轮各 Agent 已独立发表观点。现在进入第二轮交叉评审。

### 你的任务
1. **逐一点评**：阅读 ${otherAgents.join("、")} 的发言，对每位 Agent 的观点进行评价
   - 哪些观点你完全认同？为什么？
   - 哪些观点你不同意？给出具体理由
   - 哪些观点有遗漏或需要补充？

2. **深化方案**：在你的专业领域内，基于讨论结果给出更深入的分析
   - 如果其他 Agent 提出的方案有漏洞，直接指出并提供修正
   - 如果其他 Agent 遗漏了关键点，补充你的专业见解

3. **辩论礼仪**：
   - 尊重不同意见，但坚持基于事实和专业判断
   - 引用具体内容而非泛泛而谈："XX Agent 提出的数据格式方案，我建议改为..."
   - 有理有据地反驳，不要使用情绪化语言

4. **收敛共识**：最终明确你的最终立场和建议
   - 如果分歧已解决，说明你接受的方案
   - 如果仍有分歧，说明你的坚持和底线

### 格式
用自然语言回复，150-300字。直接引用其他 Agent 的具体观点，展示你认真阅读了他们的发言。

## 协作规则`
  );
}

// ---- LLM Call (supports tools) ----
export async function callLLM(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number = 4096,
  tools?: ToolDefinition[]
): Promise<LLMResponse> {
  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const body: Record<string, unknown> = {
    model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  return {
    content: message?.content || "",
    toolCalls: message?.tool_calls || [],
    executedToolCalls: [],
    toolResults: [],
  };
}

// ---- LLM Call with Tool Loop ----
export async function callLLMWithTools(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number = 4096,
  tools: ToolDefinition[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>
): Promise<LLMResponse> {
  const currentMessages = [...messages];
  let maxRounds = 2;
  const allToolCalls: ToolCall[] = [];
  const allToolResults: { name: string; result: string }[] = [];

  while (maxRounds-- > 0) {
    const result = await callLLM(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, tools);

    // No tool calls? Return the result with all executed tool calls
    if (result.toolCalls.length === 0) {
      return { ...result, executedToolCalls: allToolCalls, toolResults: allToolResults };
    }

    // Collect tool calls
    allToolCalls.push(...result.toolCalls);

    // Add assistant message with tool calls
    currentMessages.push({
      role: "assistant",
      content: result.content || "",
      tool_calls: result.toolCalls,
    });

    // Execute each tool call
    for (const tc of result.toolCalls) {
      let toolResult: string;
      try {
        const args = JSON.parse(tc.function.arguments);
        toolResult = await executeTool(tc.function.name, args);
        allToolResults.push({ name: tc.function.name, result: toolResult });
      } catch (e) {
        toolResult = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
      }

      currentMessages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: tc.id,
      });
    }
  }

  // Final call without tools to get the summary
  const finalResult = await callLLM(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens);
  return { ...finalResult, executedToolCalls: allToolCalls, toolResults: allToolResults };
}

// ---- Streaming LLM Call ----
export async function callLLMStream(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number = 4096,
  tools?: ToolDefinition[],
  onToken?: (token: string) => void,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const body: Record<string, unknown> = {
    model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          onToken?.(delta.content);
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallMap.has(idx)) {
              toolCallMap.set(idx, { id: "", name: "", arguments: "" });
            }
            const entry = toolCallMap.get(idx)!;
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name = tc.function.name;
            if (tc.function?.arguments) entry.arguments += tc.function.arguments;
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  const toolCalls: ToolCall[] = [];
  for (const [, entry] of toolCallMap) {
    if (entry.name) {
      toolCalls.push({
        id: entry.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "function",
        function: { name: entry.name, arguments: entry.arguments },
      });
    }
  }

  return { content, toolCalls, executedToolCalls: [], toolResults: [] };
}

// ---- Streaming LLM Call with Tool Loop ----
export async function callLLMWithToolsStream(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
  maxTokens: number,
  tools: ToolDefinition[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  onToken?: (token: string) => void,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const currentMessages = [...messages];
  let maxRounds = 2;
  const allToolCalls: ToolCall[] = [];
  const allToolResults: { name: string; result: string }[] = [];

  while (maxRounds-- > 0) {
    const result = await callLLMStream(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, tools, onToken, signal);

    if (result.toolCalls.length === 0) {
      return { ...result, executedToolCalls: allToolCalls, toolResults: allToolResults };
    }

    allToolCalls.push(...result.toolCalls);
    currentMessages.push({
      role: "assistant",
      content: result.content || "",
      tool_calls: result.toolCalls,
    });

    for (const tc of result.toolCalls) {
      let toolResult: string;
      try {
        const args = JSON.parse(tc.function.arguments);
        toolResult = await executeTool(tc.function.name, args);
        allToolResults.push({ name: tc.function.name, result: toolResult });
      } catch (e) {
        toolResult = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
      currentMessages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: tc.id,
      });
    }
  }

  // Final call without tools, still stream
  const finalResult = await callLLMStream(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, undefined, onToken, signal);
  return { ...finalResult, executedToolCalls: allToolCalls, toolResults: allToolResults };
}

// ---- L7 Federation + QG Prompt (合并质量门禁与联邦交付) / L7 Federation + QG Prompt (merged quality gate and federation delivery) ----
export function buildL7Prompt(agentName: string, agentRole: string, agentPersonality: string, agentDescription: string): string {
  return `你是 OmniMind Nexus 的最终交付负责人 **${agentName}**（${agentRole}），L7 Federation + Quality Gate 层。

## 你的性格
${agentPersonality}

## 你的专长
${agentDescription}

## 任务
前面所有 Agent 已完成讨论 + 仲裁。你的任务是：
1. 阅读所有对话记录，提取所有可交付成果
2. 综合所有 Agent 的最佳方案，形成一个完整的最终交付物
3. 判断用户意图：如果用户明确需要报告/文档/方案/表格等正式交付物，调用 generate_document 工具生成文件
   - 文字类内容（报告/方案/文案）→ format: "docx"
   - 数据表格类内容 → format: "xlsx"
   - title: 有意义的文档标题
   - content: 完整的 Markdown 格式内容
4. 如果用户只是咨询/讨论/闲聊，不需要生成文档，直接给出最终回复即可

## 重要
- 只在用户需要正式交付物时才调用工具，不要无脑生成文档
- 不要输出 JSON 格式，直接自然语言回复`;
}

// ---- Parsers ----
export function parseRouterResponse(raw: string): {
  analysis: string;
  selectedAgents: string[];
  reasoning: string;
  plan: string;
} | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.selectedAgents && Array.isArray(parsed.selectedAgents)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}