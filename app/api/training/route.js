import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const db = createServerClient();

    const { data } = await db
      .from("training_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit);

    return NextResponse.json({ sessions: data || [] });
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

    const { data: cycle } = await db
      .from("cycles")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: userId,
      cycle_id: cycle?.id || null,
      date: body.date || new Date().toISOString().split("T")[0],
      type: body.type,
      exercise: body.exercise,
      sets: body.sets || null,
      duration_minutes: body.duration ? parseFloat(body.duration) : null,
      distance: body.distance ? parseFloat(body.distance) : null,
      notes: body.notes || null,
    };

    const { data, error } = await db
      .from("training_sessions")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Training POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
