import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/symptoms?limit=30
export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const db = createServerClient();

    const { data } = await db
      .from("symptoms")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit);

    return NextResponse.json({ symptoms: data || [] });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/symptoms — upsert daily symptom entry
export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = createServerClient();

    // Snapshot active compounds
    const { data: compounds } = await db
      .from("cycle_compounds")
      .select("name")
      .eq("user_id", userId)
      .eq("status", "active");

    const payload = {
      user_id: userId,
      date: body.date || new Date().toISOString().split("T")[0],
      libido: body.libido || null,
      energy: body.energy || null,
      mood: body.mood || null,
      sleep_quality: body.sleepQuality || body.sleep_quality || null,
      pumps: body.pumps || null,
      appetite: body.appetite || null,
      motivation: body.motivation || null,
      aggression: body.aggression || null,
      anxiety: body.anxiety || null,
      headaches: body.headaches || false,
      joint_pain: body.jointPain || body.joint_pain || false,
      acne: body.acne || false,
      bloating: body.bloating || false,
      night_sweats: body.nightSweats || body.night_sweats || false,
      insomnia: body.insomnia || false,
      hair_loss: body.hairLoss || body.hair_loss || false,
      gyno_symptoms: body.gynoSymptoms || body.gyno_symptoms || false,
      notes: body.notes || null,
      active_compounds_snapshot: (compounds || []).map(c => c.name),
    };

    const { data, error } = await db
      .from("symptoms")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ symptom: data });
  } catch (error) {
    console.error("Symptoms POST error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
