import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { extractFromOnboarding } from "@/lib/memory";

export async function GET() {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const { data } = await db.from("profiles").select("*").eq("id", userId).single();
    return NextResponse.json({ profile: data || null });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = createServerClient();

    const payload = {
      id: userId,
      name: body.name,
      age: body.age ? parseInt(body.age) : null,
      weight: body.weight ? parseFloat(body.weight) : null,
      height: body.height,
      body_fat: body.bodyFat ? parseFloat(body.bodyFat) : null,
      experience: body.experience,
      goals: body.goals || [],
      health_conditions: body.health || body.healthConditions,
      sensitivities: body.sensitivities,
      prior_cycles: body.priorCycles,
      onboarded: body.onboarded !== undefined ? body.onboarded : true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("profiles")
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    // Extract initial memories from onboarding data
    if (body.onboarded) {
      extractFromOnboarding(userId, payload).catch(err => console.error("Memory extraction failed:", err));
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile PUT error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
