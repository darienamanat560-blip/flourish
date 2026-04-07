import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// GET /api/timeline
//
// Returns a unified chronological feed of all protocol events.
// This is the "story" view — labs, compounds, PRs, symptoms all
// on one timeline.
// ══════════════════════════════════════════════════════════════

export async function GET(request) {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Fetch everything in parallel
    const [cyclesResult, compoundsResult, panelsResult, trainingResult, symptomsResult, logsResult] = await Promise.all([
      db.from("cycles").select("id, name, start_date, goals, planned_weeks, status, created_at").eq("user_id", userId),
      db.from("cycle_compounds").select("id, name, dose, unit, frequency, status, category, created_at, updated_at").eq("user_id", userId),
      db.from("blood_panels").select("id, date, lab_name, active_compounds_snapshot").eq("user_id", userId),
      db.from("training_sessions").select("id, date, type, exercise, estimated_1rm, is_pr, active_compounds").eq("user_id", userId).eq("is_pr", true),
      db.from("symptoms").select("id, date, libido, energy, mood, sleep_quality, pumps, notes").eq("user_id", userId),
      db.from("daily_logs").select("id, date, weight, side_effects, physique_notes").eq("user_id", userId).or("side_effects.not.is.null,physique_notes.not.is.null"),
    ]);

    const events = [];

    // ── Cycle starts ──
    (cyclesResult.data || []).forEach(c => {
      events.push({
        type: "cycle_start",
        date: c.start_date || c.created_at.split("T")[0],
        title: `Started cycle: ${c.name}`,
        detail: `Goals: ${(c.goals || []).join(", ") || "none set"} · ${c.planned_weeks || 12} week plan`,
        icon: "cycle",
        color: "teal",
        data: { cycleId: c.id, goals: c.goals, weeks: c.planned_weeks },
      });
    });

    // ── Compound additions ──
    (compoundsResult.data || []).forEach(c => {
      const date = (c.created_at || "").split("T")[0];
      if (date) {
        events.push({
          type: "compound_added",
          date,
          title: `Added ${c.name}`,
          detail: `${c.dose} ${c.unit} ${c.frequency} · ${c.category}`,
          icon: "plus",
          color: "teal",
          data: { compoundId: c.id, name: c.name, dose: c.dose, unit: c.unit },
        });
      }
      // If status changed away from active, that's a "removed" event
      if (c.status !== "active" && c.updated_at && c.updated_at !== c.created_at) {
        events.push({
          type: "compound_removed",
          date: (c.updated_at || "").split("T")[0],
          title: `Stopped ${c.name}`,
          detail: `Was ${c.dose} ${c.unit} ${c.frequency}`,
          icon: "minus",
          color: "red",
          data: { compoundId: c.id, name: c.name },
        });
      }
    });

    // ── Blood panels ──
    (panelsResult.data || []).forEach(p => {
      const onCompounds = (p.active_compounds_snapshot || []).slice(0, 3).join(", ");
      events.push({
        type: "bloodwork",
        date: p.date,
        title: "Blood panel",
        detail: p.lab_name ? `${p.lab_name}${onCompounds ? ` · On: ${onCompounds}` : ""}` : (onCompounds ? `On: ${onCompounds}` : "Lab draw"),
        icon: "droplet",
        color: "blue",
        data: { panelId: p.id },
      });
    });

    // ── Training PRs ──
    (trainingResult.data || []).forEach(t => {
      events.push({
        type: "pr",
        date: t.date,
        title: `New PR: ${t.exercise}`,
        detail: `Est. 1RM: ${Math.round(t.estimated_1rm || 0)} lbs`,
        icon: "trophy",
        color: "teal",
        data: { trainingId: t.id, exercise: t.exercise, onCompounds: t.active_compounds },
      });
    });

    // ── Notable symptoms (side effects or physique notes from daily logs) ──
    (logsResult.data || []).forEach(l => {
      if (l.side_effects && l.side_effects.trim()) {
        events.push({
          type: "side_effect",
          date: l.date,
          title: "Side effects noted",
          detail: l.side_effects,
          icon: "alert",
          color: "yellow",
          data: { logId: l.id },
        });
      }
      if (l.physique_notes && l.physique_notes.trim()) {
        events.push({
          type: "note",
          date: l.date,
          title: "Physique note",
          detail: l.physique_notes.slice(0, 120) + (l.physique_notes.length > 120 ? "..." : ""),
          icon: "note",
          color: "teal",
          data: { logId: l.id },
        });
      }
    });

    // Sort by date descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({
      events: events.slice(0, limit),
      total: events.length,
    });
  } catch (error) {
    console.error("Timeline error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
