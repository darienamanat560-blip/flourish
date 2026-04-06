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
