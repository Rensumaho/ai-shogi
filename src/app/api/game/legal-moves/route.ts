import { NextResponse } from "next/server";
import { gameManager } from "@/lib/game-manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const square = searchParams.get("square") ?? undefined;

  const game = gameManager.getGame();
  if (!game) {
    return NextResponse.json(
      { success: false, error: "対局が開始されていません" },
      { status: 404 }
    );
  }

  const legalMoves = gameManager.getLegalMoves(square);
  return NextResponse.json({ success: true, ...legalMoves });
}
