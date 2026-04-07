import { createServerClient } from "./supabase";

// ══════════════════════════════════════════════════════════════
// STATE ENGINE
//
// Computes the live "User State" — a structured snapshot of where
// the user is right now. This is the foundation for risk scoring,
// smart reminders, decision support, and "what's happening to me?"
// type questions.
//
// The state object contains:
//   - phase: bulking | cutting | recomp | cruise | blast | pct | off | unknown
//   - risk: { lipid, cardiovascular, hepatic, hormonal_volatility }
//   - hormonal: { androgens, estrogens, igf, thyroid }
//   - trend: { weight, mood, sleep, lipids, hematocrit }
//   - concerns: array of active issues with severity
//   - cycle: weeks elapsed, weeks remaining, status
//   - lastBloodwork: date, days_ago, key flagged markers
//
// All fields are computed on-the-fly from existing tables.
// No state is persisted — this is intentional. Always fresh.
// ══════════════════════════════════════════════════════════════

export async function computeUserState(userId) {
  const db = createServerClient();

  // Fetch everything we need in parallel
  const [
    profileResult,
    cycleResult,
    compoundsResult,
    logsResult,
    panelsResult,
    symptomsResult,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).single(),
    db.from("cycles")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("cycle_compounds")
      .select("*, cycles!inner(status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("cycles.status", "active"),
    db.from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),
    db.from("blood_panels")
      .select("*, blood_panel_markers(*)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5),
    db.from("symptoms")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14),
  ]);

  const profile = profileResult.data || {};
  const cycle = cycleResult.data || null;
  const compounds = compoundsResult.data || [];
  const logs = logsResult.data || [];
  const panels = panelsResult.data || [];
  const symptoms = symptomsResult.data || [];
  const latestPanel = panels[0] || null;
  const latestMarkers = latestPanel?.blood_panel_markers || [];

  // Compute each component
  const phase = computePhase(cycle, compounds, profile);
  const risk = computeRisk(latestMarkers, compounds, logs);
  const hormonal = computeHormonalState(latestMarkers, compounds);
  const trend = computeTrends(logs, panels);
  const concerns = computeConcerns(risk, hormonal, trend, latestMarkers, symptoms);
  const cycleInfo = computeCycleInfo(cycle);
  const bloodworkInfo = computeBloodworkInfo(latestPanel, latestMarkers);
  const symptomSummary = computeSymptomSummary(symptoms);

  return {
    computedAt: new Date().toISOString(),
    phase,
    risk,
    hormonal,
    trend,
    concerns,
    cycle: cycleInfo,
    bloodwork: bloodworkInfo,
    symptoms: symptomSummary,
    activeCompounds: compounds.map(c => ({
      name: c.name,
      dose: c.dose,
      unit: c.unit,
      frequency: c.frequency,
      category: c.category,
    })),
  };
}

// ──────────────────────────────────────────────
// PHASE DETECTION
// ──────────────────────────────────────────────

function computePhase(cycle, compounds, profile) {
  if (!cycle) return { name: "off", confidence: "high", reason: "No active cycle" };

  // Check cycle goals first
  const goals = (cycle.goals || []).map(g => g.toLowerCase());
  const hasFatLoss = goals.some(g => g.includes("fat loss") || g.includes("cut"));
  const hasMass = goals.some(g => g.includes("mass") || g.includes("bulk") || g.includes("strength"));
  const hasRecomp = goals.some(g => g.includes("recomp"));

  // Check active compounds for hints
  const compNames = compounds.map(c => c.name.toLowerCase());
  const hasGLP1 = compNames.some(n => ["semaglutide", "tirzepatide", "retatrutide", "ozempic", "mounjaro"].includes(n));
  const hasOrals = compNames.some(n => ["anavar", "winstrol", "dianabol", "turinabol", "superdrol"].includes(n));
  const hasTRTOnly = compNames.length <= 2 && compNames.some(n => n.includes("test"));
  const hasMassBuilders = compNames.some(n => ["dianabol", "trenbolone", "deca", "nandrolone"].includes(n));

  if (hasGLP1 && (hasFatLoss || hasRecomp)) {
    return { name: "cutting", confidence: "high", reason: "GLP-1 agonist + fat loss goal" };
  }
  if (hasMassBuilders && hasMass) {
    return { name: "blast", confidence: "high", reason: "Mass-building compounds + bulk goal" };
  }
  if (hasRecomp || (hasFatLoss && hasMass)) {
    return { name: "recomp", confidence: "medium", reason: "Recomposition goals" };
  }
  if (hasFatLoss) {
    return { name: "cutting", confidence: "medium", reason: "Fat loss goal" };
  }
  if (hasMass) {
    return { name: "bulking", confidence: "medium", reason: "Mass/strength goal" };
  }
  if (hasTRTOnly) {
    return { name: "cruise", confidence: "high", reason: "TRT-only protocol" };
  }
  return { name: "unknown", confidence: "low", reason: "Goals unclear" };
}

