# AI将棋 (ai-shogi)

LLM（Claude、GPT、Gemini等）と対局できる将棋アプリケーション。MCP（Model Context Protocol）を通じて、AIエージェントが将棋を指します。

## 概要

- **将棋アプリ**（Next.js）: GUI付きの将棋盤を表示し、ユーザーが駒を操作
- **MCPサーバー**: 将棋アプリのAPIを呼び出すツールを提供し、LLMが盤面を分析・指し手を送信

```
┌─────────────┐       MCP通信        ┌──────────────────┐
│  Cursor IDE  │ ◄──────────────────► │  将棋アプリ       │
│  (LLMクライアント)│                    │  (Next.js + API)  │
└─────────────┘                      └──────────────────┘
```

## 技術スタック

- Next.js 15 (App Router) + TypeScript
- shogiops — 将棋ルールエンジン
- @modelcontextprotocol/sdk — MCPサーバー

## セットアップ

```bash
npm install
npm run dev
```

- アプリ: `http://localhost:3001`
- MCP 設定は `.cursor/mcp.json` に登録済み（Cursor 起動時に自動認識）

## 使い方

1. `npm run dev` でアプリを起動
2. ブラウザで `http://localhost:3001` を開く
3. Cursor に「将棋をして」と指示して対局開始

## MCP ツール

| ツール | 説明 |
|--------|------|
| `start_game` | 対局を開始 |
| `get_board_state` | 盤面状態を取得 |
| `get_legal_moves` | 合法手一覧を取得 |
| `make_move` | 指し手を実行 |
| `wait_for_user_move` | ユーザーの操作完了を待機 |
| `get_game_status` | 対局状態を取得 |
| `get_move_history` | 棋譜を取得 |
