// ══════════════════════════════════════════════════════════════
// RULES ENGINE
//
// Analyzes user context and generates insights + alerts.
// Pure logic — no DB writes, no API calls. Callers store results.
//
// Each rule returns 0 or more findings:
//   {
//     kind: "insight" | "alert",
//     type: "bloodwork" | "cycle" | "recovery" | "risk" | "progress" | "recommendation",
//     severity: "info" | "notice" | "warning" | "critical"  (for insights)
//               | "low" | "medium" | "high" | "critical"    (for alerts),
//     title: "short headline",
//     summary: "explanation with specific numbers",
//     sourceType: "bloodwork" | "log" | "training" | "cycle",
//     triggerData: { ... }
//   }
// ══════════════════════════════════════════════════════════════

export function runAllRules(context) {
  const findings = [];

  findings.push(...lipidRules(context));
  findings.push(...androgenEstrogenRules(context));
  findings.push(...liverKidneyRules(context));
  findings.push(...hematologyRules(context));
  findings.push(...thyroidRules(context));
  findings.push(...igfGhRules(context));
  findings.push(...sleepRecoveryRules(context));
  findings.push(...moodTrendRules(context));
  findings.push(...trainingRecoveryRules(context));
  findings.push(...cyclePhaseRules(context));
  findings.push(...sideEffectRules(context));
  findings.push(...doseTimingRules(context));

  return findings;
}

// ──────────────────────────────────────────────
// HELPER: get marker by name (case-insensitive)
// ──────────────────────────────────────────────

function getMarker(context, ...names) {
  if (!context.bloodwork?.markers) return null;
  const normalized = names.map(n => n.toLowerCase().replace(/[\s_-]/g, ""));
  for (const marker of context.bloodwork.markers) {
    const markerName = marker.name.toLowerCase().replace(/[\s_-]/g, "");
    if (normalized.some(n => markerName.includes(n) || n.includes(markerName))) {
      return marker;
    }
  }
  return null;
}

function hasActiveCompound(context, ...names) {
  if (!context.compounds?.length) return false;
  const normalized = names.map(n => n.toLowerCase());
  return context.compounds.some(c => {
    const cn = c.name.toLowerCase();
    return normalized.some(n => cn.includes(n));
  });
}

function getActiveCompoundsByCategory(context, category) {
  return (context.compounds || []).filter(c => c.category === category);
}

// ══════════════════════════════════════════════════════════════
// LIPID RULES
// ══════════════════════════════════════════════════════════════

function lipidRules(context) {
  const findings = [];
  const hdl = getMarker(context, "hdl");
  const ldl = getMarker(context, "ldl");
  const tc = getMarker(context, "total cholesterol", "cholesterol");
  const trig = getMarker(context, "triglycerides", "trig");

  // HDL critically low
  if (hdl?.value && hdl.value < 30) {
    findings.push({
      kind: "alert",
      type: "risk",
      severity: "critical",
      title: "HDL critically low",
      summary: `HDL at ${hdl.value} ${hdl.unit || "mg/dL"}. Below critical threshold. Review oral compounds immediately and consult provider.`,
      sourceType: "bloodwork",
      triggerData: { marker: "hdl", value: hdl.value },
    });
  } else if (hdl?.value && hdl.value < 35) {
    findings.push({
      kind: "alert",
      type: "risk",
      severity: "high",
      title: "HDL very low",
      summary: `HDL at ${hdl.value} ${hdl.unit || "mg/dL"}. ${hasOralAnabolic(context) ? "Likely related to oral compound use." : "Consider cardio, niacin, or omega-3s."}`,
      sourceType: "bloodwork",
      triggerData: { marker: "hdl", value: hdl.value },
    });
  }

  // LDL elevated
  if (ldl?.value && ldl.value > 160) {
    findings.push({
      kind: "alert",
      type: "risk",
      severity: ldl.value > 190 ? "high" : "medium",
      title: "LDL elevated",
      summary: `LDL at ${ldl.value} ${ldl.unit || "mg/dL"}. ${hasOralAnabolic(context) ? "Oral compounds commonly elevate LDL." : "Review dietary saturated fat and consider lifestyle interventions."}`,
      sourceType: "bloodwork",
      triggerData: { marker: "ldl", value: ldl.value },
    });
  }

  // Triglycerides high
  if (trig?.value && trig.value > 200) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: trig.value > 300 ? "warning" : "notice",
      title: "Triglycerides elevated",
      summary: `TG at ${trig.value} ${trig.unit || "mg/dL"}. Check fasting status at time of draw, review carbohydrate intake, and consider omega-3 supplementation.`,
      sourceType: "bloodwork",
      triggerData: { marker: "triglycerides", value: trig.value },
    });
  }

  // Lipid panel overall assessment
  if (hdl?.value && ldl?.value && ldl.value > hdl.value * 4) {
    findings.push({
      kind: "insight",
      type: "risk",
      severity: "notice",
      title: "Adverse lipid ratio",
      summary: `LDL:HDL ratio around ${(ldl.value / hdl.value).toFixed(1)}. Elevated cardiovascular risk indicator. Review compound choices.`,
      sourceType: "bloodwork",
      triggerData: { ratio: (ldl.value / hdl.value).toFixed(1) },
    });
  }

  return findings;
}

