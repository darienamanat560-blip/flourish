import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/compounds — add a compound to a cycle
export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = createServerClient();

    // Find active cycle if not specified
    let cycleId = body.cycleId;
    if (!cycleId) {
      const { data: cycle } = await db
        .from("cycles")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      cycleId = cycle?.id;
    }

    if (!cycleId) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    const dose = parseFloat(body.dose) || 0;
    const { data, error } = await db
      .from("cycle_compounds")
      .insert({
        cycle_id: cycleId,
        user_id: userId,
        name: body.name,
        dose,
        unit: body.unit || "mg",
        frequency: body.frequency || body.freq || "daily",
        category: body.category,
        status: body.status || "active",
        titration: body.titration || [{ week: 1, dose }],
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ compound: data });
  } catch (error) {
    console.error("Compound POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
