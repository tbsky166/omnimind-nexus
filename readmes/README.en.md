# OmniMind Nexus (English)

> 32-Agent A2A Multi-Agent Collaboration Platform — Let AI Collaborate Like a Human Team

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure OpenAI API Key
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (Optional) Custom API endpoint
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), switch to the **Live** tab, and enter a task.

## Features

- **32 Specialized Agents** — Router auto-matches, Planner creates plans, collaboration via A2A 7-layer protocol
- **2D Pixel Game Pipeline** — Each agent has a unique pixel avatar, connected by pipes, real-time status visualization
- **Streaming Output** — SSE token-by-token push, no lag, 90-second timeout protection
- **Tool Calling** — Generate docx/xlsx documents, read/write workspace files, file handoff between agents
- **Session History** — Auto-save/load/delete with persistent storage

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Main chat API (7-phase pipeline)
│   │   ├── generate/route.ts   # Document generation
│   │   ├── sessions/route.ts   # Session persistence
│   │   └── upload/route.ts     # File upload & parsing
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # Chat system + pipeline UI
│   ├── AgentNetwork.tsx        # Agent network display
│   ├── ProtocolLayers.tsx      # A2A protocol layer display
│   └── ...                     # Other landing page components
├── data/
│   └── agents.ts              # 32 Agent definitions
└── lib/
    ├── prompt.ts              # Prompt & LLM calls
    └── document.ts            # Document generation & workspace file ops
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 | Full-stack framework |
| React 19 | UI rendering |
| Tailwind CSS 4 | Pixel-style theming |
| Framer Motion 11 | Animations |
| OpenAI API | LLM backend |
| docx / xlsx | Document generation |
| mammoth | Document parsing |

## License

MIT