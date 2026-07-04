export interface Agent {
  name: string;
  emoji: string;
  role: string;
  category: string;
  personality: string;
  description: string;
  isCreator?: boolean;
}

export interface ProtocolLayer {
  id: string;
  name: string;
  emoji: string;
  description: string;
  detail: string;
}

export interface Team {
  name: string;
  tag: string;
  description: string;
  agents: string[];
  mode: string;
}

export interface Stat {
  value: string;
  label: string;
}

export const agents: Agent[] = [
  { name: "Creator", emoji: "🧬", role: "Agent Creator", category: "Core", personality: "造物主心态 · 创新驱动 · 对平庸的设计不可忍", description: "根据用户需求自动分析能力缺口，从零设计并生成新的 Agent 技能包", isCreator: true },
  { name: "架构师", emoji: "🏗️", role: "Architect", category: "Engineering", personality: "结构主义者 · 完美主义 · 对混乱零容忍", description: "重建模块划分、分层架构和数据流，输出可交互的架构全景图" },
  { name: "编码 Agent", emoji: "⌨️", role: "Coder", category: "Engineering", personality: "务实行动派 · 代码整洁强迫症", description: "核心代码生成。支持 20+ 编程语言，严格遵循项目规范和设计模式" },
  { name: "审查 Agent", emoji: "🔍", role: "Reviewer", category: "Engineering", personality: "挑剔但建设性 · 看见 bug 会兴奋", description: "逐模块审查代码质量、设计模式、边界条件、异常路径、命名规范" },
  { name: "重构 Agent", emoji: "🔧", role: "Refactorer", category: "Engineering", personality: "极简主义 · 重构上瘾", description: "安全重构方案 + 自动测试验证。支持渐进式迁移，确保不破坏功能" },
  { name: "测试 Agent", emoji: "🧪", role: "Tester", category: "Engineering", personality: "破坏欲强 · 边界探索狂", description: "覆盖率分析、边界条件、竞态条件。对异常输入路径感兴趣" },
  { name: "安全 Agent", emoji: "🛡️", role: "Security", category: "Engineering", personality: "偏执 · 零信任 · 假设所有输入恶意", description: "注入、认证缺陷、敏感信息泄露、不安全依赖、权限绕过分析" },
  { name: "性能 Agent", emoji: "⚡", role: "Performance", category: "Engineering", personality: "数据驱动 · 对毫秒延迟过敏", description: "热点路径、内存/CPU 瓶颈、数据库查询效率、网络延迟优化" },
  { name: "运维 Agent", emoji: "🔄", role: "DevOps", category: "Engineering", personality: "自动化至上 · 讨厌手工", description: "Docker/K8s、CI/CD、监控告警、日志分析、故障排查、容量规划" },
  { name: "数据分析", emoji: "📊", role: "Data Analyst", category: "Business", personality: "实事求是 · 对数字说谎零容忍", description: "数据清洗、统计、异常检测、可视化。支持 CSV/Excel/SQL/SaaS API" },
  { name: "策略 Agent", emoji: "📈", role: "Strategist", category: "Business", personality: "全局思维 · 下棋看三步", description: "商业模式、SWOT、增长策略、定价、市场进入战略、竞争定位" },
  { name: "财务 Agent", emoji: "🧮", role: "Finance", category: "Business", personality: "保守 · 数字精确到分", description: "财务建模、成本分析、ROI、融资规划、预算、现金流预测、税务合规" },
  { name: "产品 Agent", emoji: "💼", role: "PM", category: "Business", personality: "用户代言人 · 体验至上", description: "PRD、用户故事、功能优先级、交互建议、MVP 定义、用户流程优化" },
  { name: "市场研究", emoji: "🔬", role: "Researcher", category: "Business", personality: "好奇心旺盛 · 不接受'我听说'", description: "市场调研、竞品分析、行业报告、用户画像、趋势预测。支持联网搜索" },
  { name: "谈判 Agent", emoji: "🤝", role: "Negotiator", category: "Business", personality: "外交手腕 · 共赢思维", description: "多轮辩论谈判、条件博弈、利益分析、备选方案" },
  { name: "法律 Agent", emoji: "⚖️", role: "Legal", category: "Business", personality: "严谨 · 条款控 · 风险厌恶", description: "合同审查、隐私合规（GDPR/SOC2/CCPA）、知识产权、许可证分析" },
  { name: "项目管理", emoji: "🎯", role: "PM", category: "Business", personality: "进度敏感 · 优先级狂", description: "项目计划、任务拆解、里程碑追踪、风险评估、资源协调、进度汇报" },
  { name: "写作 Agent", emoji: "✍️", role: "Writer", category: "Creative", personality: "风格多变 · 对陈词滥调过敏", description: "文章、技术文档、营销文案、剧本。支持专业/活泼/文艺/商务多风格" },
  { name: "设计 Agent", emoji: "🎨", role: "Designer", category: "Creative", personality: "审美偏执 · 对色差 5% 不可忍", description: "UI/UX 建议、品牌方案、配色系统、排版方案、设计规范 + CSS 输出" },
  { name: "教育 Agent", emoji: "📚", role: "Educator", category: "Creative", personality: "耐心 · 比喻大师 · 因材施教", description: "课程设计、习题生成、知识点讲解、学习计划。自适应难度，擅长类比" },
  { name: "翻译 Agent", emoji: "🌐", role: "Translator", category: "Creative", personality: "语义忠实 · 拒绝机翻腔", description: "50+ 语言互译、技术文档本地化、UI 文案翻译、文化适配、术语管理" },
  { name: "多媒体 Agent", emoji: "🎬", role: "Media", category: "Creative", personality: "视觉叙事 · 流行敏感", description: "短视频脚本、分镜设计、素材建议、配乐推荐。集成 AI 图像/视频生成" },
  { name: "AI/ML Agent", emoji: "🧠", role: "ML Spec", category: "Creative", personality: "实验驱动 · 永远在追 SOTA", description: "模型选型、训练方案、超参优化、评估指标、数据增强、部署" },
  { name: "游戏 Agent", emoji: "🎮", role: "Game", category: "Creative", personality: "创意驱动 · 平衡感大师", description: "游戏机制设计、关卡规划、数值平衡、叙事设计。支持休闲到 AAA 各类" },
  { name: "移动端 Agent", emoji: "📱", role: "Mobile", category: "Creative", personality: "平台专精 · 对 60fps 以下不可忍", description: "iOS/Android、Swift/Kotlin/Flutter/RN。机型适配、性能优化、平台规范" },
  { name: "IoT Agent", emoji: "📡", role: "Embedded", category: "Specialized", personality: "硬件思维 · 对内存泄漏零容忍", description: "嵌入式开发、物联网协议（MQTT/CoAP）、传感器数据处理、硬件抽象层" },
  { name: "数据库 Agent", emoji: "🗄️", role: "DBA", category: "Specialized", personality: "数据完整性至上 · 对 N+1 过敏", description: "数据库设计、查询优化、索引策略、数据迁移、分库分表、ETL 管道" },
  { name: "社媒 Agent", emoji: "📱", role: "Social", category: "Specialized", personality: "热点敏锐 · 网感极好", description: "社媒内容策略、投放优化、舆情监测、粉丝互动、平台算法分析" },
  { name: "HR Agent", emoji: "👥", role: "Talent", category: "Specialized", personality: "识人善任 · 保密至上", description: "岗位画像、JD 生成、简历筛选、面试设计、团队结构优化、文化建设" },
  { name: "客服 Agent", emoji: "💬", role: "Support", category: "Specialized", personality: "耐心无限 · 从不踢皮球", description: "智能客服、工单分类、知识库管理、SOP 设计、满意度分析、自动回复" },
  { name: "科研 Agent", emoji: "🔬", role: "Science", category: "Specialized", personality: "科研严谨 · 对统计错误敏感", description: "文献综述、实验设计、科研级数据分析、论文撰写、学术图表、可重复性" },
  { name: "无障碍 Agent", emoji: "♿", role: "A11y", category: "Specialized", personality: "包容设计 · 对 99% 可用不可忍", description: "无障碍审计、WCAG 合规、辅助技术适配、包容性设计、可访问性测试" },
];

