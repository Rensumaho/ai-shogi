import { NextResponse } from "next/server";
import { gameManager } from "@/lib/game-manager";

export async function GET() {
  const game = gameManager.getGame();
  if (!game) {
    return NextResponse.json(
      { success: false, error: "対局が開始されていません" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    success: true,
    history: gameManager.getMoveHistory(),
  });
}
