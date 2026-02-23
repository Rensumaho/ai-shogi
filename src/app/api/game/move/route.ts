import { NextResponse } from "next/server";
import { gameManager } from "@/lib/game-manager";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { move, byUser } = body;

    if (!move || typeof move !== "string") {
      return NextResponse.json(
        { success: false, error: "moveパラメータ（USI形式）が必要です" },
        { status: 400 }
      );
    }

    const isUser = byUser !== false;
    const result = gameManager.makeMove(move, isUser);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const boardState = gameManager.getBoardState();
    return NextResponse.json({
      success: true,
      moveRecord: result.moveRecord,
      boardState,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