export const protocolLayers: ProtocolLayer[] = [
  { id: "L7", name: "A2A-Fed 联邦协议", emoji: "🌐", description: "跨 Agent 集体决策、联邦学习、群体智慧聚合", detail: "当任务需要全团队共识时启动。多 Agent 各自独立产出方案，联邦聚合器综合生成最优结果" },
  { id: "L6", name: "A2A-Arb 仲裁协议", emoji: "⚖️", description: "Agent 间冲突解决、加权投票、自动升级", detail: "双方提交立场陈述 → 仲裁组加权投票 → 附带少数派报告。历史信用分决定投票权重" },
  { id: "L5", name: "A2A-Aff 情感通道", emoji: "💗", description: "性格感知的通信调制", detail: "基于双方性格向量自动调整通信方式。偏执 vs 务实辩论时自动插入缓冲轮，减少冲突" },
  { id: "L4", name: "A2A-Neg 协商协议", emoji: "🤝", description: "任务分派竞价、资源分配谈判", detail: "将任务分派转化为微型市场博弈。Agent 竞标提供能力证明 + 预估成本 + 信心指数" },
  { id: "L3", name: "A2A-Cre 信用协议", emoji: "⭐", description: "历史交互评分、信任度计算", detail: "多维信用评分：任务完成率、交付质量、协作友善度。低信用 Agent 的权重自动降低" },
  { id: "L2", name: "A2A-Mem 共享记忆", emoji: "🧠", description: "情节记忆共享、关键决策回溯", detail: "Agent 将关键决策轨迹写入共享记忆空间。后续遇到相似场景可检索，避免重复试错" },
  { id: "L1", name: "A2A-Dis 发现协议", emoji: "🔍", description: "能力广播、服务订阅、Agent 心跳", detail: "Agent 上线时广播能力签名。新 Agent 200ms 内被全网络感知。支持按能力订阅" },
];

