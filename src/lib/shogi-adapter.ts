import { initialSfen, makeSfen, parseSfen } from "shogiops/sfen";
import type { Position } from "shogiops/variant/position";
import { parseUsi, makeUsi, makeSquareName, isDrop, squareFile, squareRank } from "shogiops/util";
import type { Color, MoveOrDrop, Role, Square } from "shogiops/types";
import type { BoardCell, LegalMovesResponse } from "./types";

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

const FILE_KANJI = ["１", "２", "３", "４", "５", "６", "７", "８", "９"];
const RANK_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const HAND_ROLES: Role[] = ["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"];

function roleToKanji(role: string): string {
  return ROLE_TO_KANJI[role] ?? role;
}

function formatHandPieces(pos: Position, color: Color): string {
  const hand = pos.hands.color(color);
  const pieces: string[] = [];
  const numKanji = ["", "", "二", "三", "四", "五", "六", "七", "八", "九", "十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八"];

  for (const role of HAND_ROLES) {
    const count = hand.get(role);
    if (count > 0) {
      pieces.push(roleToKanji(role) + (count > 1 ? numKanji[count] : ""));
    }
  }
  return pieces.length > 0 ? pieces.join(" ") : "なし";
}

export function createInitialPosition(): Position {
  const sfen = initialSfen("standard");
  return parseSfen("standard", sfen).unwrap();
}

export function positionFromSfen(sfen: string): Position {
  return parseSfen("standard", sfen).unwrap();
}

export function positionToSfen(pos: Position): string {
  return makeSfen(pos);
}

export function getBoard9x9(pos: Position): (BoardCell | null)[][] {
  const board: (BoardCell | null)[][] = [];
  for (let rank = 0; rank < 9; rank++) {
    const row: (BoardCell | null)[] = [];
    for (let file = 8; file >= 0; file--) {
      const square = file + rank * 16;
      const piece = pos.board.get(square);
      if (piece) {
        row.push({ role: piece.role, color: piece.color });
      } else {
        row.push(null);
      }
    }
    board.push(row);
  }
  return board;
}

export function getHandPieces(pos: Position): {
  sente: Record<string, number>;
  gote: Record<string, number>;
} {
  const result: { sente: Record<string, number>; gote: Record<string, number> } = {
    sente: {},
    gote: {},
  };
  for (const color of ["sente", "gote"] as Color[]) {
    const hand = pos.hands.color(color);
    for (const role of HAND_ROLES) {
      const count = hand.get(role);
      if (count > 0) {
        result[color][role] = count;
      }
    }
  }
  return result;
}

export function makeTextBoard(pos: Position): string {
  const lines: string[] = [];
  lines.push(`後手の持ち駒：${formatHandPieces(pos, "gote")}`);
  lines.push("  ９ ８ ７ ６ ５ ４ ３ ２ １");
  lines.push("+---------------------------+");

  for (let rank = 0; rank < 9; rank++) {
    let line = "|";
    for (let file = 8; file >= 0; file--) {
      const square = file + rank * 16;
      const piece = pos.board.get(square);
      if (piece) {
        const prefix = piece.color === "gote" ? "v" : " ";
        line += prefix + roleToKanji(piece.role);
      } else {
        line += " ・";
      }
    }
    line += "|" + RANK_KANJI[rank];
    lines.push(line);
  }

  lines.push("+---------------------------+");
  lines.push(`先手の持ち駒：${formatHandPieces(pos, "sente")}`);
  return lines.join("\n");
}

export function tryPlayMove(pos: Position, usiStr: string): { success: boolean; error?: string } {
  const md = parseUsi(usiStr);
  if (!md) return { success: false, error: `無効なUSI形式: ${usiStr}` };

  if (!pos.isLegal(md)) {
    return { success: false, error: `不正な手: ${usiStr}` };
  }

  pos.play(md);
  return { success: true };
}

export function moveToJapanese(pos: Position, usiStr: string): string {
  const md = parseUsi(usiStr);
  if (!md) return usiStr;

  const colorMark = pos.turn === "sente" ? "☗" : "☖";

  if (isDrop(md)) {
    const toFile = squareFile(md.to);
    const toRank = squareRank(md.to);
    return `${colorMark}${FILE_KANJI[toFile]}${RANK_KANJI[toRank]}${roleToKanji(md.role)}打`;
  }

  const piece = pos.board.get(md.from);
  if (!piece) return usiStr;

  const toFile = squareFile(md.to);
  const toRank = squareRank(md.to);
  const promote = md.promotion ? "成" : "";

  return `${colorMark}${FILE_KANJI[toFile]}${RANK_KANJI[toRank]}${roleToKanji(piece.role)}${promote}`;
}

export function getLegalMoves(pos: Position, squareFilter?: string): LegalMovesResponse {
  const moves: LegalMovesResponse["moves"] = [];
  const ctx = pos.ctx();

  const allMoves = pos.allMoveDests(ctx);
  for (const [fromSq, dests] of allMoves) {
    const fromName = makeSquareName(fromSq);
    if (squareFilter && fromName !== squareFilter) continue;

    const piece = pos.board.get(fromSq);
    if (!piece) continue;

    for (const toSq of dests) {
      const toName = makeSquareName(toSq);
      const baseMove: MoveOrDrop = { from: fromSq, to: toSq };

      if (pos.isLegal(baseMove)) {
        const usi = makeUsi(baseMove);
        moves.push({
          usi,
          japanese: moveToJapanese(pos, usi),
          from: fromName,
          to: toName,
        });
      }

      const promoMove: MoveOrDrop = { from: fromSq, to: toSq, promotion: true };
      if (pos.isLegal(promoMove)) {
        const usi = makeUsi(promoMove);
        moves.push({
          usi,
          japanese: moveToJapanese(pos, usi),
          from: fromName,
          to: toName,
          promotion: true,
        });
      }
    }
  }

  if (!squareFilter) {
    const allDrops = pos.allDropDests(ctx);
    for (const [pieceName, dests] of allDrops) {
      const role = pieceName.split(" ")[1] as Role;
      for (const toSq of dests) {
        const dropMove: MoveOrDrop = { role, to: toSq };
        if (pos.isLegal(dropMove)) {
          const usi = makeUsi(dropMove);
          const toName = makeSquareName(toSq);
          moves.push({
            usi,
            japanese: moveToJapanese(pos, usi),
            to: toName,
            isDrop: true,
          });
        }
      }
    }
  }

  return { moves };
}

export function getSquareFromCoords(file: number, rank: number): number {
  return file + rank * 16;
}
