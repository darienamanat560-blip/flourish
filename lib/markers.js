// ══════════════════════════════════════════════════════════════
// MARKER NORMALIZATION
//
// Different labs use different names for the same marker.
// "Total Testosterone", "TESTOSTERONE TOTAL", "Test Total" — same thing.
// This module canonicalizes them to a standard set.
// ══════════════════════════════════════════════════════════════

// Canonical marker definitions
// Each entry: { canonical: "snake_case_id", display: "Display Name", aliases: [...], unit: "default unit", refLow, refHigh, category, importance }

export const MARKERS = {
  // ── Hormones ──
  total_testosterone: {
    display: "Total Testosterone",
    aliases: ["total testosterone", "testosterone total", "testosterone, total", "testosterone serum", "total t", "test total", "testosterone (total)"],
    unit: "ng/dL",
    refLow: 264, refHigh: 916,
    category: "hormones",
    importance: 10,
  },
  free_testosterone: {
    display: "Free Testosterone",
    aliases: ["free testosterone", "testosterone free", "free t", "testosterone, free", "testosterone (free)"],
    unit: "pg/mL",
    refLow: 47, refHigh: 244,
    category: "hormones",
    importance: 9,
  },
  estradiol: {
    display: "Estradiol",
    aliases: ["estradiol", "e2", "estradiol sensitive", "estradiol, sensitive", "estradiol ultrasensitive"],
    unit: "pg/mL",
    refLow: 15, refHigh: 60,
    category: "hormones",
    importance: 10,
  },
  shbg: {
    display: "SHBG",
    aliases: ["shbg", "sex hormone binding globulin", "sex hormone-binding globulin"],
    unit: "nmol/L",
    refLow: 16.5, refHigh: 55.9,
    category: "hormones",
    importance: 8,
  },
  lh: {
    display: "LH",
    aliases: ["lh", "luteinizing hormone", "lutenizing hormone"],
    unit: "mIU/mL",
    refLow: 1.7, refHigh: 8.6,
    category: "hormones",
    importance: 7,
  },
  fsh: {
    display: "FSH",
    aliases: ["fsh", "follicle stimulating hormone", "follicle-stimulating hormone"],
    unit: "mIU/mL",
    refLow: 1.5, refHigh: 12.4,
    category: "hormones",
    importance: 6,
  },
  prolactin: {
    display: "Prolactin",
    aliases: ["prolactin", "prl"],
    unit: "ng/mL",
    refLow: 4, refHigh: 15.2,
    category: "hormones",
    importance: 6,
  },
  dht: {
    display: "DHT",
    aliases: ["dht", "dihydrotestosterone"],
    unit: "ng/dL",
    refLow: 30, refHigh: 85,
    category: "hormones",
    importance: 6,
  },
  igf_1: {
    display: "IGF-1",
    aliases: ["igf-1", "igf 1", "igf1", "insulin-like growth factor 1", "insulin like growth factor 1", "somatomedin c"],
    unit: "ng/mL",
    refLow: 88, refHigh: 246,
    category: "hormones",
    importance: 9,
  },

  // ── Lipids ──
  total_cholesterol: {
    display: "Total Cholesterol",
    aliases: ["total cholesterol", "cholesterol total", "cholesterol, total", "cholesterol"],  // NOTE: "cholesterol" alone last — more specific aliases above take priority
    unit: "mg/dL",
    refLow: 100, refHigh: 200,
    category: "lipids",
    importance: 8,
  },
  hdl: {
    display: "HDL",
    aliases: ["hdl", "hdl cholesterol", "hdl-c", "hdl cholesterol direct", "high density lipoprotein", "cholesterol hdl", "cholesterol hd", "hdl-cholesterol"],
    unit: "mg/dL",
    refLow: 40, refHigh: 120,
    category: "lipids",
    importance: 10,
  },
  ldl: {
    display: "LDL",
    aliases: ["ldl", "ldl cholesterol", "ldl-c", "ldl chol calc", "ldl cholesterol calc", "low density lipoprotein", "cholesterol ldl", "ldl-cholesterol"],
    unit: "mg/dL",
    refLow: 0, refHigh: 100,
    category: "lipids",
    importance: 10,
  },
  triglycerides: {
    display: "Triglycerides",
    aliases: ["triglycerides", "trig", "triglyceride"],
    unit: "mg/dL",
    refLow: 0, refHigh: 150,
    category: "lipids",
    importance: 8,
  },
  vldl: {
    display: "VLDL",
    aliases: ["vldl", "vldl cholesterol", "vldl-c"],
    unit: "mg/dL",
    refLow: 5, refHigh: 40,
    category: "lipids",
    importance: 5,
  },

  // ── Hematology / CBC ──
  hematocrit: {
    display: "Hematocrit",
    aliases: ["hematocrit", "hct", "hematocrit %"],
    unit: "%",
    refLow: 38.3, refHigh: 48.6,
    category: "hematology",
    importance: 10,
  },
  hemoglobin: {
    display: "Hemoglobin",
    aliases: ["hemoglobin", "hgb", "hb"],
    unit: "g/dL",
    refLow: 13.2, refHigh: 16.6,
    category: "hematology",
    importance: 9,
  },
  rbc: {
    display: "RBC",
    aliases: ["rbc", "red blood cell", "red blood cells", "red blood cell count"],
    unit: "M/uL",
    refLow: 4.35, refHigh: 5.65,
    category: "hematology",
    importance: 7,
  },
  wbc: {
    display: "WBC",
    aliases: ["wbc", "white blood cell", "white blood cells", "white blood cell count"],
    unit: "K/uL",
    refLow: 3.4, refHigh: 10.8,
    category: "hematology",
    importance: 6,
  },
  platelets: {
    display: "Platelets",
    aliases: ["platelets", "plt", "platelet count"],
    unit: "K/uL",
    refLow: 150, refHigh: 450,
    category: "hematology",
    importance: 6,
  },

  // ── Liver ──
  alt: {
    display: "ALT",
    aliases: ["alt", "alanine aminotransferase", "sgpt", "alt (sgpt)", "sgpt (alt)", "alanine transaminase", "alt sgpt"],
    unit: "U/L",
    refLow: 0, refHigh: 44,
    category: "liver",
    importance: 9,
  },
  ast: {
    display: "AST",
    aliases: ["ast", "aspartate aminotransferase", "sgot", "ast (sgot)", "sgot (ast)", "aspartate transaminase", "ast sgot"],
    unit: "U/L",
    refLow: 0, refHigh: 40,
    category: "liver",
    importance: 9,
  },
  alkaline_phosphatase: {
    display: "Alkaline Phosphatase",
    aliases: ["alkaline phosphatase", "alp", "alk phos"],
    unit: "U/L",
    refLow: 39, refHigh: 117,
    category: "liver",
    importance: 5,
  },
  bilirubin_total: {
    display: "Bilirubin (Total)",
    aliases: ["bilirubin total", "total bilirubin", "bilirubin, total", "bilirubin"],
    unit: "mg/dL",
    refLow: 0.0, refHigh: 1.2,
    category: "liver",
    importance: 5,
  },
  ggt: {
    display: "GGT",
    aliases: ["ggt", "gamma-glutamyl transferase", "gamma glutamyl transferase"],
    unit: "U/L",
    refLow: 0, refHigh: 65,
    category: "liver",
    importance: 6,
  },

  // ── Kidney ──
  creatinine: {
    display: "Creatinine",
    aliases: ["creatinine", "creatinine serum", "creatinine, serum"],
    unit: "mg/dL",
    refLow: 0.76, refHigh: 1.27,
    category: "kidney",
    importance: 7,
  },
  bun: {
    display: "BUN",
    aliases: ["bun", "blood urea nitrogen", "urea nitrogen"],
    unit: "mg/dL",
    refLow: 6, refHigh: 24,
    category: "kidney",
    importance: 6,
  },
  egfr: {
    display: "eGFR",
    aliases: ["egfr", "gfr", "estimated gfr", "estimated glomerular filtration rate"],
    unit: "mL/min/1.73m²",
    refLow: 60, refHigh: 999,
    category: "kidney",
    importance: 7,
  },
  cystatin_c: {
    display: "Cystatin C",
    aliases: ["cystatin c", "cystatin-c"],
    unit: "mg/L",
    refLow: 0.55, refHigh: 1.15,
    category: "kidney",
    importance: 5,
  },

  // ── Thyroid ──
  tsh: {
    display: "TSH",
    aliases: ["tsh", "thyroid stimulating hormone", "thyroid-stimulating hormone"],
    unit: "mIU/L",
    refLow: 0.45, refHigh: 4.5,
    category: "thyroid",
    importance: 8,
  },
  free_t3: {
    display: "Free T3",
    aliases: ["free t3", "ft3", "triiodothyronine free", "t3 free"],
    unit: "pg/mL",
    refLow: 2.0, refHigh: 4.4,
    category: "thyroid",
    importance: 7,
  },
  free_t4: {
    display: "Free T4",
    aliases: ["free t4", "ft4", "thyroxine free", "t4 free"],
    unit: "ng/dL",
    refLow: 0.82, refHigh: 1.77,
    category: "thyroid",
    importance: 7,
  },
  reverse_t3: {
    display: "Reverse T3",
    aliases: ["reverse t3", "rt3", "reverse triiodothyronine"],
    unit: "ng/dL",
    refLow: 9.2, refHigh: 24.1,
    category: "thyroid",
    importance: 5,
  },

  // ── Metabolic ──
  glucose: {
    display: "Glucose",
    aliases: ["glucose", "fasting glucose", "glucose serum", "glucose, serum"],
    unit: "mg/dL",
    refLow: 65, refHigh: 99,
    category: "metabolic",
    importance: 7,
  },
  hba1c: {
    display: "HbA1c",
    aliases: ["hba1c", "a1c", "hemoglobin a1c", "glycated hemoglobin"],
    unit: "%",
    refLow: 4.0, refHigh: 5.6,
    category: "metabolic",
    importance: 7,
  },
  insulin: {
    display: "Insulin",
    aliases: ["insulin", "insulin fasting", "fasting insulin"],
    unit: "uIU/mL",
    refLow: 2.6, refHigh: 24.9,
    category: "metabolic",
    importance: 6,
  },

  // ── Inflammation ──
  hs_crp: {
    display: "hs-CRP",
    aliases: ["hs-crp", "hscrp", "high sensitivity crp", "c-reactive protein high sensitivity", "crp high sensitivity"],
    unit: "mg/L",
    refLow: 0, refHigh: 3.0,
    category: "inflammation",
    importance: 6,
  },
  homocysteine: {
    display: "Homocysteine",
    aliases: ["homocysteine"],
    unit: "umol/L",
    refLow: 0, refHigh: 10.4,
    category: "inflammation",
    importance: 5,
  },

  // ── Vitamins / Minerals ──
  vitamin_d: {
    display: "Vitamin D",
    aliases: ["vitamin d", "25-hydroxy vitamin d", "25(oh)d", "vitamin d, 25-hydroxy", "vitamin d 25-oh"],
    unit: "ng/mL",
    refLow: 30, refHigh: 100,
    category: "vitamins",
    importance: 6,
  },
  ferritin: {
    display: "Ferritin",
    aliases: ["ferritin"],
    unit: "ng/mL",
    refLow: 30, refHigh: 400,
    category: "vitamins",
    importance: 5,
  },
  vitamin_b12: {
    display: "Vitamin B12",
    aliases: ["vitamin b12", "b12", "cobalamin"],
    unit: "pg/mL",
    refLow: 232, refHigh: 1245,
    category: "vitamins",
    importance: 5,
  },

  // ── Electrolytes ──
  sodium: {
    display: "Sodium",
    aliases: ["sodium", "na"],
    unit: "mmol/L",
    refLow: 134, refHigh: 144,
    category: "electrolytes",
    importance: 4,
  },
  potassium: {
    display: "Potassium",
    aliases: ["potassium", "k"],
    unit: "mmol/L",
    refLow: 3.5, refHigh: 5.2,
    category: "electrolytes",
    importance: 5,
  },
};