function hasOralAnabolic(context) {
  return hasActiveCompound(context, "anavar", "winstrol", "dianabol", "turinabol", "superdrol", "halotestin");
}

// ══════════════════════════════════════════════════════════════
// ANDROGEN / ESTROGEN RULES
// ══════════════════════════════════════════════════════════════

function androgenEstrogenRules(context) {
  const findings = [];
  const totalT = getMarker(context, "total testosterone", "total t", "testosterone total");
  const freeT = getMarker(context, "free testosterone", "free t");
  const e2 = getMarker(context, "estradiol", "e2");
  const shbg = getMarker(context, "shbg");
  const hasAI = hasActiveCompound(context, "aromasin", "arimidex", "exemestane", "anastrozole", "letrozole");
  const onT = hasActiveCompound(context, "testosterone");

  // Estradiol crashed
  if (e2?.value && e2.value < 10) {
    findings.push({
      kind: "alert",
      type: "risk",
      severity: "high",
      title: "Estradiol severely suppressed",
      summary: `E2 at ${e2.value} ${e2.unit || "pg/mL"}. ${hasAI ? "Stop or significantly reduce AI dose. Symptoms of crashed E2 include joint pain, low libido, lethargy, suicidal ideation." : "Unusual without AI — verify test method."}`,
      sourceType: "bloodwork",
      triggerData: { marker: "estradiol", value: e2.value, hasAI },
    });
  } else if (e2?.value && e2.value < 15 && hasAI) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "warning",
      title: "Estradiol trending low on AI",
      summary: `E2 at ${e2.value} ${e2.unit || "pg/mL"} with active aromatase inhibitor. Consider reducing AI dose or frequency to avoid crashing.`,
      sourceType: "bloodwork",
      triggerData: { marker: "estradiol", value: e2.value },
    });
  } else if (e2?.value && e2.value > 60 && onT) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "notice",
      title: "Estradiol elevated",
      summary: `E2 at ${e2.value} ${e2.unit || "pg/mL"}. ${hasAI ? "Current AI dose may be insufficient." : "Consider starting low-dose AI if symptomatic (bloating, mood changes, sensitive nipples)."}`,
      sourceType: "bloodwork",
      triggerData: { marker: "estradiol", value: e2.value },
    });
  }

  // Total T too high
  if (totalT?.value) {
    const unit = (totalT.unit || "ng/dL").toLowerCase();
    const ngdl = unit.includes("nmol") ? totalT.value * 28.84 : totalT.value;
    if (ngdl > 1500 && onT) {
      findings.push({
        kind: "insight",
        type: "bloodwork",
        severity: "notice",
        title: "Total T supraphysiological",
        summary: `Total T at ${totalT.value} ${totalT.unit || "ng/dL"}. Check draw timing relative to last injection for accurate interpretation.`,
        sourceType: "bloodwork",
        triggerData: { marker: "total_t", value: totalT.value },
      });
    }
  }

  // SHBG very low
  if (shbg?.value && shbg.value < 15) {
    findings.push({
      kind: "insight",
      type: "health_pattern",
      severity: "notice",
      title: "SHBG very low",
      summary: `SHBG at ${shbg.value} ${shbg.unit || "nmol/L"}. Low SHBG amplifies free androgen effects — may explain stronger effect per mg dosed. Consider this when interpreting symptoms.`,
      sourceType: "bloodwork",
      triggerData: { marker: "shbg", value: shbg.value },
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// LIVER / KIDNEY RULES
// ══════════════════════════════════════════════════════════════

function liverKidneyRules(context) {
  const findings = [];
  const alt = getMarker(context, "alt", "sgpt");
  const ast = getMarker(context, "ast", "sgot");
  const bun = getMarker(context, "bun");
  const creat = getMarker(context, "creatinine");
  const egfr = getMarker(context, "egfr", "gfr");

  // ALT elevated
  if (alt?.value) {
    if (alt.value > 100) {
      findings.push({
        kind: "alert",
        type: "risk",
        severity: "high",
        title: "ALT significantly elevated",
        summary: `ALT at ${alt.value} U/L. ${hasOralAnabolic(context) ? "Discontinue orals and retest in 4 weeks." : "Review alcohol, NSAIDs, and other hepatotoxic factors."} Consider provider consultation.`,
        sourceType: "bloodwork",
        triggerData: { marker: "alt", value: alt.value },
      });
    } else if (alt.value > 50) {
      findings.push({
        kind: "insight",
        type: "bloodwork",
        severity: "warning",
        title: "ALT mildly elevated",
        summary: `ALT at ${alt.value} U/L. ${hasOralAnabolic(context) ? "Common with oral compounds but worth monitoring." : "Note: heavy lifting in 48h prior to draw can elevate ALT transiently."}`,
        sourceType: "bloodwork",
        triggerData: { marker: "alt", value: alt.value },
      });
    }
  }

  // AST:ALT ratio check (mostly for context)
  if (alt?.value && ast?.value && alt.value > 50) {
    const ratio = ast.value / alt.value;
    if (ratio < 1) {
      findings.push({
        kind: "insight",
        type: "bloodwork",
        severity: "info",
        title: "AST/ALT pattern suggests muscle or oral compound origin",
        summary: `AST:ALT ratio ${ratio.toFixed(2)}. Pattern consistent with heavy training or hepatotoxic compound exposure rather than alcohol-related hepatic stress.`,
        sourceType: "bloodwork",
      });
    }
  }

  // Creatinine note
  if (creat?.value && creat.value > 1.3) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "info",
      title: "Creatinine elevated",
      summary: `Creatinine at ${creat.value} ${creat.unit || "mg/dL"}. In muscular individuals this is often normal — check cystatin C for more accurate kidney function if concerned.`,
      sourceType: "bloodwork",
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// HEMATOLOGY RULES
// ══════════════════════════════════════════════════════════════

function hematologyRules(context) {
  const findings = [];
  const hct = getMarker(context, "hematocrit", "hct");
  const hgb = getMarker(context, "hemoglobin", "hgb");
  const rbc = getMarker(context, "rbc", "red blood cell");

  if (hct?.value) {
    if (hct.value > 54) {
      findings.push({
        kind: "alert",
        type: "risk",
        severity: "critical",
        title: "Hematocrit critically high",
        summary: `HCT at ${hct.value}%. Increased thrombosis risk. Donate blood, reduce TRT dose, increase hydration. Consult provider urgently.`,
        sourceType: "bloodwork",
        triggerData: { marker: "hct", value: hct.value },
      });
    } else if (hct.value > 52) {
      findings.push({
        kind: "alert",
        type: "risk",
        severity: "high",
        title: "Hematocrit elevated",
        summary: `HCT at ${hct.value}%. Consider blood donation (therapeutic phlebotomy), hydration, or testosterone dose reduction.`,
        sourceType: "bloodwork",
        triggerData: { marker: "hct", value: hct.value },
      });
    }
  }

  if (hgb?.value && hgb.value > 17.5) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "warning",
      title: "Hemoglobin elevated",
      summary: `Hemoglobin at ${hgb.value} ${hgb.unit || "g/dL"}. Often accompanies elevated hematocrit on TRT.`,
      sourceType: "bloodwork",
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// THYROID RULES
// ══════════════════════════════════════════════════════════════

function thyroidRules(context) {
  const findings = [];
  const tsh = getMarker(context, "tsh");
  const ft3 = getMarker(context, "ft3", "free t3");
  const ft4 = getMarker(context, "ft4", "free t4");

  if (tsh?.value && tsh.value > 4.5) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "notice",
      title: "TSH elevated — possible hypothyroid signal",
      summary: `TSH at ${tsh.value} mIU/L. Above upper reference. Consider retesting with Free T3 and Free T4, and review any thyroid-suppressive compounds.`,
      sourceType: "bloodwork",
    });
  }

  // Suppressed thyroid on T3
  if (tsh?.value && tsh.value < 0.4 && hasActiveCompound(context, "t3", "cytomel", "t4", "levothyroxine")) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "info",
      title: "TSH suppressed on exogenous thyroid",
      summary: `TSH at ${tsh.value} mIU/L — expected with active thyroid supplementation. Monitor Free T3/T4 for actual thyroid status.`,
      sourceType: "bloodwork",
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// IGF-1 / GROWTH RULES
// ══════════════════════════════════════════════════════════════

function igfGhRules(context) {
  const findings = [];
  const igf = getMarker(context, "igf-1", "igf1", "igf 1");
  const onGH = hasActiveCompound(context, "hgh", "somatropin", "mk-677", "mk 677", "ipamorelin", "cjc");

  if (!igf?.value) return findings;

  if (onGH && igf.value < 200) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "warning",
      title: "Low IGF-1 despite GH-adjacent compounds",
      summary: `IGF-1 at ${igf.value} ${igf.unit || "ng/mL"} while on ${context.compounds.filter(c => ["hgh","mk","ipamorelin","cjc"].some(n => c.name.toLowerCase().includes(n))).map(c => c.name).join(", ")}. May indicate underdosed product, poor GH→IGF conversion, or timing/storage issues. Retest in 4-6 weeks after verifying product quality.`,
      sourceType: "bloodwork",
      triggerData: { marker: "igf1", value: igf.value },
    });
  } else if (onGH && igf.value > 400) {
    findings.push({
      kind: "insight",
      type: "bloodwork",
      severity: "notice",
      title: "IGF-1 very elevated",
      summary: `IGF-1 at ${igf.value} ${igf.unit || "ng/mL"}. Effective GH dosing, but sustained very high IGF-1 (>400) long-term has theoretical cancer proliferation concerns. Consider dose review.`,
      sourceType: "bloodwork",
      triggerData: { marker: "igf1", value: igf.value },
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// SLEEP / RECOVERY RULES
// ══════════════════════════════════════════════════════════════

function sleepRecoveryRules(context) {
  const findings = [];
  if (!context.recentLogs?.length) return findings;

  const sleepScores = context.recentLogs.map(l => l.sleep).filter(Boolean);
  const hrvScores = context.recentLogs.map(l => l.hrv).filter(Boolean);

  // Sleep trending down
  if (sleepScores.length >= 4) {
    const recent = sleepScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = sleepScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recent < older - 10) {
      findings.push({
        kind: "insight",
        type: "recovery",
        severity: "warning",
        title: "Sleep quality declining",
        summary: `Sleep score dropped from ${older.toFixed(0)} to ${recent.toFixed(0)} over recent entries. Review compound timing — stimulants, T3, or late-day GH can impact sleep.`,
        sourceType: "log",
      });
    }
  }

  // Poor sleep overall
  const avgSleep = sleepScores.length ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length : 0;
  if (sleepScores.length >= 5 && avgSleep < 60) {
    findings.push({
      kind: "alert",
      type: "recovery",
      severity: "medium",
      title: "Consistently poor sleep",
      summary: `Sleep averaging ${avgSleep.toFixed(0)}/100 over ${sleepScores.length} entries. Poor sleep severely impacts recovery, muscle growth, and hormone production. Consider compound timing adjustments.`,
      sourceType: "log",
      triggerData: { avgSleep },
    });
  }

  // HRV declining
  if (hrvScores.length >= 4) {
    const recent = hrvScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = hrvScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recent < older * 0.85) {
      findings.push({
        kind: "insight",
        type: "recovery",
        severity: "notice",
        title: "HRV trending down",
        summary: `HRV dropped from ${older.toFixed(0)} to ${recent.toFixed(0)}ms (${((1 - recent/older) * 100).toFixed(0)}% decline). Indicator of accumulated stress — consider a deload or dose reduction.`,
        sourceType: "log",
      });
    }
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// MOOD TREND RULES
// ══════════════════════════════════════════════════════════════

function moodTrendRules(context) {
  const findings = [];
  if (!context.recentLogs?.length) return findings;

  const moods = context.recentLogs.map(l => l.mood).filter(Boolean);
  if (moods.length < 3) return findings;

  const avg = moods.reduce((a, b) => a + b, 0) / moods.length;

  if (avg < 4) {
    const hasAI = hasActiveCompound(context, "aromasin", "arimidex", "exemestane", "anastrozole");
    findings.push({
      kind: "alert",
      type: "recovery",
      severity: "high",
      title: "Mood significantly low",
      summary: `Mood averaging ${avg.toFixed(1)}/10. ${hasAI ? "Crashed estradiol commonly causes depression — test E2 if not recent." : "Review sleep, stress, and recent compound changes."}`,
      sourceType: "log",
      triggerData: { avgMood: avg },
    });
  } else if (avg < 5.5 && moods.length >= 5) {
    findings.push({
      kind: "insight",
      type: "recovery",
      severity: "notice",
      title: "Mood below baseline",
      summary: `Mood averaging ${avg.toFixed(1)}/10 over ${moods.length} entries. Monitor for further decline and review contributing factors.`,
      sourceType: "log",
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// TRAINING RECOVERY RULES
// ══════════════════════════════════════════════════════════════

function trainingRecoveryRules(context) {
  const findings = [];
  if (!context.training?.recent?.length) return findings;

  const lifts = context.training.recent.filter(t => t.type === "lift");
  const cardio = context.training.recent.filter(t => t.type === "cardio");

  // Check for strength regression
  const byExercise = {};
  lifts.forEach(l => {
    if (!byExercise[l.exercise]) byExercise[l.exercise] = [];
    byExercise[l.exercise].push(l);
  });

  Object.entries(byExercise).forEach(([exercise, sessions]) => {
    if (sessions.length < 3) return;
    const sorted = sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted[0].estimated1RM || 0;
    const peak = Math.max(...sorted.map(s => s.estimated1RM || 0));
    if (peak > 0 && recent < peak * 0.92) {
      findings.push({
        kind: "insight",
        type: "recovery",
        severity: "notice",
        title: `${exercise} strength regressing`,
        summary: `Recent ${exercise} est. 1RM ${recent.toFixed(0)}lbs vs peak ${peak.toFixed(0)}lbs (${((1 - recent/peak) * 100).toFixed(0)}% off). Review recovery, sleep, nutrition, and compound support.`,
        sourceType: "training",
      });
    }
  });

  // Training volume vs sleep mismatch
  const sleepScores = context.recentLogs?.map(l => l.sleep).filter(Boolean) || [];
  const avgSleep = sleepScores.length ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length : 0;
  if (lifts.length >= 5 && avgSleep > 0 && avgSleep < 65) {
    findings.push({
      kind: "insight",
      type: "recovery",
      severity: "warning",
      title: "High training volume with poor sleep",
      summary: `${lifts.length} lifting sessions logged recently with sleep averaging ${avgSleep.toFixed(0)}/100. Recovery is inadequate — expect stagnation or regression without sleep improvement.`,
      sourceType: "training",
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// CYCLE PHASE RULES
// ══════════════════════════════════════════════════════════════

function cyclePhaseRules(context) {
  const findings = [];
  if (!context.cycle?.start_date) return findings;

  const start = new Date(context.cycle.start_date);
  const now = new Date();
  const weeksIn = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  const planned = context.cycle.planned_weeks || 12;

  // Past planned end
  if (weeksIn > planned + 2) {
    findings.push({
      kind: "insight",
      type: "cycle",
      severity: "notice",
      title: "Cycle extending past planned duration",
      summary: `Week ${weeksIn} of a ${planned}-week planned cycle. Extended use without a break increases suppression and side effect risk. Consider PCT or cruise.`,
      sourceType: "cycle",
    });
  }

  // Approaching end — no bloodwork
  const daysSinceBloodwork = context.bloodwork?.date
    ? Math.floor((now - new Date(context.bloodwork.date)) / (24 * 60 * 60 * 1000))
    : 999;

  if (weeksIn >= planned - 2 && daysSinceBloodwork > 60) {
    findings.push({
      kind: "insight",
      type: "recommendation",
      severity: "notice",
      title: "Get mid-cycle bloodwork",
      summary: `You're ${weeksIn} weeks into a ${planned}-week cycle with bloodwork ${daysSinceBloodwork} days old. Pull a panel now to check lipids, hematocrit, and hormones before cycle end.`,
      sourceType: "cycle",
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════
// SIDE EFFECT RULES
// ══════════════════════════════════════════════════════════════

function sideEffectRules(context) {
  const findings = [];
  if (!context.recentLogs?.length) return findings;

  const withSides = context.recentLogs.filter(l => l.sideEffects);
  if (withSides.length < 2) return findings;

  // Collect side effects
  const allSides = withSides.flatMap(l =>
    l.sideEffects.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
  );
  const counts = {};
  allSides.forEach(s => { counts[s] = (counts[s] || 0) + 1; });

  // Frequent specific side effects
  Object.entries(counts).forEach(([effect, count]) => {
    if (count >= 3) {
      // Suggest cause based on common patterns
      let likely = "";
      if (effect.includes("acne") || effect.includes("skin")) {
        likely = hasActiveCompound(context, "testosterone", "trenbolone", "masteron", "anavar")
          ? "Likely DHT-related — consider topical finasteride or pyrilutamide."
          : "Review hormone levels and hygiene.";
      } else if (effect.includes("lethargy") || effect.includes("tired") || effect.includes("fatigue")) {
        likely = "Multiple possible causes: low T3, crashed E2, undereating, or over-training.";
      } else if (effect.includes("insomnia") || effect.includes("sleep")) {
        likely = "Review evening compound timing — stimulants, T3, and late cardio can disrupt sleep.";
      } else if (effect.includes("bloat") || effect.includes("water")) {
        likely = "Likely estrogen-driven — test E2 and review sodium intake.";
      } else if (effect.includes("joint") || effect.includes("pain")) {
        likely = "Possible low E2 (from over-AI) or dry compound stack. Test E2.";
      }
      findings.push({
        kind: "insight",
        type: "risk",
        severity: "notice",
        title: `Recurring: ${effect}`,
        summary: `"${effect}" reported in ${count} of last ${context.recentLogs.length} entries. ${likely}`,
        sourceType: "log",
      });
    }
  });

  return findings;
}

// ══════════════════════════════════════════════════════════════
// DOSE TIMING RULES
// ══════════════════════════════════════════════════════════════

function doseTimingRules(context) {
  const findings = [];

  // Flag if user is approaching bloodwork date and has dose-sensitive compounds
  // (This would typically use scheduled bloodwork from a separate table, but
  //  for now we just flag general awareness)

  const hasShortEster = hasActiveCompound(context, "testosterone propionate", "trenbolone acetate");
  const hasAI = hasActiveCompound(context, "aromasin", "arimidex");

  if (hasShortEster && hasAI) {
    // Only add this as info once in a while - we'd need better dedup in practice
    // For now, skip this since it'd fire every call
  }

  return findings;
}
