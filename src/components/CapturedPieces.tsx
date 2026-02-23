"use client";

import type { PlayerColor } from "@/lib/types";

const ROLE_TO_KANJI: Record<string, string> = {
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
};

const HAND_ROLE_ORDER = ["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"];

interface CapturedPiecesProps {
  pieces: Record<string, number>;
  color: PlayerColor;
  isUserColor: boolean;
  onDropSelect?: (role: string) => void;
  selectedDrop?: string | null;
  canInteract?: boolean;
}

export default function CapturedPieces({
  pieces,
  color,
  isUserColor,
  onDropSelect,
  selectedDrop,
  canInteract = false,
}: CapturedPiecesProps) {
  const label = color === "sente" ? "☗ 先手" : "☖ 後手";
  const isGote = color === "gote";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 8,
        padding: "12px 16px",
        minWidth: 80,
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 8,
          color: isUserColor ? "#4fc3f7" : "#aaa",
          fontWeight: isUserColor ? "bold" : "normal",
        }}
      >
        {label}
        {isUserColor && " (あなた)"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {HAND_ROLE_ORDER.map((role) => {
          const count = pieces[role] ?? 0;
          if (count === 0) return null;
          const isSelected = selectedDrop === role;
          return (
            <div
              key={role}
              onClick={() => canInteract && onDropSelect?.(role)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 4,
                cursor: canInteract ? "pointer" : "default",
                background: isSelected ? "rgba(50,180,50,0.35)" : "transparent",
                transform: isGote ? "rotate(180deg)" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  color: "#f5deb3",
                }}
              >
                {ROLE_TO_KANJI[role]}
              </span>
              {count > 1 && (
                <span style={{ fontSize: 14, color: "#ccc" }}>×{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
