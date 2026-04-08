import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { normalizeMarker } from "@/lib/markers";

// ══════════════════════════════════════════════════════════════
// GET /api/bloodwork
// List all blood panels for the user, with markers included.
// ══════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();

    const { data: panels } = await db
      .from("blood_panels")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (!panels || panels.length === 0) {
      return NextResponse.json({ panels: [] });
    }

    // Fetch all markers for all panels in one query
    const panelIds = panels.map(p => p.id);
    const { data: allMarkers } = await db
      .from("blood_panel_markers")
      .select("*")
      .in("blood_panel_id", panelIds);

    // Group markers by panel
    const markersByPanel = {};
    (allMarkers || []).forEach(m => {
      if (!markersByPanel[m.blood_panel_id]) markersByPanel[m.blood_panel_id] = [];
      markersByPanel[m.blood_panel_id].push(m);
    });

    const enriched = panels.map(p => ({
      ...p,
      markers: markersByPanel[p.id] || [],
    }));

    return NextResponse.json({ panels: enriched });
  } catch (error) {
    console.error("Bloodwork GET error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch bloodwork" }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════
// POST /api/bloodwork
// Create a new blood panel with markers.
// Used by both the manual entry form and the post-parse confirmation.
//
// Body:
//   {
//     date: "2025-03-15",
//     labName: "Quest Diagnostics",
//     fasting: true,
//     rawData: {...}, // optional, the original parser output
//     markers: [
//       { name: "Total Testosterone", value: 854, unit: "ng/dL", refLow: 264, refHigh: 916 }
//     ]
//   }
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = createServerClient();

    if (!body.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!Array.isArray(body.markers) || body.markers.length === 0) {
      return NextResponse.json({ error: "At least one marker is required" }, { status: 400 });
    }

    // Find active cycle (so we can snapshot active compounds at time of draw)
    const { data: cycle } = await db
      .from("cycles")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let activeCompoundsSnapshot = [];
    if (cycle) {
      const { data: comps } = await db
        .from("cycle_compounds")
        .select("name")
        .eq("cycle_id", cycle.id)
        .eq("status", "active");
      activeCompoundsSnapshot = (comps || []).map(c => c.name);
    }

    // Create the blood panel
    const { data: panel, error: panelError } = await db
      .from("blood_panels")
      .insert({
        user_id: userId,
        cycle_id: cycle?.id || null,
        date: body.date,
        lab_name: body.labName || null,
        fasting: body.fasting !== undefined ? body.fasting : true,
        raw_data: body.rawData || {},
        notes: body.notes || null,
        active_compounds_snapshot: body.activeCompounds || activeCompoundsSnapshot,
      })
      .select()
      .single();

    if (panelError) throw panelError;

    // Normalize and insert markers.
    // Deduplication: if two markers share the same canonical name (e.g. both map
    // to "alt"), only keep the first — later duplicates are likely misidentified.
    // Suspicious: skip markers with values >50x their known refHigh (almost always
    // a different test that got misidentified by the PDF parser or canonicalizer).
    const seenCanonicals = new Set();
    const markerRows = body.markers
      .filter(m => m.name && m.value !== null && m.value !== undefined && !isNaN(parseFloat(m.value)))
      .map(m => {
        const normalized = normalizeMarker(m.name, m.value, m.unit, m.refLow, m.refHigh);
        return { ...normalized, blood_panel_id: panel.id, user_id: userId };
      })
      .filter(m => {
        // Skip suspicious values (misidentified markers)
        if (m.suspicious) {
          console.warn(`Skipping suspicious marker: ${m.rawName} = ${m.value} (refHigh: ${m.refHigh})`);
          return false;
        }
        // Deduplicate by canonical name — keep first occurrence only
        if (seenCanonicals.has(m.canonical)) {
          console.warn(`Skipping duplicate canonical: ${m.canonical} (rawName: ${m.rawName})`);
          return false;
        }
        seenCanonicals.add(m.canonical);
        return true;
      })
      .map(m => ({
          blood_panel_id: m.blood_panel_id,
          user_id: m.user_id,
          marker_name: m.canonical,
          display_name: m.displayName,
          value: m.value,
          unit: m.unit,
          reference_low: m.refLow,
          reference_high: m.refHigh,
          flagged_low: m.refLow !== null && m.value < m.refLow,
          flagged_high: m.refHigh !== null && m.value > m.refHigh,
      }));

    if (markerRows.length > 0) {
      const { error: markerError } = await db
        .from("blood_panel_markers")
        .insert(markerRows);
      if (markerError) throw markerError;
    }

    // Fire-and-forget insights trigger. Requires NEXT_PUBLIC_APP_URL in Vercel env vars.
    // Silently skips if not set — insights still available via manual trigger.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      fetch(`${appUrl}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "bloodwork" }),
      }).catch(() => {});
    }

    return NextResponse.json({
      panel: { ...panel, markers: markerRows },
      markerCount: markerRows.length,
    });
  } catch (error) {
    console.error("Bloodwork POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to save bloodwork" }, { status: 500 });
  }
}
