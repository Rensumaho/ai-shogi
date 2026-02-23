import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.SHOGI_API_URL || "http://localhost:3000";

async function apiCall(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return res.json();
}

const server = new McpServer({
  name: "ai-shogi",
  version: "0.1.0",
});

server.tool(
  "start_game",
  "新しい将棋の対局を開始します。ユーザーの手番（先手/後手）を指定できます。",
  {
    user_color: z
      .enum(["sente", "gote"])
      .optional()
      .describe("ユーザーの手番。sente=先手（デフォルト）、gote=後手"),
  },
  async ({ user_color }) => {
    const data = await apiCall("/api/game", {
      method: "POST",
      body: JSON.stringify({ userColor: user_color ?? "sente" }),
    });
    if (!data.success) {
      return { content: [{ type: "text" as const, text: `エラー: ${data.error}` }] };
    }
    const board = await apiCall("/api/game/board");
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `対局を開始しました。`,
            `ゲームID: ${data.gameId}`,
            `あなた（AI）: ${user_color === "gote" ? "先手（sente）" : "後手（gote）"}`,
            `ユーザー: ${data.userColor === "sente" ? "先手（sente）" : "後手（gote）"}`,
            ``,
            `現在の盤面:`,
            board.textBoard,
            ``,
            `SFEN: ${board.sfen}`,
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "get_board_state",
  "現在の盤面状態を取得します。SFEN形式とテキスト形式の盤面、持ち駒、手番情報を返します。",
  {},
  async () => {
    const data = await apiCall("/api/game/board");
    if (!data.success) {
      return { content: [{ type: "text" as const, text: `エラー: ${data.error}` }] };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `手番: ${data.turn === "sente" ? "先手" : "後手"}`,
            `王手: ${data.isCheck ? "はい" : "いいえ"}`,
            ``,
            data.textBoard,
            ``,
            `SFEN: ${data.sfen}`,
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "get_legal_moves",
  "現在の手番の合法手一覧を取得します。特定のマスを指定することもできます。",
  {
    square: z
      .string()
      .optional()
      .describe("特定のマスの合法手のみ取得（例: '7g'）。省略時は全合法手"),
  },
  async ({ square }) => {
    const query = square ? `?square=${square}` : "";
    const data = await apiCall(`/api/game/legal-moves${query}`);
    if (!data.success) {
      return { content: [{ type: "text" as const, text: `エラー: ${data.error}` }] };
    }
    const movesText = data.moves
      .map((m: { usi: string; japanese: string }) => `${m.usi} (${m.japanese})`)
      .join("\n");
    return {
      content: [
        {
          type: "text" as const,
          text: `合法手一覧（${data.moves.length}手）:\n${movesText}`,
        },
      ],
    };
  }
);

server.tool(
  "make_move",
  "指し手を実行します。USI形式で指定してください（例: '7g7f' = ７六歩、'P*3d' = ３四歩打、'8h2b+' = ２二角成）。",
  {
    move: z.string().describe("USI形式の指し手（例: '7g7f', 'P*3d', '8h2b+'）"),
  },
  async ({ move }) => {
    const data = await apiCall("/api/game/move", {
      method: "POST",
      body: JSON.stringify({ move, byUser: false }),
    });
    if (!data.success) {
      return { content: [{ type: "text" as const, text: `エラー: ${data.error}` }] };
    }
    const board = data.boardState;
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `指し手を実行しました: ${data.moveRecord.japanese} (${data.moveRecord.usi})`,
            ``,
            board.textBoard,
            ``,
            `SFEN: ${board.sfen}`,
            `王手: ${board.isCheck ? "はい" : "いいえ"}`,
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "wait_for_user_move",
  "ユーザーが将棋アプリのGUI上で駒を動かすまで待機します。ユーザーが指し手を完了すると、その指し手と新しい盤面状態を返します。",
  {
    timeout_ms: z
      .number()
      .optional()
      .describe("タイムアウト（ミリ秒）。デフォルト300000（5分）"),
  },
  async ({ timeout_ms }) => {
    const timeout = timeout_ms ?? 300000;
    const data = await apiCall(`/api/game/wait-move?timeout_ms=${timeout}`);

    if (data.status === "timeout") {
      return {
        content: [
          {
            type: "text" as const,
            text: "タイムアウト: ユーザーがまだ指し手を入力していません。ユーザーに「指し終わったら教えてください」と伝えてください。",
          },
        ],
      };
    }

    if (data.status === "game_over") {
      const board = data.boardState;
      return {
        content: [
          {
            type: "text" as const,
            text: [
              "対局が終了しました。",
              board ? `\n${board.textBoard}` : "",
              data.move ? `最後の手: ${data.move.japanese}` : "",
            ].join("\n"),
          },
        ],
      };
    }

    if (data.status === "moved" && data.move) {
      const board = data.boardState;
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `ユーザーの指し手: ${data.move.japanese} (${data.move.usi})`,
              ``,
              board.textBoard,
              ``,
              `SFEN: ${board.sfen}`,
              `王手: ${board.isCheck ? "はい" : "いいえ"}`,
            ].join("\n"),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: "ユーザーの手番を待っています...",
        },
      ],
    };
  }
);

server.tool(
  "get_game_status",
  "現在の対局状態を取得します（進行中、詰み、千日手など）。",
  {},
  async () => {
    const data = await apiCall("/api/game/status");
    if (!data.success) {
      return { content: [{ type: "text" as const, text: `エラー: ${data.error}` }] };
    }

    const statusText = data.status === "playing" ? "対局中" : data.status === "finished" ? "終了" : "待機中";
    const lines = [
      `状態: ${statusText}`,
      `手番: ${data.turn === "sente" ? "先手" : "後手"}`,
      `手数: ${data.moveCount}`,
      `王手: ${data.isCheck ? "はい" : "いいえ"}`,
      `詰み: ${data.isCheckmate ? "はい" : "いいえ"}`,
    ];

    if (data.result) {
      const winner = data.result.winner === "sente" ? "先手" : data.result.winner === "gote" ? "後手" : "なし";
      lines.push(`結果: ${winner}の勝ち（${data.result.reason}）`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

server.tool(
  "get_move_history",
  "対局の棋譜（全指し手の履歴）を取得します。",
  {},
  async () => {
    const data = await apiCall("/api/game/history");
    if (!data.success) {
      return { content: [{ type: "text" as const, text: `エラー: ${data.error}` }] };
    }

    if (data.history.length === 0) {
      return { content: [{ type: "text" as const, text: "まだ指し手がありません。" }] };
    }

    const historyText = data.history
      .map(
        (m: { moveNumber: number; japanese: string; usi: string; color: string }) =>
          `${m.moveNumber}. ${m.japanese} (${m.usi}) [${m.color === "sente" ? "先手" : "後手"}]`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `棋譜（${data.history.length}手）:\n${historyText}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AI将棋 MCP サーバーが起動しました");
}

main().catch((err) => {
  console.error("MCP サーバーの起動に失敗しました:", err);
  process.exit(1);
});
