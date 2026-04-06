import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// GET /api/compounds/search?q=anavar
//
// Searches compound_database with case-insensitive substring matching.
// Returns ranked results sorted by:
//   1. Exact name match
//   2. Starts with query
//   3. Contains query
//   4. Verified before community
//   5. Most-used first
// ══════════════════════════════════════════════════════════════

export async function GET(request) {
  try {
    await getUserId(); // require auth
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "12");
    const includeOnly = searchParams.get("source"); // optional filter: "verified" | "community"

    const db = createServerClient();

    // If no query, return most popular compounds
    if (!query) {
      let q = db
        .from("compound_database")
        .select("id, name, category, subcategory, default_dose, unit, default_freq, description, source, times_used")
        .order("times_used", { ascending: false })
        .order("name", { ascending: true })
        .limit(limit);

      if (includeOnly) q = q.eq("source", includeOnly);

      const { data } = await q;
      return NextResponse.json({ results: data || [], query: "" });
    }

    // Substring search via ilike
    let q = db
      .from("compound_database")
      .select("id, name, category, subcategory, default_dose, unit, default_freq, description, source, times_used")
      .ilike("name", `%${query}%`)
      .limit(limit * 3); // overfetch then sort/trim client-side

    if (includeOnly) q = q.eq("source", includeOnly);

    const { data } = await q;
    if (!data || data.length === 0) {
      return NextResponse.json({ results: [], query, suggestResearch: true });
    }

    // Rank results
    const ranked = data
      .map(c => {
        const lower = c.name.toLowerCase();
        let score = 0;
        if (lower === query) score += 1000;
        if (lower.startsWith(query)) score += 500;
        if (lower.includes(query)) score += 100;
        if (c.source === "verified") score += 50;
        score += Math.min(c.times_used || 0, 100);
        return { ...c, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      results: ranked,
      query,
      // If no exact match, suggest user can research a new compound
      suggestResearch: !ranked.some(r => r.name.toLowerCase() === query),
    });
  } catch (error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