// ──────────────────────────────────────────────
// RISK SCORING
// Each domain returns: { score: 0-100, level: low|medium|high|critical, factors: [...] }
// ──────────────────────────────────────────────

function computeRisk(markers, compounds, logs) {
  return {
    lipid: computeLipidRisk(markers, compounds),
    cardiovascular: computeCardiovascularRisk(markers, compounds, logs),
    hepatic: computeHepaticRisk(markers, compounds),
    hormonal_volatility: computeHormonalVolatility(markers, compounds, logs),
  };
}

function getMarker(markers, ...names) {
  const norm = names.map(n => n.toLowerCase().replace(/[\s_-]/g, ""));
  for (const m of markers) {
    const mn = (m.marker_name || "").toLowerCase().replace(/[\s_-]/g, "");
    if (norm.some(n => mn.includes(n) || n.includes(mn))) return m;
  }
  return null;
}

function hasCompound(compounds, ...names) {
  return compounds.some(c => names.some(n => c.name.toLowerCase().includes(n.toLowerCase())));
}

function computeLipidRisk(markers, compounds) {
  let score = 0;
  const factors = [];

  const hdl = getMarker(markers, "hdl");
  const ldl = getMarker(markers, "ldl");
  const trig = getMarker(markers, "triglycerides", "trig");
  const tc = getMarker(markers, "total cholesterol");

  if (hdl?.value) {
    if (hdl.value < 30) { score += 50; factors.push(`HDL critically low (${hdl.value})`); }
    else if (hdl.value < 35) { score += 35; factors.push(`HDL very low (${hdl.value})`); }
    else if (hdl.value < 40) { score += 20; factors.push(`HDL below optimal (${hdl.value})`); }
  }

  if (ldl?.value) {
    if (ldl.value > 190) { score += 35; factors.push(`LDL very high (${ldl.value})`); }
    else if (ldl.value > 160) { score += 20; factors.push(`LDL high (${ldl.value})`); }
    else if (ldl.value > 130) { score += 10; factors.push(`LDL elevated (${ldl.value})`); }
  }

  if (trig?.value) {
    if (trig.value > 300) { score += 25; factors.push(`Triglycerides very high (${trig.value})`); }
    else if (trig.value > 200) { score += 15; factors.push(`Triglycerides elevated (${trig.value})`); }
  }

  // Adverse ratio
  if (hdl?.value && ldl?.value && hdl.value > 0) {
    const ratio = ldl.value / hdl.value;
    if (ratio > 4) { score += 15; factors.push(`Adverse LDL:HDL ratio (${ratio.toFixed(1)})`); }
  }

  // Compound contribution (predictive — even without bloodwork)
  if (compounds.length && markers.length === 0) {
    if (hasCompound(compounds, "anavar", "winstrol", "dianabol", "superdrol")) {
      score += 25; factors.push("Oral anabolics in stack — lipids likely affected");
    }
  }

  return { score: Math.min(100, score), level: scoreToLevel(score), factors };
}

function computeCardiovascularRisk(markers, compounds, logs) {
  let score = 0;
  const factors = [];

  const hct = getMarker(markers, "hematocrit", "hct");
  const hgb = getMarker(markers, "hemoglobin", "hgb");

  if (hct?.value) {
    if (hct.value > 54) { score += 50; factors.push(`Hematocrit critically high (${hct.value}%)`); }
    else if (hct.value > 52) { score += 35; factors.push(`Hematocrit elevated (${hct.value}%)`); }
    else if (hct.value > 50) { score += 15; factors.push(`Hematocrit upper-normal (${hct.value}%)`); }
  }

  if (hgb?.value && hgb.value > 17.5) {
    score += 15; factors.push(`Hemoglobin elevated (${hgb.value})`);
  }

  // Compound risk factors
  if (hasCompound(compounds, "trenbolone", "tren")) {
    score += 20; factors.push("Trenbolone in stack — cardiovascular stress");
  }
  if (hasCompound(compounds, "testosterone") && !hct?.value) {
    score += 10; factors.push("On testosterone — monitor hematocrit");
  }

  // Lipid carryover
  const lipidRisk = computeLipidRisk(markers, compounds);
  score += Math.floor(lipidRisk.score * 0.3);

  return { score: Math.min(100, score), level: scoreToLevel(score), factors };
}

