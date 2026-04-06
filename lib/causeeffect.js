import { createServerClient } from "./supabase";
import { getMarkerDef, MARKERS } from "./markers";

// ══════════════════════════════════════════════════════════════
// CAUSE/EFFECT ENGINE
//
// The killer feature. Compares two blood panels and figures out
// what changed between them — markers AND compounds — then explains
// the connection in plain language.
//
// This is what makes Flourish actually useful instead of just a
// fancy database.
// ══════════════════════════════════════════════════════════════

// Map common compound effects to markers they typically affect
// Used to suggest causation when correlation is detected
const COMPOUND_EFFECTS = {
  // Anabolics → lipids, lipids, hormones
  anavar: { worsens: ["hdl", "ldl", "alt", "ast"], suppresses: ["total_testosterone"] },
  oxandrolone: { worsens: ["hdl", "ldl", "alt", "ast"], suppresses: ["total_testosterone"] },
  winstrol: { worsens: ["hdl", "ldl", "alt", "ast"] },
  stanozolol: { worsens: ["hdl", "ldl", "alt", "ast"] },
  dianabol: { worsens: ["hdl", "ldl", "alt", "ast", "estradiol"], improves: ["total_testosterone"] },
  methandrostenolone: { worsens: ["hdl", "ldl", "alt", "ast", "estradiol"], improves: ["total_testosterone"] },
  trenbolone: { worsens: ["hdl", "ldl", "prolactin"], improves: ["free_testosterone"] },
  testosterone: { improves: ["total_testosterone", "free_testosterone"], worsens: ["hematocrit", "hemoglobin", "estradiol"], suppresses: ["lh", "fsh", "shbg"] },
  "test e": { improves: ["total_testosterone", "free_testosterone"], worsens: ["hematocrit", "hemoglobin", "estradiol"], suppresses: ["lh", "fsh", "shbg"] },
  "test cyp": { improves: ["total_testosterone", "free_testosterone"], worsens: ["hematocrit", "hemoglobin", "estradiol"], suppresses: ["lh", "fsh", "shbg"] },
  nandrolone: { worsens: ["prolactin"], improves: ["free_testosterone"], suppresses: ["lh", "fsh"] },
  deca: { worsens: ["prolactin"], improves: ["free_testosterone"], suppresses: ["lh", "fsh"] },
  primobolan: { worsens: ["hdl", "ldl"] },
  masteron: { worsens: ["hdl", "ldl"] },

  // GH and growth
  hgh: { improves: ["igf_1"], worsens: ["glucose", "hba1c", "insulin"] },
  somatropin: { improves: ["igf_1"], worsens: ["glucose", "hba1c", "insulin"] },
  "mk-677": { improves: ["igf_1"], worsens: ["glucose", "insulin"] },
  ibutamoren: { improves: ["igf_1"], worsens: ["glucose", "insulin"] },
  ipamorelin: { improves: ["igf_1"] },
  "cjc-1295": { improves: ["igf_1"] },
  tesamorelin: { improves: ["igf_1"] },

  // Ancillaries
  aromasin: { suppresses: ["estradiol"] },
  exemestane: { suppresses: ["estradiol"] },
  arimidex: { suppresses: ["estradiol"] },
  anastrozole: { suppresses: ["estradiol"] },
  letrozole: { suppresses: ["estradiol"] },
  hcg: { improves: ["total_testosterone"] },
  enclomiphene: { improves: ["total_testosterone", "lh", "fsh"] },
  clomid: { improves: ["total_testosterone", "lh", "fsh"] },
  nolvadex: { improves: ["total_testosterone", "lh", "fsh"] },
  tamoxifen: { improves: ["total_testosterone", "lh", "fsh"] },

  // SARMs
  "rad-140": { suppresses: ["total_testosterone", "lh", "fsh"], worsens: ["hdl", "alt"] },
  testolone: { suppresses: ["total_testosterone", "lh", "fsh"], worsens: ["hdl", "alt"] },
  "lgd-4033": { suppresses: ["total_testosterone", "shbg", "hdl"] },
  ligandrol: { suppresses: ["total_testosterone", "shbg", "hdl"] },
  ostarine: { suppresses: ["total_testosterone"], worsens: ["alt"] },
  "mk-2866": { suppresses: ["total_testosterone"], worsens: ["alt"] },
  cardarine: { improves: ["hdl"] },
  "gw-501516": { improves: ["hdl"] },

  // Metabolics
  retatrutide: { improves: ["hba1c", "glucose"] },
  semaglutide: { improves: ["hba1c", "glucose"] },
  tirzepatide: { improves: ["hba1c", "glucose"] },
  ozempic: { improves: ["hba1c", "glucose"] },
  mounjaro: { improves: ["hba1c", "glucose"] },

  // Thyroid
  "t3": { suppresses: ["tsh"], worsens: ["hdl"] },
  cytomel: { suppresses: ["tsh"], worsens: ["hdl"] },
  liothyronine: { suppresses: ["tsh"], worsens: ["hdl"] },
};

