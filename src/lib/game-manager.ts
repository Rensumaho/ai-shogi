import type {
  GameState,
  MoveRecord,
  BoardApiResponse,
  GameStatusResponse,
  WaitMoveResponse,
  LegalMovesResponse,
  PlayerColor,
  GameResult,
} from "./types";
import {
  createInitialPosition,
  positionFromSfen,
  positionToSfen,
  getBoard9x9,
  getHandPieces,
  makeTextBoard,
  tryPlayMove,
  moveToJapanese,
  getLegalMoves,
} from "./shogi-adapter";
import type { Position } from "shogiops/variant/position";

type WaitResolver = (response: WaitMoveResponse) => void;

class GameManager {
  private game: GameState | null = null;
  private position: Position | null = null;
  private waitResolvers: WaitResolver[] = [];
  private moveVersion = 0;

  startGame(userColor: PlayerColor = "sente"): GameState {
    this.position = createInitialPosition();
    this.game = {
      gameId: crypto.randomUUID(),
      status: "playing",
      sfen: positionToSfen(this.position),
      turn: "sente",
      moveHistory: [],
      userColor,
    };
    this.moveVersion = 0;
    this.waitResolvers = [];
    return this.game;
  }

  getGame(): GameState | null {
    return this.game;
  }

  getBoardState(): BoardApiResponse | null {
    if (!this.game || !this.position) return null;

    return {
      sfen: positionToSfen(this.position),
      board: getBoard9x9(this.position),
      hands: getHandPieces(this.position),
      turn: this.position.turn as PlayerColor,
      textBoard: makeTextBoard(this.position),
      lastMove: this.game.lastMoveUsi,
      isCheck: this.position.isCheck(),
    };
  }

  makeMove(usiStr: string, byUser: boolean): {
    success: boolean;
    error?: string;
    moveRecord?: MoveRecord;
  } {
    if (!this.game || !this.position) {
      return { success: false, error: "対局が開始されていません" };
    }
    if (this.game.status !== "playing") {
      return { success: false, error: "対局は既に終了しています" };
    }

    const expectedColor = byUser ? this.game.userColor : this.otherColor(this.game.userColor);
    if (this.position.turn !== expectedColor) {
      return { success: false, error: "手番ではありません" };
    }

    const japanese = moveToJapanese(this.position, usiStr);
    const result = tryPlayMove(this.position, usiStr);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const moveRecord: MoveRecord = {
      moveNumber: this.game.moveHistory.length + 1,
      usi: usiStr,
      japanese,
      color: expectedColor,
    };

    this.game.moveHistory.push(moveRecord);
    this.game.sfen = positionToSfen(this.position);
    this.game.turn = this.position.turn as PlayerColor;
    this.game.lastMoveUsi = usiStr;
    this.moveVersion++;

    if (this.position.isEnd()) {
      const outcome = this.position.outcome();
      this.game.status = "finished";
      if (outcome) {
        this.game.result = {
          winner: outcome.winner as PlayerColor | undefined,
          reason: outcome.result === "checkmate" ? "checkmate" :
                  outcome.result === "stalemate" ? "stalemate" : "draw",
        };
      }

      this.resolveWaiters({
        status: "game_over",
        move: moveRecord,
        boardState: this.getBoardState()!,
      });
    } else if (byUser) {
      this.resolveWaiters({
        status: "moved",
        move: moveRecord,
        boardState: this.getBoardState()!,
      });
    }

    return { success: true, moveRecord };
  }

  getLegalMoves(square?: string): LegalMovesResponse {
    if (!this.position) return { moves: [] };
    return getLegalMoves(this.position, square);
  }

  getGameStatus(): GameStatusResponse | null {
    if (!this.game || !this.position) return null;

    return {
      status: this.game.status,
      turn: this.position.turn as PlayerColor,
      userColor: this.game.userColor,
      moveCount: this.game.moveHistory.length,
      isCheck: this.position.isCheck(),
      isCheckmate: this.position.isCheckmate(),
      isStalemate: this.position.isStalemate(),
      result: this.game.result,
    };
  }

  getMoveHistory(): MoveRecord[] {
    return this.game?.moveHistory ?? [];
  }

  waitForUserMove(timeoutMs: number = 300000): Promise<WaitMoveResponse> {
    if (!this.game || !this.position) {
      return Promise.resolve({ status: "game_over" });
    }

    if (this.game.status === "finished") {
      return Promise.resolve({
        status: "game_over",
        boardState: this.getBoardState()!,
      });
    }

    if (this.position.turn !== this.game.userColor) {
      return Promise.resolve({ status: "waiting" });
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.waitResolvers.indexOf(resolve);
        if (idx >= 0) this.waitResolvers.splice(idx, 1);
        resolve({ status: "timeout" });
      }, timeoutMs);

      const wrappedResolve: WaitResolver = (response) => {
        clearTimeout(timer);
        resolve(response);
      };

      this.waitResolvers.push(wrappedResolve);
    });
  }

  getMoveVersion(): number {
    return this.moveVersion;
  }

  private resolveWaiters(response: WaitMoveResponse): void {
    const resolvers = this.waitResolvers.splice(0);
    for (const resolver of resolvers) {
      resolver(response);
    }
  }

  private otherColor(color: PlayerColor): PlayerColor {
    return color === "sente" ? "gote" : "sente";
  }
}

const globalForGame = globalThis as unknown as { gameManager?: GameManager };
export const gameManager = globalForGame.gameManager ?? new GameManager();
globalForGame.gameManager = gameManager;
