"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ShogiPiece from "./ShogiPiece";
import CapturedPieces from "./CapturedPieces";
import PromotionDialog from "./PromotionDialog";
import GameInfo from "./GameInfo";
import type { BoardCell, BoardApiResponse, MoveRecord, PlayerColor, GameResult } from "@/lib/types";

const CELL_SIZE = 64;
const FILE_LABELS = ["９", "８", "７", "６", "５", "４", "３", "２", "１"];
const RANK_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

interface LegalMove {
  usi: string;
  from?: string;
  to: string;
  promotion?: boolean;
  isDrop?: boolean;
}

function squareToCoords(squareName: string): { file: number; rank: number } | null {
  const match = squareName.match(/^(\d)([a-i])$/);
  if (!match) return null;
  const file = 9 - parseInt(match[1]);
  const rank = match[2].charCodeAt(0) - "a".charCodeAt(0);
  return { file, rank };
}

function coordsToSquare(file: number, rank: number): string {
  const f = 9 - file;
  const r = String.fromCharCode("a".charCodeAt(0) + rank);
  return `${f}${r}`;
}

export default function ShogiBoard() {
  const [board, setBoard] = useState<(BoardCell | null)[][] | null>(null);
  const [hands, setHands] = useState<{ sente: Record<string, number>; gote: Record<string, number> }>({ sente: {}, gote: {} });
  const [turn, setTurn] = useState<PlayerColor>("sente");
  const [userColor, setUserColor] = useState<PlayerColor>("sente");
  const [status, setStatus] = useState<string>("waiting");
  const [isCheck, setIsCheck] = useState(false);
  const [lastMove, setLastMove] = useState<string | undefined>();
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [result, setResult] = useState<GameResult | undefined>();

  const [selectedSquare, setSelectedSquare] = useState<{ file: number; rank: number } | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [showPromotion, setShowPromotion] = useState<{
    from: string;
    to: string;
    promoUsi: string;
    noPromoUsi: string;
  } | null>(null);

  const moveVersionRef = useRef(0);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch("/api/game/board");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      if (data.moveVersion !== undefined && data.moveVersion < moveVersionRef.current) return;
      moveVersionRef.current = data.moveVersion ?? 0;

      setBoard(data.board);
      setHands(data.hands);
      setTurn(data.turn);
      setLastMove(data.lastMove);
      setIsCheck(data.isCheck);
    } catch {
      // ignore polling errors
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/game/status");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      setStatus(data.status);
      setUserColor(data.userColor);
      setResult(data.result);
    } catch {
      // ignore
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/game/history");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setMoveHistory(data.history);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (status === "playing") {
        fetchBoard();
        fetchStatus();
        fetchHistory();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, fetchBoard, fetchStatus, fetchHistory]);

  const startGame = async (color: PlayerColor = "sente") => {
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userColor: color }),
    });
    const data = await res.json();
    if (data.success) {
      setUserColor(color);
      setStatus("playing");
      moveVersionRef.current = -1;
      setMoveHistory([]);
      setResult(undefined);
      setSelectedSquare(null);
      setSelectedDrop(null);
      setLegalMoves([]);
      await fetchBoard();
      await fetchStatus();
    }
  };

  const fetchLegalMovesForSquare = async (squareName: string) => {
    const res = await fetch(`/api/game/legal-moves?square=${squareName}`);
    const data = await res.json();
    if (data.success) {
      setLegalMoves(data.moves);
    }
  };

  const fetchLegalMovesForDrop = async (role: string) => {
    const res = await fetch("/api/game/legal-moves");
    const data = await res.json();
    if (data.success) {
      setLegalMoves(data.moves.filter((m: LegalMove) => m.isDrop && m.usi.startsWith(role[0].toUpperCase())));
    }
  };

  const sendMove = async (usi: string) => {
    const res = await fetch("/api/game/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move: usi, byUser: true }),
    });
    const data = await res.json();
    if (data.success) {
      setSelectedSquare(null);
      setSelectedDrop(null);
      setLegalMoves([]);
      moveVersionRef.current++;
      await fetchBoard();
      await fetchStatus();
      await fetchHistory();
    }
  };

  const handleCellClick = async (file: number, rank: number) => {
    if (status !== "playing" || turn !== userColor) return;

    const clickedSquare = coordsToSquare(file, rank);

    if (selectedDrop) {
      const dropMove = legalMoves.find((m) => m.to === clickedSquare && m.isDrop);
      if (dropMove) {
        await sendMove(dropMove.usi);
      } else {
        setSelectedDrop(null);
        setLegalMoves([]);
      }
      return;
    }

    if (selectedSquare) {
      const selectedSq = coordsToSquare(selectedSquare.file, selectedSquare.rank);

      const matchingMoves = legalMoves.filter((m) => m.from === selectedSq && m.to === clickedSquare);

      if (matchingMoves.length === 0) {
        const piece = board?.[rank]?.[file];
        if (piece && piece.color === userColor) {
          setSelectedSquare({ file, rank });
          await fetchLegalMovesForSquare(coordsToSquare(file, rank));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
        return;
      }

      const promoMove = matchingMoves.find((m) => m.promotion);
      const noPromoMove = matchingMoves.find((m) => !m.promotion);

      if (promoMove && noPromoMove) {
        setShowPromotion({
          from: selectedSq,
          to: clickedSquare,
          promoUsi: promoMove.usi,
          noPromoUsi: noPromoMove.usi,
        });
      } else {
        await sendMove(matchingMoves[0].usi);
      }
      return;
    }

    const piece = board?.[rank]?.[file];
    if (piece && piece.color === userColor) {
      setSelectedSquare({ file, rank });
      await fetchLegalMovesForSquare(clickedSquare);
    }
  };

  const handleDropSelect = async (role: string) => {
    if (status !== "playing" || turn !== userColor) return;
    setSelectedSquare(null);
    if (selectedDrop === role) {
      setSelectedDrop(null);
      setLegalMoves([]);
    } else {
      setSelectedDrop(role);
      await fetchLegalMovesForDrop(role);
    }
  };

  const isLegalTarget = (file: number, rank: number): boolean => {
    const sq = coordsToSquare(file, rank);
    return legalMoves.some((m) => m.to === sq);
  };

  const isLastMoveSquare = (file: number, rank: number): boolean => {
    if (!lastMove) return false;
    const sq = coordsToSquare(file, rank);
    const toMatch = lastMove.match(/(\d[a-i])$/);
    if (toMatch && toMatch[1] === sq) return true;
    const fromMatch = lastMove.match(/^(\d[a-i])/);
    if (fromMatch && fromMatch[1] === sq) return true;
    return false;
  };

  if (status === "waiting" || !board) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: 40,
        }}
      >
        <h1 style={{ fontSize: 32, color: "#f5deb3", fontWeight: "bold" }}>
          AI将棋
        </h1>
        <p style={{ color: "#aaa", fontSize: 16 }}>
          LLMと対局できる将棋アプリ
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            onClick={() => startGame("sente")}
            style={{
              padding: "14px 36px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#2196f3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            先手で開始
          </button>
          <button
            onClick={() => startGame("gote")}
            style={{
              padding: "14px 36px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#ff9800",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            後手で開始
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <CapturedPieces
        pieces={hands.gote}
        color="gote"
        isUserColor={userColor === "gote"}
        onDropSelect={handleDropSelect}
        selectedDrop={userColor === "gote" ? selectedDrop : null}
        canInteract={turn === userColor && userColor === "gote" && status === "playing"}
      />

      <div>
        <div style={{ display: "flex", marginBottom: 4, paddingLeft: 28 }}>
          {FILE_LABELS.map((label, i) => (
            <div
              key={i}
              style={{
                width: CELL_SIZE,
                textAlign: "center",
                fontSize: 14,
                color: "#aaa",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(9, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(9, ${CELL_SIZE}px)`,
              border: "3px solid #8b6914",
              background: "#dcb35c",
            }}
          >
            {board.map((row, rank) =>
              row.map((cell, fileIdx) => {
                const file = fileIdx;
                const isSelected =
                  selectedSquare?.file === file && selectedSquare?.rank === rank;
                const isLegal = isLegalTarget(file, rank);
                const isLast = isLastMoveSquare(file, rank);
                const isCheckSquare =
                  isCheck &&
                  cell?.role === "king" &&
                  cell?.color === turn;

                let bg = "transparent";
                if (isSelected) bg = "rgba(50,180,50,0.35)";
                else if (isCheckSquare) bg = "rgba(220,50,50,0.35)";
                else if (isLast) bg = "rgba(255,200,50,0.25)";

                return (
                  <div
                    key={`${rank}-${file}`}
                    onClick={() => handleCellClick(file, rank)}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      border: "1px solid #b8960e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        status === "playing" && turn === userColor
                          ? "pointer"
                          : "default",
                      background: bg,
                      position: "relative",
                    }}
                  >
                    {cell && <ShogiPiece piece={cell} size={CELL_SIZE - 8} />}
                    {isLegal && !cell && (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "rgba(50,120,220,0.4)",
                        }}
                      />
                    )}
                    {isLegal && cell && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          border: "3px solid rgba(50,120,220,0.6)",
                          borderRadius: 4,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 4,
            }}
          >
            {RANK_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  height: CELL_SIZE,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  color: "#aaa",
                  paddingLeft: 4,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CapturedPieces
        pieces={hands.sente}
        color="sente"
        isUserColor={userColor === "sente"}
        onDropSelect={handleDropSelect}
        selectedDrop={userColor === "sente" ? selectedDrop : null}
        canInteract={turn === userColor && userColor === "sente" && status === "playing"}
      />

      <GameInfo
        moveHistory={moveHistory}
        turn={turn}
        userColor={userColor}
        isCheck={isCheck}
        result={result}
        status={status}
      />

      {showPromotion && (
        <PromotionDialog
          onPromote={async () => {
            await sendMove(showPromotion.promoUsi);
            setShowPromotion(null);
          }}
          onDecline={async () => {
            await sendMove(showPromotion.noPromoUsi);
            setShowPromotion(null);
          }}
        />
      )}
    </div>
  );
}
