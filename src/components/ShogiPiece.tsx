"use client";

import type { BoardCell } from "@/lib/types";

const ROLE_TO_KANJI: Record<string, string> = {
  king: "玉",
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
  dragon: "竜",
  horse: "馬",
  tokin: "と",
  promotedsilver: "全",
  promotedknight: "圭",
  promotedlance: "杏",
};

const PROMOTED_ROLES = new Set([
  "dragon",
  "horse",
  "tokin",
  "promotedsilver",
  "promotedknight",
  "promotedlance",
]);

interface ShogiPieceProps {
  piece: BoardCell;
  size?: number;
}

export default function ShogiPiece({ piece, size = 56 }: ShogiPieceProps) {
  const isGote = piece.color === "gote";
  const isPromoted = PROMOTED_ROLES.has(piece.role);
  const kanji = ROLE_TO_KANJI[piece.role] ?? piece.role;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.55,
        fontWeight: "bold",
        color: isPromoted ? "#c0392b" : "#1a1a1a",
        transform: isGote ? "rotate(180deg)" : "none",
        userSelect: "none",
        lineHeight: 1,
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon
          points="50,8 85,30 80,92 20,92 15,30"
          fill="#f5deb3"
          stroke="#8b6914"
          strokeWidth="2"
        />
      </svg>
      <span style={{ position: "relative", zIndex: 1 }}>{kanji}</span>
    </div>
  );
}
