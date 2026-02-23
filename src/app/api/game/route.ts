import { NextResponse } from "next/server";
import { gameManager } from "@/lib/game-manager";
import type { PlayerColor } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userColor: PlayerColor = body.userColor === "gote" ? "gote" : "sente";
    const game = gameManager.startGame(userColor);
    return NextResponse.json({
      success: true,
      gameId: game.gameId,
      userColor: game.userColor,
      message: `対局を開始しました。あなたは${userColor === "sente" ? "先手" : "後手"}です。`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const game = gameManager.getGame();
  if (!game) {
    return NextResponse.json(
      { success: false, error: "対局が開始されていません" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, game });
}
