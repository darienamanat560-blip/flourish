import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { computeUserState } from "@/lib/state";

export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();

    const [
      profileResult,
      cycleResult,
      logsResult,
      trainingResult,
      prsResult,
      alertsResult,
      insightsResult,
      memoryResult,
      allCyclesResult,
      panelsResult,
      symptomsResult,
      remindersResult,
    ] = await Promise.all([
      db.from("profiles").select("*").eq("id", userId).single(),
      db.from("cycles").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("daily_logs").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30),
      db.from("training_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(20),
      db.from("lift_prs").select("exercise, estimated_1rm, date, active_compounds").eq("user_id", userId),
      db.from("alerts").select("*").eq("user_id", userId).eq("active", true).order("created_at", { ascending: false }).limit(10),
      db.from("insights").select("*").eq("user_id", userId).eq("dismissed", false).order("created_at", { ascending: false }).limit(10),
      db.from("agent_memory").select("id, category, content, confidence, source_type, last_confirmed_at").eq("user_id", userId).eq("active", true).order("confidence", { ascending: false }).limit(100),
      db.from("cycles").select("id, name, status, goals, start_date, planned_weeks").eq("user_id", userId).order("created_at", { ascending: false }),
      db.from("blood_panels").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(10),
      db.from("symptoms").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(14),
      db.from("reminders").select("*").eq("user_id", userId).eq("active", true).is("dismissed_at", null).is("completed_at", null).order("priority", { ascending: true }).limit(10),
    ]);

    // Active compounds
    let compounds = [];
    if (cycleResult.data?.id) {
      const { data } = await db.from("cycle_compounds").select("*").eq("cycle_id", cycleResult.data.id).order("created_at", { ascending: true });
      compounds = data || [];
    }

    // Markers for recent panels
    let panels = panelsResult.data || [];
    if (panels.length > 0) {
      const { data: allMarkers } = await db.from("blood_panel_markers").select("*").in("blood_panel_id", panels.map(p => p.id));
      const byPanel = {};
      (allMarkers || []).forEach(m => {
        if (!byPanel[m.blood_panel_id]) byPanel[m.blood_panel_id] = [];
        byPanel[m.blood_panel_id].push(m);
      });
      panels = panels.map(p => ({ ...p, markers: byPanel[p.id] || [] }));
    }

    // Group memory by category
    const memory = memoryResult.data || [];
    const memoryByCategory = {};
    memory.forEach(m => {
      if (!memoryByCategory[m.category]) memoryByCategory[m.category] = [];
      memoryByCategory[m.category].push(m);
    });

    // Compute state (only if onboarded)
    let state = null;
    if (profileResult.data?.onboarded) {
      try {
        state = await computeUserState(userId);
      } catch (err) {
        console.error("State compute error:", err);
      }
    }

    return NextResponse.json({
      profile: profileResult.data || null,
      cycle: cycleResult.data || null,
      cycles: allCyclesResult.data || [],
      compounds,
      logs: logsResult.data || [],
      training: trainingResult.data || [],
      prs: prsResult.data || [],
      alerts: alertsResult.data || [],
      insights: insightsResult.data || [],
      memory,
      memoryByCategory,
      panels,
      symptoms: symptomsResult.data || [],
      reminders: remindersResult.data || [],
      state,
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
