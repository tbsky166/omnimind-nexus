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

// ---- DSML 解析器 / DSML Parser ──
// 某些模型（如 DeepSeek）在 content 中输出 DSML 格式的工具调用，而非标准 tool_calls 字段
// Some models (e.g. DeepSeek) output tool calls in DSML format inside content, not in standard tool_calls field
const DSML_MARKER = "｜｜DSML｜｜";

// 检测内容中是否包含 DSML 工具调用 / Detect DSML tool calls in content
export function hasDSMLToolCalls(content: string): boolean {
  return content.includes(DSML_MARKER) && content.includes("invoke");
}

// 从 DSML 内容中提取工具调用 / Extract tool calls from DSML content
export function parseDSMLToolCalls(content: string): { toolCalls: ToolCall[]; cleanContent: string } {
  const toolCalls: ToolCall[] = [];

  // 移除所有 DSML 块，提取工具调用 / Remove DSML blocks, extract tool calls
  // 匹配 <｜｜DSML｜｜invoke name="xxx"> ... </｜｜DSML｜｜invoke>
  const invokeRegex = /<｜｜DSML｜｜invoke\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/｜｜DSML｜｜invoke>/g;
  let match: RegExpExecArray | null;
  let callIndex = 0;

  while ((match = invokeRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];

    // 提取参数 / Extract parameters
    // 匹配 <｜｜DSML｜｜parameter name="xxx" string="true">value</｜｜DSML｜｜parameter>
    const params: Record<string, unknown> = {};
    const paramRegex = /<｜｜DSML｜｜parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/｜｜DSML｜｜parameter>/g;
    let paramMatch: RegExpExecArray | null;
    while ((paramMatch = paramRegex.exec(body)) !== null) {
      const paramName = paramMatch[1];
      let paramValue = paramMatch[2].trim();
      // 尝试 JSON 解析 / Try JSON parse
      try { paramValue = JSON.parse(paramValue); } catch { /* 保持字符串 / Keep as string */ }
      params[paramName] = paramValue;
    }

    toolCalls.push({
      id: `dsml_call_${Date.now()}_${callIndex++}`,
      type: "function",
      function: {
        name,
        arguments: JSON.stringify(params),
      },
    });
  }

  // 清除所有 DSML 内容，保留纯文本 / Remove all DSML content, keep plain text
  const cleanContent = content
    // 移除整个 DSML 块 / Remove entire DSML blocks
    .replace(/<｜｜DSML｜｜tool_calls>[\s\S]*?<\/｜｜DSML｜｜tool_calls>/g, "")
    .replace(/<｜｜DSML｜｜tool_calls>[\s\S]*$/g, "")
    .replace(/<｜｜DSML｜｜invoke[^>]*>[\s\S]*?<\/｜｜DSML｜｜invoke>/g, "")
    .replace(/<｜｜DSML｜｜invoke[^>]*>[\s\S]*$/g, "")
    .replace(/<｜｜DSML｜｜parameter[^>]*>[\s\S]*?<\/｜｜DSML｜｜parameter>/g, "")
    .replace(/<｜｜DSML｜｜parameter[^>]*>[\s\S]*$/g, "")
    // 清除散落的 DSML 标记 / Clean stray DSML markers
    .replace(/<｜｜DSML｜｜[^>]*>/g, "")
    .replace(/<\/｜｜DSML｜｜[^>]*>/g, "")
    .trim();

  return { toolCalls, cleanContent };
}

