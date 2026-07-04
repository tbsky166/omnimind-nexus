# OmniMind Nexus（Português）

> Plataforma de colaboração multi-agente A2A com 32 agentes — Faça a IA colaborar como uma equipe humana

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar OpenAI API Key
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (Opcional) Endpoint API personalizado
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), mude para a aba **Live** e insira uma tarefa.

## Funcionalidades

- **32 Agentes especializados** — Router faz correspondência automática, Planner cria planos, colaboração via protocolo A2A de 7 camadas
- **Pipeline de jogo pixel 2D** — Cada agente tem um avatar pixel único, conectado por tubos, visualização de status em tempo real
- **Saída em streaming** — SSE push token por token, sem atrasos, proteção de timeout de 90 segundos
- **Chamada de ferramentas** — Geração de documentos docx/xlsx, leitura/escrita de arquivos do workspace, transferência de arquivos entre agentes
- **Histórico de sessões** — Salvamento/carregamento/exclusão automática com armazenamento persistente

## Estrutura do projeto

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # API principal de chat (pipeline de 7 fases)
│   │   ├── generate/route.ts   # Geração de documentos
│   │   ├── sessions/route.ts   # Persistência de sessões
│   │   └── upload/route.ts     # Upload e análise de arquivos
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # Sistema de chat + UI de pipeline
│   ├── AgentNetwork.tsx        # Visualização da rede de agentes
│   ├── ProtocolLayers.tsx      # Visualização das camadas do protocolo A2A
│   └── ...                     # Outros componentes da página inicial
├── data/
│   └── agents.ts              # Definições dos 32 agentes
└── lib/
    ├── prompt.ts              # Prompts e chamadas LLM
    └── document.ts            # Geração de documentos e operações de arquivo
```

## Stack tecnológico

| Tecnologia | Propósito |
|------------|-----------|
| Next.js 15 | Framework full-stack |
| React 19 | Renderização UI |
| Tailwind CSS 4 | Estilo pixel |
| Framer Motion 11 | Animações |
| OpenAI API | Backend LLM |
| docx / xlsx | Geração de documentos |
| mammoth | Análise de documentos |

## Licença

MIT