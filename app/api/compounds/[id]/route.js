import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// PATCH /api/compounds/[id] — update a compound
export async function PATCH(request, { params }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json();
    const db = createServerClient();

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.dose !== undefined) updates.dose = parseFloat(body.dose);
    if (body.unit !== undefined) updates.unit = body.unit;
    if (body.frequency !== undefined) updates.frequency = body.frequency;
    if (body.category !== undefined) updates.category = body.category;
    if (body.status !== undefined) updates.status = body.status;
    if (body.titration !== undefined) updates.titration = body.titration;

    const { data, error } = await db
      .from("cycle_compounds")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ compound: data });
  } catch (error) {
    console.error("Compound PATCH error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/compounds/[id]
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = createServerClient();

    const { error } = await db
      .from("cycle_compounds")
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
