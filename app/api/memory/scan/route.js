import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { detectLogPatterns } from "@/lib/memory";

// ══════════════════════════════════════════════════════════════
// POST /api/memory/scan
// Runs pattern detection across the user's recent logs and
// extracts any new recurring themes as memories.
// ══════════════════════════════════════════════════════════════

export async function POST() {
  try {
    const userId = await getUserId();
    const patterns = await detectLogPatterns(userId);
    return NextResponse.json({
      success: true,
      patternsFound: patterns.length,
      patterns,
    });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Memory scan error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