// 过滤流式 token 中的 DSML 标记 / Filter DSML markers from streaming tokens
// DSML 标记可能跨 token 拆分，需要用 pending buffer 缓冲可能的开头
// DSML markers can split across tokens; use pending buffer for partial markers
// 只过滤 DSML 块内的内容，块外的正常文本仍然输出 / Only filter DSML block content, normal text outside is still output
export function createDSMLStreamFilter() {
  const DSML_OPEN = "<｜｜DSML｜｜";
  const DSML_CLOSE = "</｜｜DSML｜｜";

  let dsmlMode = false;
  let buffer = "";

  // 扫描 buffer，统计完整的开/闭标签，返回 DSML 块结束位置 / Scan buffer, count complete open/close tags, return DSML block end position
  function findDSMLEnd(buf: string): number {
    let openCount = 0;
    let closeCount = 0;
    let lastCloseEnd = -1;
    let pos = 0;

    while (pos < buf.length) {
      const openIdx = buf.indexOf(DSML_OPEN, pos);
      const closeIdx = buf.indexOf(DSML_CLOSE, pos);

      if (openIdx === -1 && closeIdx === -1) break;

      if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
        // 找到开标签，查找 > 确认标签完整 / Found opening tag, look for > to confirm complete
        const gtIdx = buf.indexOf(">", openIdx);
        if (gtIdx !== -1) {
          openCount++;
          pos = gtIdx + 1;
        } else {
          break; // 开标签不完整，等待更多 token / Incomplete opening tag, wait
        }
      } else {
        // 找到闭标签，查找 > 确认标签完整 / Found closing tag, look for > to confirm complete
        const gtIdx = buf.indexOf(">", closeIdx);
        if (gtIdx !== -1) {
          closeCount++;
          lastCloseEnd = gtIdx;
          pos = gtIdx + 1;
        } else {
          break; // 闭标签不完整，等待更多 token / Incomplete closing tag, wait
        }
      }
    }

    // 闭标签数 >= 开标签数 → DSML 块完整 / closeCount >= openCount → DSML block complete
    if (closeCount >= openCount && openCount > 0 && lastCloseEnd !== -1) {
      return lastCloseEnd + 1; // 返回最后一个 > 之后的位置 / Return position after last >
    }
    return -1;
  }

  return {
    process(token: string): string {
      buffer += token;
      let output = "";
      let progress = true;

      while (progress) {
        progress = false;

        if (!dsmlMode) {
          // 正常模式：查找 DSML 开头 / Normal mode: look for DSML start
          const idx = buffer.indexOf(DSML_OPEN);
          if (idx !== -1) {
            // 输出 DSML 之前的文本 / Output text before DSML
            output += buffer.slice(0, idx);
            buffer = buffer.slice(idx);
            dsmlMode = true;
            progress = true;
          } else {
            // 检查尾部是否是 DSML 开头的前缀 / Check if tail is prefix of DSML_OPEN
            let maxPrefix = 0;
            for (let i = Math.min(buffer.length, DSML_OPEN.length); i > 0; i--) {
              if (DSML_OPEN.startsWith(buffer.slice(-i))) {
                maxPrefix = i;
                break;
              }
            }
            // 输出安全部分，保留可能的前缀 / Output safe part, keep potential prefix
            output += buffer.slice(0, buffer.length - maxPrefix);
            buffer = buffer.slice(buffer.length - maxPrefix);
          }
        }

        if (dsmlMode) {
          // DSML 模式：检查块是否完整 / DSML mode: check if block is complete
          const endPos = findDSMLEnd(buffer);
          if (endPos !== -1) {
            // DSML 块结束，保留块后的文本 / DSML block ended, keep text after block
            buffer = buffer.slice(endPos);
            dsmlMode = false;
            progress = true; // 继续处理剩余 buffer / Continue processing remaining buffer
          }
          // 块不完整，等待更多 token / Block incomplete, wait for more tokens
        }
      }

      return output;
    },

    // 流结束时，输出残留的非 DSML 内容 / At stream end, flush remaining non-DSML content
    flush(): string {
      if (dsmlMode) return ""; // DSML 模式下丢弃未完成的内容 / Discard incomplete DSML
      const result = buffer;
      buffer = "";
      return result;
    },
  };
}

// 自动检测 content 中的代码块，将其转为 file_write 工具调用
// Auto-detect code blocks in content, convert to file_write tool calls
// 当模型不听话直接输出代码而非调用工具时，自动兜底 / Fallback when model outputs code directly instead of calling tools
const LANG_EXT_MAP: Record<string, string> = {
  python: "py", py: "py", javascript: "js", js: "js", typescript: "ts", ts: "ts",
  jsx: "jsx", tsx: "tsx", bash: "sh", sh: "sh", shell: "sh", json: "json",
  html: "html", css: "css", scss: "scss", java: "java", go: "go", rust: "rs",
  cpp: "cpp", c: "c", csharp: "cs", cs: "cs", kotlin: "kt", swift: "swift",
  sql: "sql", yaml: "yaml", yml: "yml", markdown: "md", md: "md", xml: "xml",
  php: "php", ruby: "rb", rb: "rb", dart: "dart", vue: "vue", svelte: "svelte",
};

