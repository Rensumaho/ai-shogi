"use client";

import type { MoveRecord, GameResult, PlayerColor } from "@/lib/types";

interface GameInfoProps {
  moveHistory: MoveRecord[];
  turn: PlayerColor;
  userColor: PlayerColor;
  isCheck: boolean;
  result?: GameResult;
  status: string;
}

function resultText(result: GameResult): string {
  const winner = result.winner === "sente" ? "先手" : result.winner === "gote" ? "後手" : null;
  switch (result.reason) {
    case "checkmate":
      return `${winner}の勝ち（詰み）`;
    case "stalemate":
      return `${winner}の勝ち（ステイルメイト）`;
    case "resign":
      return `${winner}の勝ち（投了）`;
    case "draw":
      return "引き分け";
    case "repetition":
      return "千日手";
    default:
      return "対局終了";
  }
}

export default function GameInfo({
  moveHistory,
  turn,
  userColor,
  isCheck,
  result,
  status,
}: GameInfoProps) {
  const turnLabel = turn === "sente" ? "先手" : "後手";
  const isUserTurn = turn === userColor;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 8,
        padding: 16,
        width: 240,
        maxHeight: 500,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: "bold", color: "#e0e0e0" }}>
        対局情報
      </div>

      {status === "playing" && (
        <div style={{ fontSize: 14 }}>
          <span
            style={{
              color: isUserTurn ? "#4fc3f7" : "#ff8a65",
              fontWeight: "bold",
            }}
          >
            {turnLabel}の番
          </span>
          {isUserTurn ? "（あなた）" : "（AI）"}
          {isCheck && (
            <span
              style={{
                marginLeft: 8,
                color: "#ef5350",
                fontWeight: "bold",
              }}
            >
              王手！
            </span>
          )}
        </div>
      )}

      {result && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(255,215,0,0.15)",
            borderRadius: 6,
            fontWeight: "bold",
            color: "#ffd700",
            fontSize: 14,
          }}
        >
          {resultText(result)}
        </div>
      )}

      <div style={{ fontSize: 13, color: "#aaa" }}>
        棋譜（{moveHistory.length}手）
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          fontSize: 13,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {moveHistory.map((m) => (
          <div
            key={m.moveNumber}
            style={{
              padding: "3px 6px",
              borderRadius: 3,
              background:
                m.moveNumber === moveHistory.length
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color: m.color === "sente" ? "#e0e0e0" : "#b0bec5",
            }}
          >
            <span style={{ color: "#666", marginRight: 6 }}>
              {m.moveNumber}.
            </span>
            {m.japanese}
          </div>
        ))}
      </div>
    </div>
  );
}
