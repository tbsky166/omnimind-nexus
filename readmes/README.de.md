# OmniMind Nexus（Deutsch）

> 32-Agent A2A Multi-Agenten-Kollaborationsplattform — Lassen Sie KI wie ein menschliches Team zusammenarbeiten

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Schnellstart

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. OpenAI API Key konfigurieren
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (Optional) Benutzerdefinierter API-Endpunkt
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. Entwicklungsserver starten
npm run dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000), wechseln Sie zum **Live**-Tab und geben Sie eine Aufgabe ein.

## Funktionen

- **32 spezialisierte Agenten** — Router gleicht automatisch ab, Planner erstellt Pläne, Zusammenarbeit über A2A 7-Schichten-Protokoll
- **2D Pixel-Game-Pipeline** — Jeder Agent hat einen einzigartigen Pixel-Avatar, verbunden durch Rohre, Echtzeit-Statusvisualisierung
- **Streaming-Ausgabe** — SSE tokenweise Push-Übertragung, keine Verzögerung, 90-Sekunden-Timeout-Schutz
- **Tool-Aufruf** — Erzeugung von docx/xlsx-Dokumenten, Lesen/Schreiben von Arbeitsbereichsdateien, Dateiübergabe zwischen Agenten
- **Sitzungsverlauf** — Automatisches Speichern/Laden/Löschen mit persistenter Speicherung

## Projektstruktur

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Haupt-Chat-API (7-Phasen-Pipeline)
│   │   ├── generate/route.ts   # Dokumentenerzeugung
│   │   ├── sessions/route.ts   # Sitzungspersistenz
│   │   └── upload/route.ts     # Datei-Upload & -Parsing
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # Chat-System + Pipeline-UI
│   ├── AgentNetwork.tsx        # Agenten-Netzwerk-Anzeige
│   ├── ProtocolLayers.tsx      # A2A-Protokollschichten-Anzeige
│   └── ...                     # Weitere Landingpage-Komponenten
├── data/
│   └── agents.ts              # 32 Agenten-Definitionen
└── lib/
    ├── prompt.ts              # Prompt & LLM-Aufrufe
    └── document.ts            # Dokumentenerzeugung & Arbeitsbereichs-Dateioperationen
```

## Tech-Stack

| Technologie | Zweck |
|-------------|-------|
| Next.js 15 | Full-Stack-Framework |
| React 19 | UI-Rendering |
| Tailwind CSS 4 | Pixel-Stil-Theming |
| Framer Motion 11 | Animationen |
| OpenAI API | LLM-Backend |
| docx / xlsx | Dokumentenerzeugung |
| mammoth | Dokumenten-Parsing |

## Lizenz

MIT