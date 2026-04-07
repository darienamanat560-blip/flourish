import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { generateReminders } from "@/lib/reminders";

// GET /api/reminders — list active reminders
export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const { data } = await db
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .is("dismissed_at", null)
      .is("completed_at", null)
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false });
    return NextResponse.json({ reminders: data || [] });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/reminders — regenerate reminders from current state
export async function POST() {
  try {
    const userId = await getUserId();
    const result = await generateReminders(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reminders POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to generate reminders" }, { status: 500 });
  }
}

// PATCH /api/reminders?id=xxx&action=dismiss|complete
export async function PATCH(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action") || "dismiss";

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = createServerClient();
    const updates = action === "complete"
      ? { completed_at: new Date().toISOString() }
      : { dismissed_at: new Date().toISOString() };

    const { error } = await db
      .from("reminders")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
