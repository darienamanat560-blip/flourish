import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = createServerClient();
    const { error } = await db.from("daily_logs").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