// Threshold: what counts as a "significant" change for each marker
const SIGNIFICANCE_THRESHOLDS = {
  // Lipids — small absolute changes matter
  hdl: { absolute: 5, percentage: 12 },
  ldl: { absolute: 15, percentage: 15 },
  triglycerides: { absolute: 25, percentage: 20 },
  total_cholesterol: { absolute: 20, percentage: 12 },

  // Hormones — bigger ranges, percentage matters more
  total_testosterone: { absolute: 100, percentage: 20 },
  free_testosterone: { absolute: 15, percentage: 25 },
  estradiol: { absolute: 8, percentage: 25 },
  shbg: { absolute: 5, percentage: 20 },
  lh: { absolute: 1, percentage: 30 },
  fsh: { absolute: 1, percentage: 30 },
  igf_1: { absolute: 30, percentage: 20 },

  // CBC
  hematocrit: { absolute: 2, percentage: 5 },
  hemoglobin: { absolute: 0.8, percentage: 6 },
  rbc: { absolute: 0.3, percentage: 6 },

  // Liver
  alt: { absolute: 10, percentage: 30 },
  ast: { absolute: 10, percentage: 30 },

  // Default for any other marker
  default: { absolute: 0, percentage: 20 },
};

// ──────────────────────────────────────────────
// COMPARE TWO PANELS
// Returns marker changes with significance flags
// ──────────────────────────────────────────────

