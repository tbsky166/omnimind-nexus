# OmniMind Nexus（Русский）

> Платформа мульти-агентного сотрудничества A2A с 32 агентами — Пусть ИИ сотрудничает как человеческая команда

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Настроить OpenAI API Key
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (Опционально) Пользовательский API-эндпоинт
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. Запустить сервер разработки
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000), переключитесь на вкладку **Live** и введите задачу.

## Возможности

- **32 специализированных агента** — Router автоматически подбирает, Planner создаёт планы, сотрудничество через 7-уровневый протокол A2A
- **2D пиксельный игровой пайплайн** — Каждый агент имеет уникальный пиксельный аватар, соединён трубами, визуализация статуса в реальном времени
- **Потоковый вывод** — SSE push токен за токеном, без задержек, защита тайм-аутом 90 секунд
- **Вызов инструментов** — Генерация документов docx/xlsx, чтение/запись файлов рабочей области, передача файлов между агентами
- **История сессий** — Автосохранение/загрузка/удаление с постоянным хранением

## Структура проекта

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Основной API чата (7-фазный пайплайн)
│   │   ├── generate/route.ts   # Генерация документов
│   │   ├── sessions/route.ts   # Сохранение сессий
│   │   └── upload/route.ts     # Загрузка и разбор файлов
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # Система чата + UI пайплайна
│   ├── AgentNetwork.tsx        # Отображение сети агентов
│   ├── ProtocolLayers.tsx      # Отображение слоёв протокола A2A
│   └── ...                     # Прочие компоненты лендинга
├── data/
│   └── agents.ts              # Определения 32 агентов
└── lib/
    ├── prompt.ts              # Промпты и вызовы LLM
    └── document.ts            # Генерация документов и операции с файлами
```

## Технологический стек

| Технология | Назначение |
|------------|------------|
| Next.js 15 | Full-stack фреймворк |
| React 19 | Рендеринг UI |
| Tailwind CSS 4 | Пиксельный стиль |
| Framer Motion 11 | Анимации |
| OpenAI API | LLM-бэкенд |
| docx / xlsx | Генерация документов |
| mammoth | Разбор документов |

## Лицензия

MIT