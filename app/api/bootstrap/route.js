import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// GET /api/bootstrap
//
// Single endpoint the frontend calls on mount to load everything
// it needs for the home page. Much faster than 10 separate fetches.
// ══════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();

    // Fire all queries in parallel
    const [
      profileResult,
      cycleResult,
      compoundsResult,
      logsResult,
      trainingResult,
      prsResult,
      alertsResult,
      insightsResult,
      memoryResult,
      allCyclesResult,
    ] = await Promise.all([
      db.from("profiles").select("*").eq("id", userId).single(),
      db.from("cycles")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Compounds will be fetched after we know the cycle ID
      Promise.resolve({ data: [] }),
      db.from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(30),
      db.from("training_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(20),
      db.from("lift_prs")
        .select("exercise, estimated_1rm, date, active_compounds")
        .eq("user_id", userId),
      db.from("alerts")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(10),
      db.from("insights")
        .select("*")
        .eq("user_id", userId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(10),
      db.from("agent_memory")
        .select("id, category, content, confidence, source_type, last_confirmed_at")
        .eq("user_id", userId)
        .eq("active", true)
        .order("confidence", { ascending: false })
        .limit(100),
      db.from("cycles")
        .select("id, name, status, goals, start_date, planned_weeks")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    // Now fetch compounds for the active cycle
    let compounds = [];
    if (cycleResult.data?.id) {
      const { data } = await db
        .from("cycle_compounds")
        .select("*")
        .eq("cycle_id", cycleResult.data.id)
        .order("created_at", { ascending: true });
      compounds = data || [];
    }

    // Group memory by category
    const memory = memoryResult.data || [];
    const memoryByCategory = {};
    memory.forEach(m => {
      if (!memoryByCategory[m.category]) memoryByCategory[m.category] = [];
      memoryByCategory[m.category].push(m);
    });

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
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
