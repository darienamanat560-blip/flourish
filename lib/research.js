// ══════════════════════════════════════════════════════════════
// COMPOUND RESEARCH ENGINE
//
// When a user adds a compound that doesn't exist in the database,
// we use Claude to generate a complete structured profile:
//   - Category, subcategory
//   - Mechanism of action
//   - Typical dosing (beginner / intermediate / advanced)
//   - Half-life and administration routes
//   - Common effects
//   - Risks and contraindications
//   - Bloodwork marker effects (used by the cause/effect engine)
//   - Common stacks
//
// Output is structured JSON ready to insert into compound_database.
// ══════════════════════════════════════════════════════════════

const RESEARCH_SYSTEM_PROMPT = `You are a compound research assistant for a personal performance tracking app. Users add compounds (peptides, anabolics, SARMs, nootropics, OTC supplements, prescription medications, herbs, etc.) and you generate a complete structured profile.

CRITICAL RULES:
- Be factual and conservative. If something is not well-studied, say so.
- Never recommend using something. You're describing what it is, not endorsing it.
- For prescription drugs, note that they require medical supervision.
- For research chemicals or experimental compounds, note the limited human data.
- Always include risks honestly.
- Marker effects must use the canonical marker names from this list ONLY:
  total_testosterone, free_testosterone, estradiol, shbg, lh, fsh, prolactin, dht, igf_1,
  total_cholesterol, hdl, ldl, triglycerides, vldl,
  hematocrit, hemoglobin, rbc, wbc, platelets,
  alt, ast, alkaline_phosphatase, bilirubin_total, ggt,
  creatinine, bun, egfr, cystatin_c,
  tsh, free_t3, free_t4, reverse_t3,
  glucose, hba1c, insulin,
  hs_crp, homocysteine,
  vitamin_d, ferritin, vitamin_b12,
  sodium, potassium

- For each marker effect, use one of: "increases", "decreases", "suppresses", "no_effect", "variable"

OUTPUT FORMAT — respond with ONLY this JSON, no markdown, no preamble:

{
  "name": "Canonical name (clean spelling)",
  "category": "anabolic|peptide|sarm|nootropic|supplement|pharmaceutical|hormone|hormone_precursor|stimulant|other",
  "subcategory": "more specific classification or null",
  "description": "1-2 sentence overview of what it is and why people use it",
  "mechanism": "1-2 sentence scientific mechanism of action",
  "typicalDoses": {
    "beginner": 5,
    "intermediate": 10,
    "advanced": 20,
    "unit": "mg"
  },
  "defaultFreq": "daily|EOD|weekly|2x/week|as needed",
  "halfLife": "approximate half-life as a string, or null",
  "administrationRoutes": ["oral", "subq", "im", "topical", "intranasal", "sublingual"],
  "commonEffects": ["bullet point of expected effect", "another effect"],
  "risks": ["specific risk or side effect", "another risk"],
  "markerEffects": {
    "marker_canonical_name": "increases|decreases|suppresses|variable",
    "another_marker": "decreases"
  },
  "stacksWith": ["Compound Name", "Another Compound"],
  "notes": "Optional caveats, context, or important warnings",
  "confidence": "high|medium|low"
}

If you genuinely don't recognize the compound and cannot find reliable information, respond with:
{ "error": "unknown_compound", "name": "<the name they typed>" }`;

// ──────────────────────────────────────────────
// RESEARCH A NEW COMPOUND
// ──────────────────────────────────────────────

export async function researchCompound(name) {
  if (!name?.trim()) throw new Error("Compound name required");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: RESEARCH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a complete profile for: ${name.trim()}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "";

  // Strip code fences if present
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Could not parse research response");
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }

  // If Claude rejected the compound as unknown
  if (parsed.error === "unknown_compound") {
    return { error: "unknown_compound", name: parsed.name };
  }

  // Validate required fields
  if (!parsed.name || !parsed.category) {
    throw new Error("Incomplete profile generated");
  }

  return parsed;
}

// ──────────────────────────────────────────────
// CONVERT RESEARCH RESULT → DATABASE ROW
// ──────────────────────────────────────────────

export function researchToDbRow(profile, userId, modelVersion = "claude-sonnet-4-20250514") {
  const typicalDoses = profile.typicalDoses || {};
  const defaultDose = typicalDoses.intermediate || typicalDoses.beginner || 0;
  const unit = typicalDoses.unit || "mg";

  return {
    name: profile.name,
    category: profile.category || "other",
    subcategory: profile.subcategory || null,
    default_dose: defaultDose,
    unit: unit,
    default_freq: profile.defaultFreq || "daily",
    description: profile.description || "",
    mechanism: profile.mechanism || null,
    common_effects: profile.commonEffects || [],
    risks: profile.risks || [],
    marker_effects: profile.markerEffects || {},
    typical_doses: typicalDoses,
    half_life: profile.halfLife || null,
    administration_routes: profile.administrationRoutes || [],
    stacks_with: profile.stacksWith || [],
    source: "community",
    created_by_user_id: userId,
    generation_metadata: {
      model: modelVersion,
      generated_at: new Date().toISOString(),
      confidence: profile.confidence || "medium",
      notes: profile.notes || null,
    },
  };
}
