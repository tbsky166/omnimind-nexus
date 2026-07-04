# OmniMind Nexus（日本語）

> 32エージェント A2A マルチエージェント協調プラットフォーム — AI を人間のチームのように協調させる

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## クイックスタート

```bash
# 1. 依存関係のインストール
npm install

# 2. OpenAI API Key の設定
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. （オプション）カスタム API エンドポイント
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. 開発サーバー起動
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開き、**Live** タブに切り替えてタスクを入力してください。

## 機能

- **32 の専門エージェント** — Router が自動マッチング、Planner が計画作成、A2A 7層プロトコルで協調
- **2D ピクセルゲームパイプライン** — 各エージェントに固有のピクセルアバター、パイプ接続、リアルタイム状態可視化
- **ストリーミング出力** — SSE トークン単位のプッシュ、遅延なし、90秒タイムアウト保護
- **ツール呼び出し** — docx/xlsx ドキュメント生成、ワークスペースファイルの読み書き、エージェント間ファイル受け渡し
- **セッション履歴** — 自動保存/読み込み/削除、データ永続化

## プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # メインチャット API（7フェーズパイプライン）
│   │   ├── generate/route.ts   # ドキュメント生成
│   │   ├── sessions/route.ts   # セッション永続化
│   │   └── upload/route.ts     # ファイルアップロード解析
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # チャットシステム + パイプライン UI
│   ├── AgentNetwork.tsx        # エージェントネットワーク表示
│   ├── ProtocolLayers.tsx      # A2A プロトコル層表示
│   └── ...                     # その他ランディングページコンポーネント
├── data/
│   └── agents.ts              # 32 エージェント定義
└── lib/
    ├── prompt.ts              # プロンプト & LLM 呼び出し
    └── document.ts            # ドキュメント生成 & ワークスペースファイル操作
```

## 技術スタック

| 技術 | 用途 |
|------|------|
| Next.js 15 | フルスタックフレームワーク |
| React 19 | UI レンダリング |
| Tailwind CSS 4 | ピクセルスタイルテーマ |
| Framer Motion 11 | アニメーション |
| OpenAI API | LLM バックエンド |
| docx / xlsx | ドキュメント生成 |
| mammoth | ドキュメント解析 |

## ライセンス

MIT