export type PlayerColor = "sente" | "gote";

export interface GameState {
  gameId: string;
  status: "waiting" | "playing" | "finished";
  sfen: string;
  turn: PlayerColor;
  moveHistory: MoveRecord[];
  userColor: PlayerColor;
  result?: GameResult;
  lastMoveUsi?: string;
}

export interface MoveRecord {
  moveNumber: number;
  usi: string;
  japanese: string;
  color: PlayerColor;
}

export interface GameResult {
  winner?: PlayerColor;
  reason: "checkmate" | "stalemate" | "resign" | "draw" | "repetition";
}

export interface BoardCell {
  role: string;
  color: PlayerColor;
}

export interface BoardApiResponse {
  sfen: string;
  board: (BoardCell | null)[][];
  hands: {
    sente: Record<string, number>;
    gote: Record<string, number>;
  };
  turn: PlayerColor;
  textBoard: string;
  lastMove?: string;
  isCheck: boolean;
}

export interface LegalMovesResponse {
  moves: {
    usi: string;
    japanese: string;
    from?: string;
    to: string;
    promotion?: boolean;
    isDrop?: boolean;
  }[];
}

export interface GameStatusResponse {
  status: "waiting" | "playing" | "finished";
  turn: PlayerColor;
  userColor: PlayerColor;
  moveCount: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  result?: GameResult;
}

export interface WaitMoveResponse {
  status: "moved" | "waiting" | "timeout" | "game_over";
  move?: MoveRecord;
  boardState?: BoardApiResponse;
}