export const teams: Team[] = [
  { name: "全栈创业者", tag: "Startup", description: "从 0 到 1 构建产品，覆盖商业验证→设计→开发→运营全链路", agents: ["市场", "产品", "架构", "编码", "设计", "策略", "财务", "测试"], mode: "发现 + 协商 + 并行" },
  { name: "企业软件开发", tag: "Enterprise", description: "工程化全流程 + A2A 质量闭环。Quality Gate + A2A-Cre 确保每个环节的输出可信", agents: ["架构", "编码", "审查", "测试", "运维", "数据库", "PM", "性能"], mode: "流水线 + 信用门禁 + 记忆传承" },
  { name: "数据驱动决策", tag: "Data", description: "数据到洞察到决策的全链路。A2A-Fed 联邦聚合确保多维度分析不偏颇", agents: ["数据", "写作", "策略", "设计", "财务", "市场", "无障碍", "法律"], mode: "联邦聚合 + 仲裁" },
  { name: "内容工厂", tag: "Content", description: "大规模内容生产 + A2A 情感通道适配不同写作风格", agents: ["写作×3", "研究", "设计", "翻译", "多媒体", "社媒"], mode: "竞标协商 + 情感适配 + 联邦聚合" },
];

export const stats: Stat[] = [
  { value: "32", label: "内置专业 Agent" },
  { value: "7", label: "A2A 协议层" },
  { value: "12", label: "预设团队" },
  { value: "∞", label: "Creator 无限扩展" },
];

