import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// GET /api/bloodwork/timeline?marker=hdl
// Returns all values of a specific marker across all panels,
// sorted by date. Used for the trend graphs.
// ══════════════════════════════════════════════════════════════

export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const marker = searchParams.get("marker");
    const db = createServerClient();

    if (marker) {
      // Single marker timeline
      const { data: markerRows } = await db
        .from("blood_panel_markers")
        .select("*, blood_panels!inner(date, active_compounds_snapshot)")
        .eq("user_id", userId)
        .eq("marker_name", marker)
        .order("blood_panels(date)", { ascending: true });

      const timeline = (markerRows || []).map(m => ({
        date: m.blood_panels.date,
        value: m.value,
        unit: m.unit,
        refLow: m.reference_low,
        refHigh: m.reference_high,
        flaggedLow: m.flagged_low,
        flaggedHigh: m.flagged_high,
        compounds: m.blood_panels.active_compounds_snapshot || [],
      }));

      return NextResponse.json({ marker, timeline });
    }

    // No marker specified — return summary of all markers (latest value per marker)
    const { data: panels } = await db
      .from("blood_panels")
      .select("id, date")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (!panels || panels.length === 0) {
      return NextResponse.json({ markers: [] });
    }

    const { data: allMarkers } = await db
      .from("blood_panel_markers")
      .select("*, blood_panels!inner(date)")
      .eq("user_id", userId)
      .order("blood_panels(date)", { ascending: false });

    // Get latest value of each unique marker
    const seen = new Set();
    const latest = [];
    (allMarkers || []).forEach(m => {
      if (seen.has(m.marker_name)) return;
      seen.add(m.marker_name);
      latest.push({
        marker: m.marker_name,
        displayName: m.display_name,
        value: m.value,
        unit: m.unit,
        date: m.blood_panels.date,
        flaggedLow: m.flagged_low,
        flaggedHigh: m.flagged_high,
      });
    });

    return NextResponse.json({ markers: latest });
  } catch (error) {
    console.error("Timeline error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