// Build a fast lookup map: alias → canonical
const ALIAS_TO_CANONICAL = {};
Object.entries(MARKERS).forEach(([canonical, def]) => {
  def.aliases.forEach(alias => {
    ALIAS_TO_CANONICAL[normalizeName(alias)] = canonical;
  });
  // The canonical itself is also an alias
  ALIAS_TO_CANONICAL[normalizeName(canonical.replace(/_/g, " "))] = canonical;
});

function normalizeName(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Look up a marker by any name.
//
// IMPORTANT: We use exact and suffix-stripped matching only.
// The old substring fallback ("hdl cholesterol".includes("cholesterol"))
// caused "CHOLESTEROL, HDL" to be stored as total_cholesterol — which then
// produced false deltas in the what-changed comparison. Removed.
export function findCanonical(name) {
  const norm = normalizeName(name);

  // 1. Exact alias match
  if (ALIAS_TO_CANONICAL[norm]) return ALIAS_TO_CANONICAL[norm];

  // 2. Strip common noise words and try again
  const stripped = norm
    .replace(/\b(serum|plasma|level|levels|count|test|reading|value|direct|lc ms|lc|ms|ia|rla|rpa)\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (stripped && ALIAS_TO_CANONICAL[stripped]) return ALIAS_TO_CANONICAL[stripped];

  // 3. Parenthetical alias: "SGOT (AST)" → try both "sgot" and "ast"
  const parenMatch = norm.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    const outside = normalizeName(parenMatch[1]);
    const inside  = normalizeName(parenMatch[2]);
    if (ALIAS_TO_CANONICAL[outside]) return ALIAS_TO_CANONICAL[outside];
    if (ALIAS_TO_CANONICAL[inside])  return ALIAS_TO_CANONICAL[inside];
  }

  return null;
}

// Get marker definition by canonical name
export function getMarkerDef(canonical) {
  return MARKERS[canonical] || null;
}

// Normalize a parsed marker entry from any source
export function normalizeMarker(rawName, value, unit, refLow, refHigh) {
  const canonical = findCanonical(rawName);
  const def = canonical ? MARKERS[canonical] : null;

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Sanity check: if the value is more than 50x the known refHigh, it's almost
  // certainly a misidentified marker (e.g. platelet count mapped to ALT).
  // Mark it suspicious so the UI can warn the user.
  const knownHigh = refHigh ?? def?.refHigh ?? null;
  const suspicious = knownHigh !== null && knownHigh > 0 && numValue > knownHigh * 50;

  return {
    canonical: canonical || normalizeName(rawName).replace(/\s+/g, "_"),
    displayName: def?.display || rawName,
    rawName,
    value: numValue,
    unit: unit || def?.unit || "",
    refLow: refLow ?? def?.refLow ?? null,
    refHigh: knownHigh,
    category: def?.category || "other",
    importance: def?.importance || 0,
    flaggedLow: false,
    flaggedHigh: false,
    suspicious,
  };
}

// Categories in display order
export const CATEGORIES = [
  { id: "hormones", name: "Hormones" },
  { id: "lipids", name: "Lipid Panel" },
  { id: "hematology", name: "CBC / Hematology" },
  { id: "liver", name: "Liver Function" },
  { id: "kidney", name: "Kidney Function" },
  { id: "thyroid", name: "Thyroid" },
  { id: "metabolic", name: "Metabolic" },
  { id: "inflammation", name: "Inflammation" },
  { id: "vitamins", name: "Vitamins / Minerals" },
  { id: "electrolytes", name: "Electrolytes" },
  { id: "other", name: "Other" },
];

// Get all canonical markers in a category, sorted by importance
export function getMarkersInCategory(categoryId) {
  return Object.entries(MARKERS)
    .filter(([_, def]) => def.category === categoryId)
    .sort((a, b) => b[1].importance - a[1].importance)
    .map(([canonical, def]) => ({ canonical, ...def }));
}