function computeHepaticRisk(markers, compounds) {
  let score = 0;
  const factors = [];

  const alt = getMarker(markers, "alt", "sgpt");
  const ast = getMarker(markers, "ast", "sgot");
  const ggt = getMarker(markers, "ggt");

  if (alt?.value) {
    if (alt.value > 100) { score += 50; factors.push(`ALT significantly elevated (${alt.value})`); }
    else if (alt.value > 60) { score += 30; factors.push(`ALT elevated (${alt.value})`); }
    else if (alt.value > 44) { score += 15; factors.push(`ALT mildly elevated (${alt.value})`); }
  }

  if (ast?.value) {
    if (ast.value > 80) { score += 30; factors.push(`AST elevated (${ast.value})`); }
    else if (ast.value > 40) { score += 15; factors.push(`AST mildly elevated (${ast.value})`); }
  }

  if (ggt?.value && ggt.value > 65) {
    score += 15; factors.push(`GGT elevated (${ggt.value})`);
  }

  // Oral compounds = hepatic stress
  if (hasCompound(compounds, "anavar", "winstrol", "dianabol", "superdrol", "halotestin", "turinabol")) {
    score += 25; factors.push("17aa oral compounds in stack");
  }

  return { score: Math.min(100, score), level: scoreToLevel(score), factors };
}

function computeHormonalVolatility(markers, compounds, logs) {
  let score = 0;
  const factors = [];

  const e2 = getMarker(markers, "estradiol", "e2");
  const totalT = getMarker(markers, "total testosterone");
  const hasAI = hasCompound(compounds, "aromasin", "arimidex", "exemestane", "anastrozole");

  // Crashed E2 is high volatility
  if (e2?.value) {
    if (e2.value < 10) { score += 50; factors.push(`Estradiol crashed (${e2.value})`); }
    else if (e2.value < 15) { score += 30; factors.push(`Estradiol very low (${e2.value})`); }
    else if (e2.value > 80) { score += 20; factors.push(`Estradiol very high (${e2.value})`); }
  }

  // AI without bloodwork is volatile
  if (hasAI && markers.length === 0) {
    score += 25; factors.push("AI in stack without recent E2 check");
  }

  // Mood swings indicate volatility
  if (logs.length >= 5) {
    const moods = logs.map(l => l.mood).filter(Boolean);
    if (moods.length >= 5) {
      const max = Math.max(...moods);
      const min = Math.min(...moods);
      if (max - min >= 5) { score += 20; factors.push(`Wide mood swings recently (${min}-${max})`); }
    }
  }

  // Multiple compounds without ancillaries
  if (compounds.length >= 4 && !hasAI && !hasCompound(compounds, "hcg")) {
    score += 15; factors.push("Complex stack without ancillary support");
  }

  return { score: Math.min(100, score), level: scoreToLevel(score), factors };
}

