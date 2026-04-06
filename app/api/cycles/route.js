import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const { data } = await db
      .from("cycles")
      .select("*, cycle_compounds(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return NextResponse.json({ cycles: data || [] });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = createServerClient();

    // Deactivate other active cycles if this is being created as active
    if (body.status === "active" || !body.status) {
      await db
        .from("cycles")
        .update({ status: "completed" })
        .eq("user_id", userId)
        .eq("status", "active");
    }

    // Create cycle
    const { data: cycle, error } = await db
      .from("cycles")
      .insert({
        user_id: userId,
        name: body.name || "New Cycle",
        status: body.status || "active",
        goals: body.goals || [],
        start_date: body.startDate || new Date().toISOString().split("T")[0],
        planned_weeks: body.weeks || 12,
        notes: body.notes,
        ai_generated: body.aiGenerated || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Add compounds if provided
    if (Array.isArray(body.compounds) && body.compounds.length) {
      const compoundRows = body.compounds.map(c => ({
        cycle_id: cycle.id,
        user_id: userId,
        name: c.name,
        dose: parseFloat(c.dose) || 0,
        unit: c.unit || "mg",
        frequency: c.frequency || c.freq || "daily",
        category: c.category || c.cat,
        status: c.status || "active",
        titration: c.titration || [{ week: 1, dose: parseFloat(c.dose) || 0 }],
      }));
      await db.from("cycle_compounds").insert(compoundRows);
    }

    // Return the cycle with its compounds
    const { data: full } = await db
      .from("cycles")
      .select("*, cycle_compounds(*)")
      .eq("id", cycle.id)
      .single();

    return NextResponse.json({ cycle: full });
  } catch (error) {
    console.error("Cycle POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 });
  }
}
