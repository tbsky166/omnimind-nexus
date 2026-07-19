# OmniMind Nexus

> 32 Agent A2A 多智能体协作平台 —— 让 AI 像人类团队一样协作

![OmniMind Nexus](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 设置JWT_SECRET(生产环境必要)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# echo "JWT_SECRET=上方命令结果" >> .env.local

# 3. 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，切换到 **Live** 标签，输入任务即可体验。

## 功能

- **32 个专业 Agent** — Router 自动匹配，Planner 制定计划，按 A2A 七层协议协作
- **2D 像素游戏流水线** — 每个 Agent 有独立像素头像，管道连接，实时状态可视化
- **流式输出** — SSE 逐 token 推送，不卡顿，90 秒超时保护
- **工具调用** — 生成 docx/xlsx 文档、读写工作区文件、Agent 间文件交接
- **会话历史** — 自动保存/加载/删除，数据持久化

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # 主对话 API（7 阶段管线）
│   │   ├── generate/route.ts   # 文档生成
│   │   ├── sessions/route.ts   # 会话持久化
│   │   └── upload/route.ts     # 文件上传解析
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # 对话系统 + 流水线 UI
│   ├── AgentNetwork.tsx        # Agent 网络展示
│   ├── ProtocolLayers.tsx      # A2A 协议层展示
│   └── ...                     # 其他落地页组件
├── data/
│   └── agents.ts              # 32 Agent 定义
└── lib/
    ├── prompt.ts              # Prompt & LLM 调用
    └── document.ts            # 文档生成 & 工作区文件操作
```

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 15 | 全栈框架 |
| React 19 | UI 渲染 |
| Tailwind CSS 4 | 像素风格样式 |
| Framer Motion 11 | 动画 |
| OpenAI API | LLM 驱动 |
| docx / xlsx | 文档生成 |
| mammoth | 文档解析 |

## 多语言 / Languages

| 语言 | 链接 |
|------|------|
| 中文 | [README.md](readmes/README.md) |
| English | [README.en.md](readmes/README.en.md) |
| 日本語 | [README.ja.md](readmes/README.ja.md) |
| 한국어 | [README.ko.md](readmes/README.ko.md) |
| Español | [README.es.md](readmes/README.es.md) |
| Français | [README.fr.md](readmes/README.fr.md) |
| Deutsch | [README.de.md](readmes/README.de.md) |
| Português | [README.pt.md](readmes/README.pt.md) |
| Русский | [README.ru.md](readmes/README.ru.md) |
| العربية | [README.ar.md](readmes/README.ar.md) |
| हिन्दी | [README.hi.md](readmes/README.hi.md) |

## License

MIT
