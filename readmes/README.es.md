# OmniMind Nexus（Español）

> Plataforma de colaboración multi-agente A2A con 32 agentes — Haz que la IA colabore como un equipo humano

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar OpenAI API Key
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (Opcional) Endpoint API personalizado
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), cambia a la pestaña **Live** e ingresa una tarea.

## Características

- **32 Agentes especializados** — Router empareja automáticamente, Planner crea planes, colaboración mediante protocolo A2A de 7 capas
- **Pipeline de juego píxel 2D** — Cada agente tiene un avatar píxel único, conectado por tuberías, visualización de estado en tiempo real
- **Salida en streaming** — SSE push token por token, sin retrasos, protección de timeout de 90 segundos
- **Llamada de herramientas** — Genera documentos docx/xlsx, lee/escribe archivos del espacio de trabajo, traspaso de archivos entre agentes
- **Historial de sesiones** — Auto-guardado/carga/eliminación con almacenamiento persistente

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # API principal de chat (pipeline de 7 fases)
│   │   ├── generate/route.ts   # Generación de documentos
│   │   ├── sessions/route.ts   # Persistencia de sesiones
│   │   └── upload/route.ts     # Carga y análisis de archivos
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # Sistema de chat + UI de pipeline
│   ├── AgentNetwork.tsx        # Visualización de red de agentes
│   ├── ProtocolLayers.tsx      # Visualización de capas de protocolo A2A
│   └── ...                     # Otros componentes de la página de inicio
├── data/
│   └── agents.ts              # Definiciones de 32 agentes
└── lib/
    ├── prompt.ts              # Prompts y llamadas LLM
    └── document.ts            # Generación de documentos y operaciones de archivos
```

## Stack tecnológico

| Tecnología | Propósito |
|------------|-----------|
| Next.js 15 | Framework full-stack |
| React 19 | Renderizado UI |
| Tailwind CSS 4 | Estilo píxel |
| Framer Motion 11 | Animaciones |
| OpenAI API | Backend LLM |
| docx / xlsx | Generación de documentos |
| mammoth | Análisis de documentos |

## Licencia

MIT