function scoreToLevel(score) {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

// ──────────────────────────────────────────────
// HORMONAL STATE
// ──────────────────────────────────────────────

function computeHormonalState(markers, compounds) {
  const totalT = getMarker(markers, "total testosterone");
  const freeT = getMarker(markers, "free testosterone");
  const e2 = getMarker(markers, "estradiol", "e2");
  const shbg = getMarker(markers, "shbg");
  const igf = getMarker(markers, "igf-1", "igf1");
  const tsh = getMarker(markers, "tsh");

  const androgens = (() => {
    if (!totalT?.value) return { state: "unknown", value: null };
    if (totalT.value > 1500) return { state: "supraphysiological", value: totalT.value };
    if (totalT.value > 800) return { state: "high-normal", value: totalT.value };
    if (totalT.value >= 264) return { state: "normal", value: totalT.value };
    return { state: "low", value: totalT.value };
  })();

  const estrogens = (() => {
    if (!e2?.value) return { state: "unknown", value: null };
    if (e2.value < 15) return { state: "crashed", value: e2.value };
    if (e2.value < 25) return { state: "low", value: e2.value };
    if (e2.value > 60) return { state: "elevated", value: e2.value };
    return { state: "normal", value: e2.value };
  })();

  const igfState = (() => {
    if (!igf?.value) return { state: "unknown", value: null };
    if (igf.value > 400) return { state: "very_high", value: igf.value };
    if (igf.value > 246) return { state: "high", value: igf.value };
    if (igf.value >= 88) return { state: "normal", value: igf.value };
    return { state: "low", value: igf.value };
  })();

  const thyroid = (() => {
    if (!tsh?.value) return { state: "unknown", value: null };
    if (tsh.value < 0.4) return { state: "suppressed", value: tsh.value };
    if (tsh.value > 4.5) return { state: "elevated", value: tsh.value };
    return { state: "normal", value: tsh.value };
  })();

  return {
    androgens,
    estrogens,
    igf: igfState,
    thyroid,
    shbg: shbg?.value ? { value: shbg.value, low: shbg.value < 16.5 } : { value: null, low: false },
  };
}

// ──────────────────────────────────────────────
// TRENDS (direction of change)
// ──────────────────────────────────────────────

function computeTrends(logs, panels) {
  return {
    weight: trendOf(logs.map(l => l.weight).filter(Boolean)),
    mood: trendOf(logs.map(l => l.mood).filter(Boolean)),
    sleep: trendOf(logs.map(l => l.sleep_score).filter(Boolean)),
    hrv: trendOf(logs.map(l => l.hrv).filter(Boolean)),
    hdl: trendFromPanels(panels, "hdl"),
    ldl: trendFromPanels(panels, "ldl"),
    hematocrit: trendFromPanels(panels, "hematocrit"),
    estradiol: trendFromPanels(panels, "estradiol"),
    igf_1: trendFromPanels(panels, "igf_1"),
  };
}

function trendOf(values) {
  if (!values || values.length < 3) return { direction: "insufficient_data", change: null, points: values?.length || 0 };
  // Logs are most-recent-first, so reverse for chronological
  const chrono = [...values].reverse();
  const first = chrono.slice(0, Math.ceil(chrono.length / 3));
  const last = chrono.slice(-Math.ceil(chrono.length / 3));
  const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
  const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
  const change = lastAvg - firstAvg;
  const pctChange = firstAvg !== 0 ? (change / firstAvg) * 100 : 0;

  let direction;
  if (Math.abs(pctChange) < 3) direction = "stable";
  else if (change > 0) direction = "rising";
  else direction = "falling";

  return { direction, change: parseFloat(change.toFixed(2)), pctChange: parseFloat(pctChange.toFixed(1)), points: values.length };
}

function trendFromPanels(panels, markerName) {
  if (!panels || panels.length < 2) return { direction: "insufficient_data", change: null };
  const values = panels
    .map(p => {
      const m = (p.blood_panel_markers || []).find(x => x.marker_name === markerName);
      return m ? { date: p.date, value: m.value } : null;
    })
    .filter(Boolean);

  if (values.length < 2) return { direction: "insufficient_data", change: null };

  const sorted = values.sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const change = last - first;
  const pctChange = first !== 0 ? (change / first) * 100 : 0;

  let direction;
  if (Math.abs(pctChange) < 5) direction = "stable";
  else if (change > 0) direction = "rising";
  else direction = "falling";

  return {
    direction,
    change: parseFloat(change.toFixed(2)),
    pctChange: parseFloat(pctChange.toFixed(1)),
    from: first,
    to: last,
    points: values.length,
  };
}

// ──────────────────────────────────────────────
// CONCERNS (synthesized active issues)
// ──────────────────────────────────────────────

function computeConcerns(risk, hormonal, trend, markers, symptoms) {
  const concerns = [];

  // Risk-based concerns
  if (risk.lipid.level === "critical" || risk.lipid.level === "high") {
    concerns.push({
      severity: risk.lipid.level === "critical" ? "high" : "medium",
      domain: "lipids",
      title: `${risk.lipid.level === "critical" ? "Critical" : "Elevated"} lipid risk`,
      detail: risk.lipid.factors.slice(0, 2).join(". "),
    });
  }

  if (risk.cardiovascular.level === "critical" || risk.cardiovascular.level === "high") {
    concerns.push({
      severity: risk.cardiovascular.level === "critical" ? "high" : "medium",
      domain: "cardiovascular",
      title: "Cardiovascular risk elevated",
      detail: risk.cardiovascular.factors.slice(0, 2).join(". "),
    });
  }

  if (risk.hepatic.level === "critical" || risk.hepatic.level === "high") {
    concerns.push({
      severity: risk.hepatic.level === "critical" ? "high" : "medium",
      domain: "liver",
      title: "Liver markers elevated",
      detail: risk.hepatic.factors.slice(0, 2).join(". "),
    });
  }

  // Hormonal concerns
  if (hormonal.estrogens.state === "crashed") {
    concerns.push({
      severity: "high",
      domain: "hormones",
      title: "Estradiol crashed",
      detail: `E2 at ${hormonal.estrogens.value}. Symptoms include joint pain, low libido, depression.`,
    });
  } else if (hormonal.estrogens.state === "low") {
    concerns.push({
      severity: "medium",
      domain: "hormones",
      title: "Estradiol low",
      detail: `E2 at ${hormonal.estrogens.value}. May want to reduce AI if applicable.`,
    });
  }

  // Trend concerns
  if (trend.hematocrit.direction === "rising" && trend.hematocrit.pctChange > 5) {
    concerns.push({
      severity: "medium",
      domain: "cardiovascular",
      title: "Hematocrit trending up",
      detail: `${trend.hematocrit.from} → ${trend.hematocrit.to}. Consider blood donation.`,
    });
  }

  if (trend.hdl.direction === "falling" && trend.hdl.pctChange < -10) {
    concerns.push({
      severity: "medium",
      domain: "lipids",
      title: "HDL declining",
      detail: `${trend.hdl.from} → ${trend.hdl.to} (${trend.hdl.pctChange}%). Review oral compounds.`,
    });
  }

  // Symptom-based concerns
  if (symptoms.length >= 3) {
    const recentLibido = symptoms.slice(0, 5).map(s => s.libido).filter(Boolean);
    if (recentLibido.length >= 3 && recentLibido.reduce((a, b) => a + b, 0) / recentLibido.length < 4) {
      concerns.push({
        severity: "medium",
        domain: "subjective",
        title: "Libido consistently low",
        detail: "May indicate crashed E2, excessive prolactin, or DHT suppression.",
      });
    }
  }

  return concerns;
}

// ──────────────────────────────────────────────
// CYCLE INFO
// ──────────────────────────────────────────────

function computeCycleInfo(cycle) {
  if (!cycle) return null;
  const start = new Date(cycle.start_date);
  const now = new Date();
  const weeksElapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7));
  const planned = cycle.planned_weeks || 12;
  const weeksRemaining = Math.max(0, planned - weeksElapsed);
  const percentComplete = Math.min(100, Math.round((weeksElapsed / planned) * 100));

  return {
    name: cycle.name,
    goals: cycle.goals || [],
    weeksElapsed,
    weeksRemaining,
    plannedWeeks: planned,
    percentComplete,
    isOverdue: weeksElapsed > planned + 1,
  };
}

