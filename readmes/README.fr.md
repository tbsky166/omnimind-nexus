# OmniMind Nexus（Français）

> Plateforme de collaboration multi-agent A2A à 32 agents — Faites collaborer l'IA comme une équipe humaine

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la clé API OpenAI
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (Optionnel) Endpoint API personnalisé
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. Démarrer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), passez à l'onglet **Live** et entrez une tâche.

## Fonctionnalités

- **32 Agents spécialisés** — Router fait correspondre automatiquement, Planner crée des plans, collaboration via le protocole A2A à 7 couches
- **Pipeline de jeu pixel 2D** — Chaque agent a un avatar pixel unique, connecté par des tuyaux, visualisation d'état en temps réel
- **Sortie en streaming** — SSE push token par token, sans latence, protection timeout de 90 secondes
- **Appel d'outils** — Génération de documents docx/xlsx, lecture/écriture de fichiers workspace, transfert de fichiers entre agents
- **Historique des sessions** — Sauvegarde/chargement/suppression automatique avec stockage persistant

## Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # API de chat principale (pipeline 7 phases)
│   │   ├── generate/route.ts   # Génération de documents
│   │   ├── sessions/route.ts   # Persistance des sessions
│   │   └── upload/route.ts     # Téléchargement et analyse de fichiers
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # Système de chat + UI pipeline
│   ├── AgentNetwork.tsx        # Affichage du réseau d'agents
│   ├── ProtocolLayers.tsx      # Affichage des couches du protocole A2A
│   └── ...                     # Autres composants de la page d'accueil
├── data/
│   └── agents.ts              # Définitions des 32 agents
└── lib/
    ├── prompt.ts              # Prompts et appels LLM
    └── document.ts            # Génération de documents et opérations sur fichiers
```

## Stack technique

| Technologie | Usage |
|-------------|-------|
| Next.js 15 | Framework full-stack |
| React 19 | Rendu UI |
| Tailwind CSS 4 | Style pixel |
| Framer Motion 11 | Animations |
| OpenAI API | Backend LLM |
| docx / xlsx | Génération de documents |
| mammoth | Analyse de documents |

## Licence

MIT