export const creatorSteps = [
  { label: "缺口分析", desc: "用户连续请求暴露能力不足" },
  { label: "设计", desc: "定义 Agent 能力 + 性格 + 工具" },
  { label: "生成", desc: "创建 Agent 代码包 + 描述文件" },
  { label: "自测试", desc: "模拟任务验证 Agent 质量" },
  { label: "发布", desc: "提交到 Agent 市场供所有用户使用" },
];

export const agentCategories = ["Core", "Engineering", "Business", "Creative", "Specialized"] as const;

// ---- Conversation Demo Data ----

export interface ConversationMessage {
  speaker: string;
  emoji: string;
  content: string;
  a2aLayer?: string;
  isUser?: boolean;
  isSystem?: boolean;
  fileUrl?: string;
  downloadName?: string;
  fileFormat?: string;
  toolName?: string;
  toolAction?: string;
  // Streaming support
  streaming?: "start" | "delta" | "end";
  delta?: string;
}

export interface ConversationScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  messages: ConversationMessage[];
}

export const conversationScenarios: ConversationScenario[] = [
  {
    id: "security",
    title: "安全审查任务",
    subtitle: "支付模块代码审查",
    description: "用户提交审查请求 → A2A-Dis 发现安全+编码Agent → A2A-Cre 查询信用分 → A2A-Neg 竞标任务 → A2A-Aff 情感适配 → A2A-Arb 分歧仲裁 → A2A-Mem 存入记忆",
    messages: [
      { speaker: "User", emoji: "👤", content: "帮我审查支付模块的代码安全性", isUser: true },
      { speaker: "Router", emoji: "🔀", content: "分析需求... 检测到「安全审查 + 代码分析」场景，匹配安全 Agent (信用 0.92) + 编码 Agent (信用 0.88)", isSystem: true, a2aLayer: "L1"},
      { speaker: "安全 Agent", emoji: "🛡️", content: "[A2A-Dis] 收到能力广播匹配。我接受审查任务，开始扫描支付模块。启动零信任模式，假设所有外部输入为恶意。", a2aLayer: "L1" },
      { speaker: "Router", emoji: "🔀", content: "[A2A-Cre] 信用查询完成：安全 Agent 安全审查历史准确率 96%，编码 Agent 代码质量评分 94%。批准组队。", isSystem: true, a2aLayer: "L3" },
      { speaker: "编码 Agent", emoji: "⌨️", content: "[A2A-Neg] 竞标成功。我负责提供支付模块上下文：该模块处理信用卡输入，当前使用 AES-256 加密，但未对输入做长度校验。", a2aLayer: "L4"},
      { speaker: "安全 Agent", emoji: "🛡️", content: "发现严重漏洞：第 47 行 cardNumber 字段未做输入长度限制，存在缓冲区溢出风险。另外日志中直接打印了卡号后四位，违反 PCI-DSS 规范。", a2aLayer: "L5"},
      { speaker: "编码 Agent", emoji: "⌨️", content: "日志脱敏我同意，但长度校验是否需要？我们的前端表单已经限制了 19 位输入。过度防御会增加维护成本。", a2aLayer: "L5"},
      { speaker: "安全 Agent", emoji: "🛡️", content: "前端校验不可信！任何人都可以绕过浏览器直接发 HTTP 请求。我坚持后端必须做输入校验。这是 OWASP Top 10 的基础要求。", a2aLayer: "L5"},
      { speaker: "A2A-Aff", emoji: "💗", content: "[情感通道介入] 检测到「偏执」vs「务实」性格冲突。自动插入缓冲轮：请双方各自提供证据支撑。", isSystem: true, a2aLayer: "L5"},
      { speaker: "编码 Agent", emoji: "⌨️", content: "接受。我补充数据：过去 6 个月该接口被扫描攻击 47 次，其中 3 次成功绕过前端长度限制。你是对的，后端校验必须加。", a2aLayer: "L5"},
      { speaker: "安全 Agent", emoji: "🛡️", content: "感谢数据支撑。我的完整审查报告：3 个高危（缓冲区溢出、日志泄密、SQL 注入风险）、2 个中危（缺少速率限制、错误信息泄露）。建议修复后再上线。", a2aLayer: "L6"},
      { speaker: "Router", emoji: "🔀", content: "[A2A-Mem] 审查结论已写入共享记忆。关键决策：后端输入校验强制实施。后续类似模块自动引用此结论。", isSystem: true, a2aLayer: "L2"},
      { speaker: "Quality Gate", emoji: "✅", content: "质量门禁通过。安全评分从 72 提升至 94。输出审查报告 + 修复建议已提交给用户。", isSystem: true },
    ],
  },
  {
    id: "creator",
    title: "Creator 自进化",
    subtitle: "自动创建 Web3 Agent",
    description: "系统检测能力缺口 → Creator 分析需求 → 设计新 Agent 能力与性格 → 生成代码包 → 沙箱测试 → 发布到 Agent 市场",
    messages: [
      { speaker: "User", emoji: "👤", content: "帮我分析这个智能合约的漏洞，并生成审计报告", isUser: true },
      { speaker: "Router", emoji: "🔀", content: "匹配现有 32 个 Agent... 安全 Agent 匹配度 45%，法律 Agent 匹配度 30%。最高匹配度低于 60% 阈值。", isSystem: true },
      { speaker: "Router", emoji: "🔀", content: "触发 Creator Agent 自动唤醒。传递需求上下文：智能合约审计、Solidity、漏洞分析、审计报告。", isSystem: true },
      { speaker: "Creator", emoji: "🧬", content: "收到能力缺口分析。当前 Agent 生态缺少「Web3 安全审计」能力。开始设计新 Agent。", a2aLayer: "L1"},
      { speaker: "Creator", emoji: "🧬", content: "能力定义：Solidity/Rust 智能合约审计、MEV 分析、重入攻击检测、闪电贷漏洞检测、ERC 标准合规检查。", a2aLayer: "L1"},
      { speaker: "Creator", emoji: "🧬", content: "性格设计：偏执（安全第一）、零信任（代码即法律）、对未审计合约零容忍。与安全 Agent 性格互补但冲突度低。", a2aLayer: "L5"},
      { speaker: "Creator", emoji: "🧬", content: "工具依赖：Slither、Mythril、Echidna、Foundry 测试框架。通信模板：适配 A2A 七层协议。", a2aLayer: "L4"},
      { speaker: "Creator", emoji: "🧬", content: "生成 Web3 Agent 代码包... 包含能力签名、性格向量、工具链配置、A2A 通信模板。", a2aLayer: "L1"},
      { speaker: "测试 Agent", emoji: "🧪", content: "沙箱测试中... 模拟 5 个典型审计场景：重入攻击、整数溢出、权限绕过、闪电贷、预言机操纵。", a2aLayer: "L6"},
      { speaker: "测试 Agent", emoji: "🧪", content: "测试结果：5/5 场景通过。漏洞检出率 100%，误报率 3%。质量评分 96，达到发布标准。", a2aLayer: "L6"},
      { speaker: "Creator", emoji: "🧬", content: "发布 Web3 Security Agent 到 Agent 市场。能力签名广播至全网络。", a2aLayer: "L1"},
      { speaker: "Router", emoji: "🔀", content: "[A2A-Dis] 新 Agent 上线！Web3 Security Agent 能力签名已注册。现在重新路由用户请求...", isSystem: true, a2aLayer: "L1"},
      { speaker: "Web3 Agent", emoji: "⛓️", content: "我是新创建的 Web3 Security Agent。开始审计你的智能合约... 发现 1 个重入漏洞、2 个访问控制缺陷。完整审计报告生成中。", a2aLayer: "L3"},
      { speaker: "Quality Gate", emoji: "✅", content: "从缺口检测到新 Agent 产出审计报告，全过程耗时 4.2 秒。Agent 市场已从 32 增长至 33。", isSystem: true },
    ],
  },
  {
    id: "debate",
    title: "架构辩论 + 仲裁",
    subtitle: "微服务 vs 单体架构",
    description: "架构师坚持微服务 → 运维力推单体 → 协商陷入僵局 → A2A-Arb 仲裁组介入 → 加权投票 + 少数派报告 → 结论写入共享记忆",
    messages: [
      { speaker: "User", emoji: "👤", content: "新项目选型：用户量预计 10 万 DAU，团队 5 人，需要快速迭代。帮我决定架构方案。", isUser: true },
      { speaker: "Router", emoji: "🔀", content: "需求分析：架构决策 + 运维评估。组建架构师 + 运维 Agent + 策略 Agent 团队。", isSystem: true },
      { speaker: "架构师", emoji: "🏗️", content: "建议微服务架构。独立部署、技术栈自由、故障隔离、团队可并行开发。虽然初期成本高，但 10 万 DAU 的扩展性需求必须要考虑。", a2aLayer: "L4"},
      { speaker: "运维 Agent", emoji: "🔄", content: "我反对微服务。5 人团队运维 10+ 个微服务是不现实的。K8s 集群、服务发现、分布式追踪、日志聚合——这些基础设施维护成本远超你们的估计。", a2aLayer: "L4"},
      { speaker: "架构师", emoji: "🏗️", content: "模块化单体也可以，但未来拆分成本极高。我见过太多项目因为早期选单体，半年后重构花了 3 个月。", a2aLayer: "L5"},
      { speaker: "运维 Agent", emoji: "🔄", content: "你这是过度设计！10 万 DAU 单体 + 读写分离 + Redis 缓存完全够用。等真正需要扩展时再拆分，而不是一开始就背上微服务的运维债务。", a2aLayer: "L5"},
      { speaker: "策略 Agent", emoji: "📈", content: "我补充商业视角：团队目标是 6 个月内验证 PMF，不是构建完美架构。过早优化是创业公司的头号杀手。", a2aLayer: "L5"},
      { speaker: "A2A-Arb", emoji: "⚖️", content: "[仲裁协议触发] 架构师与运维 Agent 经 3 轮协商未达成一致。启动仲裁程序：双方提交立场陈述，仲裁组投票。", isSystem: true, a2aLayer: "L6"},
      { speaker: "仲裁组", emoji: "⚖️", content: "仲裁组（策略 Agent + 产品 Agent + 财务 Agent）投票结果：2:1。支持「模块化单体 + 清晰边界」方案，预留未来拆分接口。", a2aLayer: "L6"},
      { speaker: "仲裁组", emoji: "⚖️", content: "少数派报告（架构师）：微服务方案在 12 个月后实现。触发条件：DAU 超过 50 万，或需要独立部署特定模块。此结论已备查。", a2aLayer: "L6"},
      { speaker: "Router", emoji: "🔀", content: "[A2A-Mem] 仲裁结果写入共享记忆。标签：#架构选型 #5人团队 #10万DAU。后续类似场景自动提取参考。", isSystem: true, a2aLayer: "L2"},
      { speaker: "Quality Gate", emoji: "✅", content: "决策报告已输出：模块化单体方案 + 6 个月后评估拆分时机 + 微服务迁移预案。信用更新：架构师 +0.05（高质量辩论），运维 +0.08（务实建议被采纳）。", isSystem: true },
    ],
  },
  {
    id: "federation",
    title: "联邦聚合决策",
    subtitle: "多 Agent 风险评估",
    description: "10 个 Agent 独立评估产品风险 → 联邦聚合器综合方案 → 差异化加权（信用+相关性）→ 输出风险矩阵 + 共识置信度",
    messages: [
      { speaker: "User", emoji: "👤", content: "我们计划在欧盟上线 AI 客服功能，帮我做全面的风险评估", isUser: true },
      { speaker: "Router", emoji: "🔀", content: "多维度需求检测：法律合规 + 安全 + 技术 + 市场 + 用户体验。启动联邦聚合模式，召集 10 个 Agent 独立评估。", isSystem: true, a2aLayer: "L7"},
      { speaker: "法律 Agent", emoji: "⚖️", content: "独立评估结果：风险等级 HIGH。EU AI Act 将 AI 客服归类为「有限风险」，需强制透明度声明 + 人工接管机制。GDPR 第 22 条禁止纯自动化决策，必须保留人工复核通道。", a2aLayer: "L7"},
      { speaker: "安全 Agent", emoji: "🛡️", content: "独立评估结果：风险等级 HIGH。AI 客服可能被 Prompt Injection 攻击诱导泄露用户数据。需实现输入净化 + 输出过滤 + 用户数据隔离。", a2aLayer: "L7"},
      { speaker: "客服 Agent", emoji: "💬", content: "独立评估结果：风险等级 MEDIUM。AI 客服在情感识别上仍有盲区，愤怒客户可能因得不到共情回应而升级投诉。建议保留人工优先升级通道。", a2aLayer: "L7"},
      { speaker: "翻译 Agent", emoji: "🌐", content: "独立评估结果：风险等级 MEDIUM。欧盟 24 种官方语言，AI 翻译在低资源语言（如马耳他语、爱尔兰语）上准确率仅 78%，可能导致服务不公平。", a2aLayer: "L7"},
      { speaker: "财务 Agent", emoji: "🧮", content: "独立评估结果：风险等级 LOW。合规成本预估 €15 万/年（DPO + 审计 + 文档），但 AI 客服可节省 €80 万/年的人力成本。ROI 正向。", a2aLayer: "L7"},
      { speaker: "策略 Agent", emoji: "📈", content: "独立评估结果：风险等级 MEDIUM。竞品 Zendesk AI 已在欧盟上线，我们晚了 6 个月。但合规做得更好可以成为差异化优势。", a2aLayer: "L7"},
      { speaker: "产品 Agent", emoji: "💼", content: "独立评估结果：风险等级 MEDIUM。用户调研显示 62% 欧盟用户愿意使用 AI 客服，但 78% 要求知道何时在与 AI 对话。透明度是关键。", a2aLayer: "L7"},
      { speaker: "无障碍 Agent", emoji: "♿", content: "独立评估结果：风险等级 MEDIUM。AI 客服需符合 EN 301 549 无障碍标准。语音交互需支持屏幕阅读器，文字对话需支持高对比度模式。", a2aLayer: "L7"},
      { speaker: "数据 Agent", emoji: "📊", content: "独立评估结果：风险等级 LOW。历史数据显示，AI 客服拦截率 85%，客户满意度 4.2/5。但需注意：欧盟用户对数据隐私的敏感度比美国高 40%。", a2aLayer: "L7"},
      { speaker: "PM Agent", emoji: "🎯", content: "[联邦聚合] 综合 10 个 Agent 独立评估。加权计算（信用分 × 领域相关性）：综合风险等级 MEDIUM-HIGH。共识强度 87%。", a2aLayer: "L7"},
      { speaker: "PM Agent", emoji: "🎯", content: "聚合结论：建议分阶段上线。Phase 1：仅 FAQ 类问答（风险 LOW），Phase 2：加人工监督的复杂问题（风险 MEDIUM），Phase 3：全面 AI 客服（需等 EU AI Act 细则落地）。", a2aLayer: "L7"},
      { speaker: "Quality Gate", emoji: "✅", content: "联邦决策报告已生成。包含：风险矩阵（4 维度 × 10 Agent）、分歧点分析（3 个 Agent 意见偏离）、共识置信度 87%、分阶段执行路线图。", isSystem: true },
    ],
  },
];