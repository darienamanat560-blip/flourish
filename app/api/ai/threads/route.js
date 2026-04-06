import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/ai/threads — list user's chat threads
export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();

    const { data, error } = await db
      .from("chat_threads")
      .select("id, title, active, message_count, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ threads: data });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

// POST /api/ai/threads — create a new thread
export async function POST(request) {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const body = await request.json();

    // Deactivate other threads
    await db
      .from("chat_threads")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("active", true);

    // Create new thread
    const { data, error } = await db
      .from("chat_threads")
      .insert({
        user_id: userId,
        title: body.title || "New conversation",
        active: true,
      })
      .select("id, title")
      .single();

    if (error) throw error;
    return NextResponse.json({ thread: data });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