export async function comparePanels(userId, currentPanelId, previousPanelId = null) {
  const db = createServerClient();

  // Fetch current panel
  const { data: currentPanel } = await db
    .from("blood_panels")
    .select("*")
    .eq("id", currentPanelId)
    .eq("user_id", userId)
    .single();

  if (!currentPanel) throw new Error("Current panel not found");

  // Fetch previous panel — either specified or the most recent before current
  let previousPanel;
  if (previousPanelId) {
    const { data } = await db
      .from("blood_panels")
      .select("*")
      .eq("id", previousPanelId)
      .eq("user_id", userId)
      .single();
    previousPanel = data;
  } else {
    const { data } = await db
      .from("blood_panels")
      .select("*")
      .eq("user_id", userId)
      .lt("date", currentPanel.date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    previousPanel = data;
  }

  // Get markers for both panels
  const { data: currentMarkers } = await db
    .from("blood_panel_markers")
    .select("*")
    .eq("blood_panel_id", currentPanelId);

  let previousMarkers = [];
  if (previousPanel) {
    const { data } = await db
      .from("blood_panel_markers")
      .select("*")
      .eq("blood_panel_id", previousPanel.id);
    previousMarkers = data || [];
  }

  // Build a map of previous markers by canonical name
  const prevMap = {};
  previousMarkers.forEach(m => { prevMap[m.marker_name] = m; });

  // Compare each current marker against its previous value
  const changes = (currentMarkers || []).map(curr => {
    const prev = prevMap[curr.marker_name];
    if (!prev) {
      return {
        marker: curr.marker_name,
        displayName: curr.display_name,
        current: curr.value,
        previous: null,
        delta: null,
        deltaPct: null,
        significant: false,
        direction: "new",
        unit: curr.unit,
        flaggedLow: curr.flagged_low,
        flaggedHigh: curr.flagged_high,
      };
    }

    const delta = curr.value - prev.value;
    const deltaPct = prev.value !== 0 ? (delta / prev.value) * 100 : 0;
    const threshold = SIGNIFICANCE_THRESHOLDS[curr.marker_name] || SIGNIFICANCE_THRESHOLDS.default;
    const significant =
      Math.abs(delta) >= threshold.absolute &&
      Math.abs(deltaPct) >= threshold.percentage;

    return {
      marker: curr.marker_name,
      displayName: curr.display_name,
      current: curr.value,
      previous: prev.value,
      delta,
      deltaPct,
      significant,
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      unit: curr.unit,
      flaggedLow: curr.flagged_low,
      flaggedHigh: curr.flagged_high,
    };
  });

  return {
    currentPanel,
    previousPanel,
    changes,
    significantChanges: changes.filter(c => c.significant),
  };
}

// ──────────────────────────────────────────────
// GET COMPOUND CHANGES BETWEEN TWO DATES
// ──────────────────────────────────────────────

export async function getCompoundChangesBetween(userId, startDate, endDate) {
  const db = createServerClient();

  // Get all compound activity in the window
  // We look at: compounds added (created_at in window), removed (status changed),
  // and check what was active at each endpoint
  const { data: allCompounds } = await db
    .from("cycle_compounds")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!allCompounds) return { added: [], removed: [], dose_changed: [], unchanged: [] };

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Compounds whose creation falls in the window = added
  const added = allCompounds.filter(c => {
    const created = new Date(c.created_at);
    return created >= start && created <= end;
  });

  // Compounds that existed before start but were paused/stopped before end
  const removed = allCompounds.filter(c => {
    const created = new Date(c.created_at);
    const updated = new Date(c.updated_at || c.created_at);
    return created < start && c.status !== "active" && updated >= start && updated <= end;
  });

  // Compounds active throughout
  const unchanged = allCompounds.filter(c => {
    const created = new Date(c.created_at);
    return created < start && c.status === "active";
  });

  return { added, removed, dose_changed: [], unchanged };
}

// ──────────────────────────────────────────────
// GENERATE CAUSE/EFFECT INSIGHTS
// Combines marker changes with compound changes and produces
// human-readable correlations.
// ──────────────────────────────────────────────

