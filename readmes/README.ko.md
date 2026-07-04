# OmniMind Nexus（한국어）

> 32 에이전트 A2A 멀티 에이전트 협업 플랫폼 — AI가 인간 팀처럼 협업하게 하세요

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. OpenAI API Key 설정
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (선택) 사용자 정의 API 엔드포인트
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. 개발 서버 시작
npm run dev
```

[http://localhost:3000](http://localhost:3000)을 열고 **Live** 탭으로 전환하여 작업을 입력하세요.

## 기능

- **32개 전문 에이전트** — Router 자동 매칭, Planner 계획 수립, A2A 7계층 프로토콜로 협업
- **2D 픽셀 게임 파이프라인** — 각 에이전트에 고유한 픽셀 아바타, 파이프 연결, 실시간 상태 시각화
- **스트리밍 출력** — SSE 토큰 단위 푸시, 지연 없음, 90초 타임아웃 보호
- **도구 호출** — docx/xlsx 문서 생성, 작업 공간 파일 읽기/쓰기, 에이전트 간 파일 전달
- **세션 기록** — 자동 저장/로드/삭제, 데이터 영구 보존

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # 메인 채팅 API (7단계 파이프라인)
│   │   ├── generate/route.ts   # 문서 생성
│   │   ├── sessions/route.ts   # 세션 영구 저장
│   │   └── upload/route.ts     # 파일 업로드 및 파싱
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # 채팅 시스템 + 파이프라인 UI
│   ├── AgentNetwork.tsx        # 에이전트 네트워크 표시
│   ├── ProtocolLayers.tsx      # A2A 프로토콜 계층 표시
│   └── ...                     # 기타 랜딩 페이지 컴포넌트
├── data/
│   └── agents.ts              # 32 에이전트 정의
└── lib/
    ├── prompt.ts              # 프롬프트 및 LLM 호출
    └── document.ts            # 문서 생성 및 작업 공간 파일 작업
```

## 기술 스택

| 기술 | 용도 |
|------|------|
| Next.js 15 | 풀스택 프레임워크 |
| React 19 | UI 렌더링 |
| Tailwind CSS 4 | 픽셀 스타일 테마 |
| Framer Motion 11 | 애니메이션 |
| OpenAI API | LLM 백엔드 |
| docx / xlsx | 문서 생성 |
| mammoth | 문서 파싱 |

## 라이선스

MIT