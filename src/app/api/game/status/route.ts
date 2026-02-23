import { NextResponse } from "next/server";
import { gameManager } from "@/lib/game-manager";

export async function GET() {
  const status = gameManager.getGameStatus();
  if (!status) {
    return NextResponse.json(
      { success: false, error: "対局が開始されていません" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, ...status });
}