export async function generateCauseEffect(userId, currentPanelId, previousPanelId = null) {
  const comparison = await comparePanels(userId, currentPanelId, previousPanelId);

  if (!comparison.previousPanel) {
    return {
      currentPanel: comparison.currentPanel,
      previousPanel: null,
      hasComparison: false,
      message: "This is your first blood panel. Once you have another, Flourish can compare them and identify what changed.",
      changes: comparison.changes,
      compoundChanges: { added: [], removed: [], unchanged: [] },
      correlations: [],
    };
  }

  const compoundChanges = await getCompoundChangesBetween(
    userId,
    comparison.previousPanel.date,
    comparison.currentPanel.date
  );

  // For each significant marker change, look for plausible compound causes
  const correlations = [];

  for (const change of comparison.significantChanges) {
    const direction = change.direction; // "up" or "down"
    const possibleCauses = [];

    // Check added compounds
    for (const comp of compoundChanges.added) {
      const effects = COMPOUND_EFFECTS[comp.name.toLowerCase()];
      if (!effects) continue;

      // If marker went down and compound worsens it, or marker went up and compound improves it
      const worsens = effects.worsens?.includes(change.marker);
      const improves = effects.improves?.includes(change.marker);
      const suppresses = effects.suppresses?.includes(change.marker);

      // For "bad" direction (worsened): worsens or suppresses match
      // For "good" direction (improved): improves match
      const isBadMarker = ["hdl", "igf_1", "total_testosterone", "free_testosterone"].includes(change.marker);
      const wentBad = isBadMarker ? direction === "down" : direction === "up";
      const wentGood = !wentBad;

      if (wentBad && (worsens || suppresses)) {
        possibleCauses.push({
          type: "added",
          compound: comp.name,
          effect: suppresses ? "suppresses" : "worsens",
          confidence: "likely",
        });
      } else if (wentGood && improves) {
        possibleCauses.push({
          type: "added",
          compound: comp.name,
          effect: "improves",
          confidence: "likely",
        });
      }
    }

    // Check removed compounds (inverse effects)
    for (const comp of compoundChanges.removed) {
      const effects = COMPOUND_EFFECTS[comp.name.toLowerCase()];
      if (!effects) continue;

      const worsens = effects.worsens?.includes(change.marker);
      const improves = effects.improves?.includes(change.marker);
      const suppresses = effects.suppresses?.includes(change.marker);

      const isBadMarker = ["hdl", "igf_1", "total_testosterone", "free_testosterone"].includes(change.marker);
      const wentBad = isBadMarker ? direction === "down" : direction === "up";
      const wentGood = !wentBad;

      // If we removed something that worsens HDL and HDL went up → makes sense
      if (wentGood && (worsens || suppresses)) {
        possibleCauses.push({
          type: "removed",
          compound: comp.name,
          effect: "removed_negative_effect",
          confidence: "likely",
        });
      } else if (wentBad && improves) {
        possibleCauses.push({
          type: "removed",
          compound: comp.name,
          effect: "removed_positive_effect",
          confidence: "likely",
        });
      }
    }

    // Build natural language explanation
    let explanation;
    const deltaStr = change.delta > 0 ? `+${change.delta.toFixed(1)}` : change.delta.toFixed(1);
    const pctStr = `${change.deltaPct > 0 ? "+" : ""}${change.deltaPct.toFixed(0)}%`;

    if (possibleCauses.length > 0) {
      const causeStrs = possibleCauses.map(c => {
        if (c.type === "added") {
          return c.effect === "improves"
            ? `Adding ${c.compound} typically improves ${change.displayName}`
            : `Adding ${c.compound} typically ${c.effect} ${change.displayName}`;
        } else {
          return c.effect === "removed_negative_effect"
            ? `Removing ${c.compound} likely allowed ${change.displayName} to recover`
            : `Removing ${c.compound} may have caused ${change.displayName} to decline`;
        }
      });
      explanation = causeStrs.join(". ");
    } else if (compoundChanges.added.length > 0 || compoundChanges.removed.length > 0) {
      explanation = "No clear single cause identified, but you made compound changes during this window.";
    } else {
      explanation = "No compound changes during this window. May be diet, training, sleep, or natural variation.";
    }

    correlations.push({
      marker: change.marker,
      displayName: change.displayName,
      change: {
        from: change.previous,
        to: change.current,
        delta: change.delta,
        deltaPct: change.deltaPct,
        direction: change.direction,
        unit: change.unit,
        deltaStr,
        pctStr,
      },
      possibleCauses,
      explanation,
    });
  }

  return {
    currentPanel: comparison.currentPanel,
    previousPanel: comparison.previousPanel,
    hasComparison: true,
    daysApart: Math.round(
      (new Date(comparison.currentPanel.date) - new Date(comparison.previousPanel.date)) /
        (1000 * 60 * 60 * 24)
    ),
    changes: comparison.changes,
    significantChanges: comparison.significantChanges,
    compoundChanges,
    correlations,
  };
}
