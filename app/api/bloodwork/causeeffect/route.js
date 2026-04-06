import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { generateCauseEffect } from "@/lib/causeeffect";

// ══════════════════════════════════════════════════════════════
// GET /api/bloodwork/causeeffect?panelId=xxx&previousId=yyy
//
// Compares two blood panels and returns:
//   - which markers changed significantly
//   - what compounds were added/removed in between
//   - plain-language correlations between compound changes and marker changes
//
// If previousId is omitted, compares against the most recent prior panel.
// ══════════════════════════════════════════════════════════════

export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const panelId = searchParams.get("panelId");
    const previousId = searchParams.get("previousId");

    if (!panelId) {
      return NextResponse.json({ error: "panelId is required" }, { status: 400 });
    }

    const analysis = await generateCauseEffect(userId, panelId, previousId);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Cause/effect error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
