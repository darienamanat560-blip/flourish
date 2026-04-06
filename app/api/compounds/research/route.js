import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { researchCompound, researchToDbRow } from "@/lib/research";

// ══════════════════════════════════════════════════════════════
// POST /api/compounds/research
//
// Researches a new compound via Claude. Two modes:
//
// 1. Preview mode (default): { name: "Tongkat Ali", preview: true }
//    Runs research and returns the generated profile WITHOUT saving.
//    User can review and confirm before adding to the database.
//
// 2. Save mode: { name: "Tongkat Ali", profile: {...} }
//    Saves a previously-previewed profile to the database as a
//    community compound. Returns the inserted row.
//
// We do it in two steps so users can edit the AI-generated profile
// before it goes into the shared database.
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const db = createServerClient();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Compound name is required" }, { status: 400 });
    }

    const name = body.name.trim();

    // ── SAVE MODE ──
    if (body.profile) {
      // Check for existing first (race condition guard)
      const { data: existing } = await db
        .from("compound_database")
        .select("id, name, source")
        .ilike("name", name)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          compound: existing,
          alreadyExists: true,
        });
      }

      const row = researchToDbRow(body.profile, userId);

      const { data: inserted, error } = await db
        .from("compound_database")
        .insert(row)
        .select()
        .single();

      if (error) {
        // If it's a duplicate (someone else added it in parallel), fetch it
        if (error.code === "23505") {
          const { data: dup } = await db
            .from("compound_database")
            .select("*")
            .ilike("name", name)
            .maybeSingle();
          return NextResponse.json({ compound: dup, alreadyExists: true });
        }
        throw error;
      }

      return NextResponse.json({
        compound: inserted,
        created: true,
      });
    }

    // ── PREVIEW MODE ──
    // Check if it already exists
    const { data: existing } = await db
      .from("compound_database")
      .select("*")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        compound: existing,
        alreadyExists: true,
      });
    }

    // Research it via Claude
    let profile;
    try {
      profile = await researchCompound(name);
    } catch (err) {
      console.error("Research failed:", err);
      return NextResponse.json(
        { error: "Research failed", detail: err.message },
        { status: 502 }
      );
    }

    if (profile.error === "unknown_compound") {
      return NextResponse.json({
        error: "unknown_compound",
        message: `Could not find reliable information about "${name}". Try a more specific or common name.`,
      }, { status: 404 });
    }

    return NextResponse.json({
      profile,
      preview: true,
    });
  } catch (error) {
    console.error("Research endpoint error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
