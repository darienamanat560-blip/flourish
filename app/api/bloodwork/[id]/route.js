import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/bloodwork/[id] — fetch single panel with markers
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = createServerClient();

    const { data: panel } = await db
      .from("blood_panels")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    const { data: markers } = await db
      .from("blood_panel_markers")
      .select("*")
      .eq("blood_panel_id", id)
      .order("display_name");

    return NextResponse.json({ panel: { ...panel, markers: markers || [] } });
  } catch (error) {
    console.error("Bloodwork GET [id] error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/bloodwork/[id]
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = createServerClient();

    const { error } = await db
      .from("blood_panels")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/bloodwork/[id]
// Update panel metadata (date, lab_name, fasting, active_compounds_snapshot)
// and optionally update individual marker values.
//
// Body:
//   { date?, labName?, fasting?, activeCompounds?: string[],
//     markers?: [{ id: uuid, value: number, unit?: string }] }
export async function PATCH(request, { params }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json();
    const db = createServerClient();

    // Update panel fields
    const panelUpdates = {};
    if (body.date !== undefined)             panelUpdates.date = body.date;
    if (body.labName !== undefined)          panelUpdates.lab_name = body.labName;
    if (body.fasting !== undefined)          panelUpdates.fasting = body.fasting;
    if (body.activeCompounds !== undefined)  panelUpdates.active_compounds_snapshot = body.activeCompounds;

    if (Object.keys(panelUpdates).length > 0) {
      const { error } = await db
        .from("blood_panels")
        .update(panelUpdates)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    }

    // Update individual markers if provided
    if (Array.isArray(body.markers) && body.markers.length > 0) {
      for (const m of body.markers) {
        if (!m.id || m.value === undefined) continue;
        const val = parseFloat(m.value);
        if (isNaN(val)) continue;
        const updates = {
          value: val,
          flagged_low: m.refLow !== undefined && m.refLow !== null ? val < m.refLow : undefined,
          flagged_high: m.refHigh !== undefined && m.refHigh !== null ? val > m.refHigh : undefined,
        };
        if (m.unit !== undefined) updates.unit = m.unit;
        // Remove undefined keys
        Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

        await db
          .from("blood_panel_markers")
          .update(updates)
          .eq("id", m.id)
          .eq("user_id", userId);
      }
    }

    // Return the updated panel with markers
    const { data: panel } = await db
      .from("blood_panels")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    const { data: markers } = await db
      .from("blood_panel_markers")
      .select("*")
      .eq("blood_panel_id", id)
      .order("display_name");

    return NextResponse.json({ panel: { ...panel, markers: markers || [] } });
  } catch (error) {
    console.error("Bloodwork PATCH error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update panel" }, { status: 500 });
  }
}