function extractCodeBlocksAsToolCalls(content: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  // 匹配 ```lang\n...``` 格式的代码块 / Match ```lang\n...``` code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = (match[1] || "").toLowerCase();
    const code = match[2];

    // 只处理大段代码（超过 150 字符），避免误判短代码片段 / Only handle large code blocks (>150 chars)
    if (!code || code.trim().length < 150) continue;

    const ext = LANG_EXT_MAP[lang] || lang || "txt";
    const fileName = `agent_output_${Date.now()}_${idx}.${ext}`;

    toolCalls.push({
      id: `auto_call_${Date.now()}_${idx}`,
      type: "function" as const,
      function: {
        name: "file_write",
        arguments: JSON.stringify({
          path: fileName,
          content: code,
          action: "create",
        }),
      },
    });
    idx++;
  }

  return toolCalls;
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
  {
    type: "function",
    function: {
      name: "codebase_read",
      description: "读取项目代码库中的任意源文件。可以查看系统的完整代码实现——包括 agent 定义、组件、API 路由、工具库、DSL 解析器等。用于理解系统架构、依赖关系、代码风格、或排查问题。禁止访问 .env、node_modules、.git 等敏感文件/目录。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "项目内的相对文件路径，如 src/lib/swarm.ts、src/app/page.tsx、src/data/agents.ts、package.json 等",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "codebase_list",
      description: "列出项目目录结构，查看有哪些文件和子目录。用于初次探索代码库，了解项目组织方式。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "项目内的相对目录路径，如 src/lib/、src/app/、src/components/ 等，留空表示根目录",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "codebase_edit",
      description: "修改项目代码库中的源文件。通过精确字符串替换实现编辑。必须先使用 codebase_read 读取文件内容，获取要替换的精确文本，然后调用此工具。old_string 必须在文件中唯一匹配，否则会失败。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "项目内的相对文件路径，如 src/lib/swarm.ts、src/app/page.tsx 等",
          },
          old_string: {
            type: "string",
            description: "要替换的精确文本内容（必须与文件中的原始文本完全一致，包括缩进、空格、换行）。必须唯一匹配。",
          },
          new_string: {
            type: "string",
            description: "替换后的新文本内容",
          },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "联网搜索最新信息。当需要查询实时数据、最新新闻、技术文档、事实核查或任何超出 AI 知识范围的信息时使用。通过 Tavily 搜索引擎获取结果。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词，用中文或英文，尽量精确。例如 'React 19 新特性 2025'、'Python 3.13 release notes'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "使用 Playwright 浏览器导航到指定 URL，获取页面内容和进行交互。先导航到页面，再使用 browser_extract_text 提取文本，或 browser_screenshot 截图。",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "要导航的完整 URL，如 https://example.com" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_extract_text",
      description: "提取当前浏览器页面的文本内容（最多 10000 字符）。先使用 browser_navigate 导航到页面。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "对当前浏览器页面截图，返回 base64 编码的 PNG 图片。先使用 browser_navigate 导航到页面。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "在浏览器页面中点击指定 CSS 选择器的元素。",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS 选择器，如 button.submit、#login、a.nav-link" },
        },
        required: ["selector"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description: "在浏览器页面的输入框中输入文本。",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "输入框的 CSS 选择器" },
          text: { type: "string", description: "要输入的文本" },
        },
        required: ["selector", "text"],
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
6. 调用 codebase_read 工具可以读取项目的完整源代码——包括 agent 定义、系统组件、API 路由、工具库、DSL 解析器、蜂群/进化/知识图谱/元认知引擎等所有模块
7. 调用 codebase_list 工具可以浏览项目目录结构，了解项目整体组织方式
8. 调用 codebase_edit 工具可以修改项目源代码文件——必须先 codebase_read 读取文件，再提供精确的 old_string 进行替换

## 可用工具
- **codebase_read**：读取项目代码库中的任意源文件（.ts、.tsx、.json 等），禁止访问 .env、node_modules、.git
- **codebase_list**：列出项目目录结构，查看文件组织
- **codebase_edit**：通过精确字符串替换修改项目源文件（必须先 codebase_read 读取）
- **file_read**：读取 Agent 工作区文件（/workspace/）
- **file_write**：在 Agent 工作区创建/编辑文件
- **generate_document**：生成可下载的正式文档（docx/xlsx）