// ──────────────────────────────────────────────
// BLOODWORK INFO
// ──────────────────────────────────────────────

function computeBloodworkInfo(panel, markers) {
  if (!panel) {
    return { hasPanels: false, daysSince: null, flagged: 0 };
  }
  const daysSince = Math.floor((Date.now() - new Date(panel.date).getTime()) / (1000 * 60 * 60 * 24));
  const flagged = (markers || []).filter(m => m.flagged_low || m.flagged_high);

  return {
    hasPanels: true,
    date: panel.date,
    daysSince,
    isStale: daysSince > 90,
    isVeryStale: daysSince > 180,
    flaggedCount: flagged.length,
    flaggedMarkers: flagged.slice(0, 5).map(m => ({
      name: m.display_name,
      value: m.value,
      direction: m.flagged_high ? "high" : "low",
    })),
  };
}

// ──────────────────────────────────────────────
// SYMPTOM SUMMARY
// ──────────────────────────────────────────────

function computeSymptomSummary(symptoms) {
  if (!symptoms.length) return { hasSymptoms: false };

  const latest = symptoms[0];
  const recent = symptoms.slice(0, 7);

  const avg = (field) => {
    const vals = recent.map(s => s[field]).filter(v => v != null);
    return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null;
  };

  // Count occurrences of boolean symptoms
  const occurrences = (field) => recent.filter(s => s[field]).length;

  return {
    hasSymptoms: true,
    latestDate: latest.date,
    averages: {
      libido: avg("libido"),
      energy: avg("energy"),
      mood: avg("mood"),
      sleep_quality: avg("sleep_quality"),
      pumps: avg("pumps"),
      motivation: avg("motivation"),
    },
    recurring: {
      headaches: occurrences("headaches"),
      joint_pain: occurrences("joint_pain"),
      acne: occurrences("acne"),
      bloating: occurrences("bloating"),
      night_sweats: occurrences("night_sweats"),
      insomnia: occurrences("insomnia"),
    },
    daysTracked: recent.length,
  };
}
