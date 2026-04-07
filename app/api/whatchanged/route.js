import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getChangesBetween, getChangesSinceLastBloodwork } from "@/lib/whatchanged";

// GET /api/whatchanged?from=2025-01-01&to=2025-03-01
// GET /api/whatchanged?since=lastBloodwork
export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (since === "lastBloodwork") {
      const result = await getChangesSinceLastBloodwork(userId);
      return NextResponse.json(result);
    }

    if (!from || !to) {
      return NextResponse.json(
        { error: "Provide ?from=date&to=date or ?since=lastBloodwork" },
        { status: 400 }
      );
    }

    const result = await getChangesBetween(userId, from, to);
    return NextResponse.json(result);
  } catch (error) {
    console.error("What changed error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