## 工具使用要求（重要）
- **需要产出代码、配置、脚本时，必须调用 file_write 工具创建文件，禁止直接在回复中粘贴代码块**
- **需要修改项目源码时，必须先 codebase_read 读取文件，再调用 codebase_edit 工具进行精确替换**
- **需要产出报告、方案、文档时，必须调用 generate_document 工具生成正式文档**
- **需要查看代码库时，必须调用 codebase_read 工具读取实际源码，不要凭记忆编造代码内容**
- **需要查询最新信息、实时数据、新闻、技术文档时，必须调用 web_search 工具联网搜索**
- **调用工具后，必须用一句完整的话确认结果**（如"文档已生成，请查收"、"文件已创建"、"搜索完成，以下是相关结果"），不要只调用工具不回复文字
- 回复正文只写分析、说明、步骤，所有代码/文档内容通过工具产出

## 输出格式
直接用自然语言回复，100-400字。不要输出 JSON，不要在回复中粘贴代码块——代码必须通过 file_write 工具产出。`;
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

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(
      `无法连接到 API 服务器 (${baseUrl})：${e instanceof Error ? e.message : "网络错误"}。请检查 Base URL 是否正确、网络是否连通。`
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  // ── DSML 后处理：解析模型在 content 中输出的工具调用 ──
  const rawContent = message?.content || "";
  const standardToolCalls = message?.tool_calls || [];
  let finalContent = rawContent;
  let dsmlToolCalls: ToolCall[] = [];
  if (hasDSMLToolCalls(rawContent)) {
    const { toolCalls, cleanContent } = parseDSMLToolCalls(rawContent);
    finalContent = cleanContent;
    dsmlToolCalls = toolCalls;
  }

  return {
    content: finalContent,
    toolCalls: [...standardToolCalls, ...dsmlToolCalls],
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

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    throw new Error(
      `无法连接到 API 服务器 (${baseUrl})：${e instanceof Error ? e.message : "网络错误"}。请检查 Base URL 是否正确、网络是否连通。`
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();
  const dsmlFilter = createDSMLStreamFilter();

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
          // 过滤 DSML 标记，只输出干净的部分 / Filter DSML, only output clean part
          const cleanToken = dsmlFilter.process(delta.content);
          if (cleanToken) {
            onToken?.(cleanToken);
          }
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

  // 流结束，输出残留的安全内容 / Stream ended, flush remaining safe content
  const flushed = dsmlFilter.flush();
  if (flushed) {
    onToken?.(flushed);
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

  // ── DSML 后处理：解析模型在 content 中输出的工具调用 ──
  // DSML post-processing: parse tool calls from content (some models use DSML format)
  let finalContent = content;
  let extraToolCalls: ToolCall[] = [];
  if (hasDSMLToolCalls(content)) {
    const { toolCalls: dsmlCalls, cleanContent } = parseDSMLToolCalls(content);
    finalContent = cleanContent;
    extraToolCalls = dsmlCalls;
  }

  // 合并标准 tool_calls 和 DSML 解析出的 tool_calls
  // Merge standard tool_calls and DSML-parsed tool_calls
  const allToolCalls = [...toolCalls, ...extraToolCalls];

  return { content: finalContent, toolCalls: allToolCalls, executedToolCalls: [], toolResults: [] };
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
  let lastContent = ""; // 保存最后一次成功的内容 / Save last successful content

  // 每轮调用创建独立的超时信号，避免第一轮用完后第二轮立即超时
  // Create independent timeout signal per round, prevent round 2 from timing out immediately
  function createRoundSignal(): AbortSignal {
    // 如果外部 signal 已经 aborted，直接用 / If outer signal already aborted, use it
    if (signal?.aborted) return signal;
    const roundController = new AbortController();
    const timer = setTimeout(() => roundController.abort(), 120000); // 每轮 120 秒 / 120s per round
    // 如果外部 signal abort，也 abort 内部 / If outer signal aborts, abort inner too
    if (signal) {
      signal.addEventListener("abort", () => roundController.abort(), { once: true });
    }
    // 清理 timer 的方法：在 promise settle 后 clearTimeout / Clean up timer: clear after promise settles
    const origSignal = roundController.signal;
    (origSignal as unknown as { _cleanup: () => void })._cleanup = () => clearTimeout(timer);
    return origSignal;
  }

  function cleanupSignal(sig: AbortSignal) {
    const cleaner = (sig as unknown as { _cleanup?: () => void })._cleanup;
    if (cleaner) cleaner();
  }

  while (maxRounds-- > 0) {
    const roundSignal = createRoundSignal();
    let result: LLMResponse;
    try {
      result = await callLLMStream(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, tools, onToken, roundSignal);
    } catch (e) {
      cleanupSignal(roundSignal);
      // 后续轮次调用失败时，不 throw，返回已有结果 / Don't throw on subsequent round failure, return what we have
      if (allToolCalls.length > 0) {
        return { content: lastContent, toolCalls: allToolCalls, executedToolCalls: allToolCalls, toolResults: allToolResults };
      }
      throw e;
    }
    cleanupSignal(roundSignal);

    lastContent = result.content;

    // 自动检测：模型没有调用工具但直接输出了大段代码块 / Auto-detect: model output code blocks instead of calling tools
    if (result.toolCalls.length === 0) {
      const autoCalls = extractCodeBlocksAsToolCalls(result.content);
      if (autoCalls.length > 0) {
        result = { ...result, toolCalls: autoCalls };
      } else {
        // 已执行过工具调用但模型未产出文本 → 补充兜底回复，避免流式输出中断 / Tool calls executed but model produced no text → add fallback to prevent stream cutoff
        if (allToolCalls.length > 0 && !result.content.trim()) {
          const fallback = "已完成工具调用，请查看产出文件。";
          onToken?.(fallback);
          return { ...result, content: fallback, executedToolCalls: allToolCalls, toolResults: allToolResults };
        }
        return { ...result, executedToolCalls: allToolCalls, toolResults: allToolResults };
      }
    }

    allToolCalls.push(...result.toolCalls);

    // 检测是否为 DSML 工具调用（合成 ID）/ Detect DSML tool calls (synthetic IDs)
    // DSML 模型（如 DeepSeek）不认 tool_calls/tool 消息格式，需要用 user 消息传递结果
    // DSML models (e.g. DeepSeek) don't understand tool_calls/tool message format, use user messages instead
    const isDSML = result.toolCalls.every(tc => tc.id.startsWith("dsml_call_") || tc.id.startsWith("auto_call_"));

    if (isDSML) {
      // DSML 模式：用普通 user 消息传递工具结果 / DSML mode: use regular user messages for tool results
      currentMessages.push({
        role: "assistant",
        content: result.content || "（正在调用工具...）",
      });

      // 执行所有工具，收集结果 / Execute all tools, collect results
      const toolResultsText: string[] = [];
      for (const tc of result.toolCalls) {
        let toolResult: string;
        try {
          const args = JSON.parse(tc.function.arguments);
          toolResult = await executeTool(tc.function.name, args);
          allToolResults.push({ name: tc.function.name, result: toolResult });
        } catch (e) {
          toolResult = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
        }
        // 截断过长的结果 / Truncate overly long results
        const truncated = toolResult.length > 4000 ? toolResult.slice(0, 4000) + "\n...(内容过长已截断)" : toolResult;
        toolResultsText.push(`【工具: ${tc.function.name}】参数: ${tc.function.arguments}\n结果:\n${truncated}`);
      }

      currentMessages.push({
        role: "user",
        content: `工具执行结果：\n\n${toolResultsText.join("\n\n")}\n\n请基于以上工具返回的结果继续回复。`,
      });
    } else {
      // 标准模式：使用 tool_calls/tool 消息格式 / Standard mode: use tool_calls/tool message format
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
        // 截断过长的工具结果，防止 token 超限 / Truncate to prevent token overflow
        if (toolResult.length > 4000) {
          toolResult = toolResult.slice(0, 4000) + "\n...(内容过长已截断)";
        }
        currentMessages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id,
        });
      }
    }
  }

  // Final call without tools, still stream
  const finalSignal = createRoundSignal();
  try {
    const finalResult = await callLLMStream(systemPrompt, currentMessages, apiKey, baseUrl, model, maxTokens, undefined, onToken, finalSignal);
    cleanupSignal(finalSignal);
    // 最终调用后仍无文本产出 → 补充兜底回复 / Still no text after final call → add fallback
    if (!finalResult.content.trim() && allToolCalls.length > 0) {
      const fallback = "已完成工具调用，请查看产出文件。";
      onToken?.(fallback);
      return { ...finalResult, content: fallback, executedToolCalls: allToolCalls, toolResults: allToolResults };
    }
    return { ...finalResult, executedToolCalls: allToolCalls, toolResults: allToolResults };
  } catch (e) {
    cleanupSignal(finalSignal);
    // 最终调用失败时，返回已收集的结果 / Final call failed, return collected results
    if (allToolCalls.length > 0) {
      return { content: lastContent, toolCalls: allToolCalls, executedToolCalls: allToolCalls, toolResults: allToolResults };
    }
    throw e;
  }
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