import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { computeUserState } from "@/lib/state";

// GET /api/state — returns the live computed user state
export async function GET() {
  try {
    const userId = await getUserId();
    const state = await computeUserState(userId);
    return NextResponse.json(state);
  } catch (error) {
    console.error("State error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to compute state" }, { status: 500 });
  }
}
