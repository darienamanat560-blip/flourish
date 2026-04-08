import { createServerClient } from "./supabase";

// ══════════════════════════════════════════════════════════════
// "WHAT CHANGED" ENGINE
//
// Returns a comprehensive diff of everything between two dates.
// More general than the cause/effect engine in batch 5A — that
// one focuses on bloodwork. This one captures the full picture:
//
//   - Compounds: added, removed, dose changes
//   - Bloodwork: marker changes (if panels exist)
//   - Symptoms: average delta per measure, new occurrences
//   - Training: new PRs, volume change
//   - Logs: weight change, sleep change, mood change
//
// Used by:
//   - "What changed since last labs?" button
//   - Decision support ("should I add var?" — needs to know context)
//   - Future timeline view
// ══════════════════════════════════════════════════════════════

export async function getChangesBetween(userId, fromDate, toDate) {
  if (!fromDate || !toDate) throw new Error("fromDate and toDate required");

  const db = createServerClient();
  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (from >= to) throw new Error("fromDate must be before toDate");

  // Fetch everything in parallel
  const [
    compoundsResult,
    panelsResult,
    logsResult,
    symptomsResult,
    trainingResult,
  ] = await Promise.all([
    db.from("cycle_compounds").select("*").eq("user_id", userId),
    db.from("blood_panels")
      .select("*, blood_panel_markers(*)")
      .eq("user_id", userId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
    db.from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
    db.from("symptoms")
      .select("*")
      .eq("user_id", userId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
    db.from("training_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
  ]);

  // ── COMPOUND CHANGES ──
  const allCompounds = compoundsResult.data || [];
  const added = [];
  const removed = [];

  for (const c of allCompounds) {
    const created = new Date(c.created_at);
    const updated = new Date(c.updated_at || c.created_at);

    // Created in window?
    if (created >= from && created <= to) {
      added.push({ name: c.name, dose: c.dose, unit: c.unit, frequency: c.frequency, date: c.created_at });
      continue;
    }

    // Existed before window but went inactive within window?
    if (created < from && c.status !== "active" && updated >= from && updated <= to) {
      removed.push({ name: c.name, dose: c.dose, unit: c.unit, status: c.status, date: c.updated_at });
    }
  }

  // ── BLOODWORK CHANGES ──
  let bloodwork = null;
  const panels = panelsResult.data || [];
  if (panels.length >= 2) {
    const first = panels[0];
    const last = panels[panels.length - 1];
    bloodwork = compareMarkerSets(first, last);
  } else if (panels.length === 1) {
    bloodwork = { single: true, date: panels[0].date, markerCount: (panels[0].blood_panel_markers || []).length };
  }

  // ── LOG-BASED CHANGES (weight, sleep, mood) ──
  const logs = logsResult.data || [];
  const weightChange = computeMetricChange(logs, "weight");
  const sleepChange = computeMetricChange(logs, "sleep_score");
  const moodChange = computeMetricChange(logs, "mood");
  const hrvChange = computeMetricChange(logs, "hrv");

  // ── SYMPTOM CHANGES ──
  const symptoms = symptomsResult.data || [];
  const symptomChanges = symptoms.length >= 2 ? compareSymptomAverages(symptoms) : null;

  // ── TRAINING CHANGES ──
  const training = trainingResult.data || [];
  const newPRs = training.filter(t => t.is_pr).map(t => ({
    exercise: t.exercise,
    estimated1RM: t.estimated_1rm,
    date: t.date,
  }));
  const totalSessions = training.length;

  // ── SUMMARY ──
  const daysSpan = Math.round((to - from) / (1000 * 60 * 60 * 24));

  return {
    fromDate,
    toDate,
    daysSpan,
    compounds: { added, removed, totalChanges: added.length + removed.length },
    bloodwork,
    metrics: {
      weight: weightChange,
      sleep: sleepChange,
      mood: moodChange,
      hrv: hrvChange,
    },
    symptoms: symptomChanges,
    training: {
      sessions: totalSessions,
      newPRs,
    },
    summary: buildSummary({
      daysSpan,
      added,
      removed,
      bloodwork,
      weightChange,
      newPRs,
    }),
  };
}

// ──────────────────────────────────────────────
// COMPARE TWO BLOODWORK PANELS
// ──────────────────────────────────────────────

function compareMarkerSets(firstPanel, lastPanel) {
  const firstMarkers = firstPanel.blood_panel_markers || [];
  const lastMarkers = lastPanel.blood_panel_markers || [];

  const firstMap = {};
  firstMarkers.forEach(m => { firstMap[m.marker_name] = m; });

  const changes = [];
  for (const last of lastMarkers) {
    const first = firstMap[last.marker_name];
    if (!first) continue;

    // Skip if either value looks corrupt: negative when it shouldn't be,
    // or the delta itself is impossibly large (>500% change in one panel interval).
    // These are almost always from misidentified markers in the PDF parser.
    const pctChange = first.value !== 0 ? ((last.value - first.value) / first.value) * 100 : 0;
    if (Math.abs(pctChange) > 500) continue;   // >500% swing = data quality issue, not a real change
    if (last.value < 0 || first.value < 0) continue;

    const delta = last.value - first.value;

    // Only surface clinically meaningful changes:
    // ≥10% change OR an absolute delta that matters for that marker type.
    const absThreshold = getAbsThreshold(last.marker_name);
    if (Math.abs(pctChange) < 10 && Math.abs(delta) < absThreshold) continue;

    changes.push({
      marker: last.marker_name,
      displayName: last.display_name,
      from: first.value,
      to: last.value,
      delta: parseFloat(delta.toFixed(2)),
      pctChange: parseFloat(pctChange.toFixed(1)),
      unit: last.unit,
      direction: delta > 0 ? "up" : "down",
    });
  }

  return {
    fromDate: firstPanel.date,
    toDate: lastPanel.date,
    panelsInRange: 2,
    changes: changes.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)),
  };
}

// Minimum absolute delta that's worth surfacing (marker-specific)
function getAbsThreshold(canonical) {
  const thresholds = {
    total_testosterone: 50,   // ng/dL
    free_testosterone: 10,    // pg/mL
    estradiol: 5,             // pg/mL
    total_cholesterol: 15,    // mg/dL
    hdl: 5,                   // mg/dL
    ldl: 10,                  // mg/dL
    triglycerides: 20,        // mg/dL
    hematocrit: 2,            // %
    hemoglobin: 0.5,          // g/dL
    alt: 10,                  // U/L
    ast: 10,                  // U/L
    tsh: 0.5,                 // mIU/L
    glucose: 10,              // mg/dL
    igf_1: 20,                // ng/mL
    vitamin_d: 5,             // ng/mL
    ferritin: 10,             // ng/mL
  };
  return thresholds[canonical] ?? 5;
}

// ──────────────────────────────────────────────
// COMPUTE METRIC CHANGE FROM LOGS
// ──────────────────────────────────────────────

function computeMetricChange(logs, field) {
  const values = logs.map(l => ({ date: l.date, value: l[field] })).filter(v => v.value != null);
  if (values.length < 2) return { hasData: false };

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last.value - first.value;
  const pctChange = first.value !== 0 ? (delta / first.value) * 100 : 0;

  return {
    hasData: true,
    from: first.value,
    to: last.value,
    delta: parseFloat(delta.toFixed(2)),
    pctChange: parseFloat(pctChange.toFixed(1)),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    points: values.length,
  };
}

// ──────────────────────────────────────────────
// COMPARE SYMPTOM AVERAGES
// ──────────────────────────────────────────────

function compareSymptomAverages(symptoms) {
  const fields = ["libido", "energy", "mood", "sleep_quality", "pumps", "motivation"];
  const half = Math.floor(symptoms.length / 2);
  const firstHalf = symptoms.slice(0, half);
  const secondHalf = symptoms.slice(half);

  const changes = {};
  for (const field of fields) {
    const firstVals = firstHalf.map(s => s[field]).filter(v => v != null);
    const secondVals = secondHalf.map(s => s[field]).filter(v => v != null);
    if (firstVals.length === 0 || secondVals.length === 0) continue;

    const firstAvg = firstVals.reduce((a, b) => a + b, 0) / firstVals.length;
    const secondAvg = secondVals.reduce((a, b) => a + b, 0) / secondVals.length;
    const delta = secondAvg - firstAvg;

    if (Math.abs(delta) >= 0.5) {
      changes[field] = {
        from: parseFloat(firstAvg.toFixed(1)),
        to: parseFloat(secondAvg.toFixed(1)),
        delta: parseFloat(delta.toFixed(1)),
      };
    }
  }

  return {
    daysTracked: symptoms.length,
    significantChanges: changes,
  };
}

// ──────────────────────────────────────────────
// BUILD HUMAN-READABLE SUMMARY
// ──────────────────────────────────────────────

function buildSummary({ daysSpan, added, removed, bloodwork, weightChange, newPRs }) {
  const parts = [];

  if (added.length === 0 && removed.length === 0 && !bloodwork?.changes?.length && !newPRs.length) {
    return `Over the past ${daysSpan} days, nothing major changed in your protocol or labs.`;
  }

  if (added.length > 0) {
    parts.push(`Added ${added.length} compound${added.length > 1 ? "s" : ""}: ${added.map(a => a.name).join(", ")}`);
  }
  if (removed.length > 0) {
    parts.push(`Removed ${removed.length}: ${removed.map(r => r.name).join(", ")}`);
  }
  if (bloodwork?.changes?.length > 0) {
    const top = bloodwork.changes.slice(0, 3);
    parts.push(`Bloodwork: ${top.map(c => `${c.displayName} ${c.direction === "up" ? "↑" : "↓"} ${Math.abs(c.pctChange)}%`).join(", ")}`);
  }
  if (weightChange?.hasData) {
    const dir = weightChange.delta > 0 ? "+" : "";
    parts.push(`Weight ${dir}${weightChange.delta} lbs`);
  }
  if (newPRs.length > 0) {
    parts.push(`${newPRs.length} new PR${newPRs.length > 1 ? "s" : ""}`);
  }

  return parts.join(". ") + ".";
}

// ──────────────────────────────────────────────
// HELPER: changes since last bloodwork
// ──────────────────────────────────────────────

export async function getChangesSinceLastBloodwork(userId) {
  const db = createServerClient();

  // Find the most recent panel
  const { data: panels } = await db
    .from("blood_panels")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1);

  if (!panels?.length) {
    return { error: "no_bloodwork", message: "No bloodwork on file. Upload a panel to use this feature." };
  }

  const lastPanelDate = panels[0].date;
  const today = new Date().toISOString().split("T")[0];

  return getChangesBetween(userId, lastPanelDate, today);
}
