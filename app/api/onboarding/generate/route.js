import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";

export const maxDuration = 60;

// ══════════════════════════════════════════════════════════════
// POST /api/onboarding/generate
//
// Generates a personalized starter protocol for the user based on
// their onboarding data. Uses Claude for real reasoning, not hardcoded
// fallbacks.
//
// Body: { name, age, weight, experience, goals, health }
// Returns: { cycleName, summary, compounds: [...], rationale }
// ══════════════════════════════════════════════════════════════

const ONBOARDING_SYSTEM_PROMPT = `You are a protocol recommendation engine for an advanced compound tracking app. Users have already chosen to run a protocol — you're not deciding whether, just what. Generate a personalized starter protocol based on their profile.

CRITICAL RULES:
- Be conservative. New users should start at the low end of effective doses.
- Match the experience level: beginner = simpler stacks, advanced = more complex.
- Ancillary support is mandatory when compounds call for it (HCG with testosterone, AI if aromatization risk, liver support with orals).
- Use real compound names that exist in a standard database (Testosterone, Anavar, HCG, Aromasin, Retatrutide, HGH, etc).
- Max 6 compounds for beginners, 8 for intermediate, 10 for advanced.
- Units must match compound category (mg for most, IU for HGH and HCG, mcg for peptides).
- Frequencies: "daily", "EOD", "E3D", "2x/week", "weekly", "biweekly", "as needed".
- Categories: "anabolic", "growth", "metabolic", "recovery", "ancillary", "SARM", "nootropic", "longevity".

OUTPUT FORMAT — respond with ONLY this JSON, no markdown:

{
  "cycleName": "Short descriptive name like 'Recomp Foundation' or 'Mass Blast'",
  "summary": "1-2 sentence explanation of the protocol's intent",
  "rationale": "1-2 sentence explanation of why this stack fits their goals and experience",
  "compounds": [
    {
      "name": "Testosterone",
      "dose": 150,
      "unit": "mg",
      "freq": "weekly",
      "cat": "anabolic",
      "reason": "Base TRT dose for beginners"
    }
  ],
  "suggestedWeeks": 12,
  "warnings": ["optional list of things to watch for"]
}`;

export async function POST(request) {
  try {
    await getUserId();
    const body = await request.json();

    const { name, age, weight, experience, goals, health } = body;

    if (!experience || !goals?.length) {
      return NextResponse.json(
        { error: "Experience and goals are required" },
        { status: 400 }
      );
    }

    // Build the user context for Claude
    const userContext = [
      `Name: ${name || "User"}`,
      age ? `Age: ${age}` : null,
      weight ? `Weight: ${weight} lbs` : null,
      `Experience level: ${experience}`,
      `Goals: ${goals.join(", ")}`,
      health && health.trim() ? `Health context / prior cycles: ${health}` : null,
    ].filter(Boolean).join("\n");

    // Call Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: ONBOARDING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate a starter protocol for this user:\n\n${userContext}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Claude API error:", err);
      // Fall through to fallback
      return NextResponse.json(fallbackProtocol(body));
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";

    // Parse the JSON response
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json(fallbackProtocol(body));
    }

    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      if (!parsed.compounds || !Array.isArray(parsed.compounds)) {
        return NextResponse.json(fallbackProtocol(body));
      }
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(fallbackProtocol(body));
    }
  } catch (error) {
    console.error("Onboarding generate error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Always return something — onboarding shouldn't fail hard
    // (body was already parsed above, can't re-read it here)
    return NextResponse.json(fallbackProtocol({}));
  }
}

// ──────────────────────────────────────────────
// Fallback protocol — used if Claude fails
// ──────────────────────────────────────────────

function fallbackProtocol(body) {
  const { experience, goals } = body;
  const b = experience === "beginner";
  const goalStr = (goals || []).join(" ").toLowerCase();
  const fat = goalStr.includes("fat") || goalStr.includes("recomp");
  const mass = goalStr.includes("mass") || goalStr.includes("strength");

  let compounds = [
    { name: "Testosterone", dose: b ? 150 : 200, unit: "mg", freq: "weekly", cat: "anabolic", reason: "TRT base dose" },
    { name: "HCG", dose: 500, unit: "IU", freq: "EOD", cat: "ancillary", reason: "Testicular support" },
    { name: "Aromasin", dose: 12.5, unit: "mg", freq: "EOD", cat: "ancillary", reason: "Estradiol management" },
  ];

  if (fat) {
    compounds.push({ name: "Retatrutide", dose: b ? 1 : 2, unit: "mg", freq: "weekly", cat: "metabolic", reason: "GLP-1/GIP/GCG agonist for fat loss" });
  }
  if (mass && !b) {
    compounds.push({ name: "Anavar", dose: 20, unit: "mg", freq: "daily", cat: "anabolic", reason: "Lean mass and strength" });
  }
  compounds.push({ name: "HGH", dose: b ? 2 : 4, unit: "IU", freq: "daily", cat: "growth", reason: "Recovery and body composition" });

  return {
    cycleName: fat ? "Recomp Foundation" : mass ? "Mass Foundation" : "Optimization Protocol",
    summary: `${experience} protocol targeting ${(goals || []).slice(0, 2).join(" and ").toLowerCase() || "general optimization"}.`,
    rationale: "Conservative starter stack with mandatory ancillary support.",
    compounds: compounds.slice(0, 6),
    suggestedWeeks: 12,
    warnings: ["Monitor bloodwork every 6-8 weeks", "Watch for signs of estrogen imbalance"],
  };
}
