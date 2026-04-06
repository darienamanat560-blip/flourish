import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { extractFromLog } from "@/lib/memory";

export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const db = createServerClient();

    const { data } = await db
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit);

    return NextResponse.json({ logs: data || [] });
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

    // Find active cycle
    const { data: cycle } = await db
      .from("cycles")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: userId,
      cycle_id: cycle?.id || null,
      date: body.date || new Date().toISOString().split("T")[0],
      weight: body.weight ? parseFloat(body.weight) : null,
      sleep_score: body.sleep ? parseFloat(body.sleep) : null,
      hrv: body.hrv ? parseFloat(body.hrv) : null,
      mood: body.mood ? parseInt(body.mood) : null,
      stress: body.stress ? parseInt(body.stress) : null,
      appetite: body.appetite ? parseInt(body.appetite) : null,
      energy: body.energy ? parseInt(body.energy) : null,
      doses: body.doses || {},
      side_effects: body.sideEffects || null,
      physique_notes: body.physique || body.physiqueNotes || null,
      general_notes: body.notes || body.generalNotes || null,
    };

    // Upsert on (user_id, date) — replaces existing log for same day
    const { data, error } = await db
      .from("daily_logs")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();

    if (error) throw error;

    // Extract patterns from notes (async, non-blocking)
    extractFromLog(userId, data).catch(err => console.error("Log extraction failed:", err));

    return NextResponse.json({ log: data });
  } catch (error) {
    console.error("Log POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}
