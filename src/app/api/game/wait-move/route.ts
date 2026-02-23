import { NextResponse } from "next/server";
import { gameManager } from "@/lib/game-manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeoutMs = parseInt(searchParams.get("timeout_ms") ?? "300000", 10);
  const clampedTimeout = Math.min(Math.max(timeoutMs, 5000), 600000);

  const result = await gameManager.waitForUserMove(clampedTimeout);
  return NextResponse.json({ success: true, ...result });
}
