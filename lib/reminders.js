import { createServerClient } from "./supabase";
import { computeUserState } from "./state";

// ══════════════════════════════════════════════════════════════
// SMART REMINDERS ENGINE
//
// Generates actionable reminders based on the user's current state.
// Different from alerts (which are urgent issues) — these are
// scheduled or recurring nudges that help the user stay on top
// of their protocol.
//
// Examples:
//   - "Due for bloodwork — last panel was 95 days ago"
//   - "Hematocrit trending up — consider donating blood"
//   - "6 weeks on Anavar — check liver enzymes"
//   - "Cycle ends in 2 weeks — plan PCT or cruise"
//   - "On AI without recent E2 check — pull labs"
// ══════════════════════════════════════════════════════════════

export async function generateReminders(userId) {
  const state = await computeUserState(userId);
  const db = createServerClient();

  const reminders = [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // ── Bloodwork reminders ──

  if (!state.bloodwork.hasPanels) {
    reminders.push({
      type: "bloodwork_baseline",
      priority: "high",
      title: "Get baseline bloodwork",
      message: "You haven't logged any bloodwork yet. A baseline panel makes everything else more useful.",
      due_date: today,
      source_type: "bloodwork",
      source_data: { reason: "no_panels" },
    });
  } else if (state.bloodwork.isVeryStale) {
    reminders.push({
      type: "bloodwork_overdue",
      priority: "high",
      title: "Bloodwork significantly overdue",
      message: `Last panel was ${state.bloodwork.daysSince} days ago. Schedule a draw soon — especially given your active stack.`,
      due_date: today,
      source_type: "bloodwork",
      source_data: { days_since: state.bloodwork.daysSince },
    });
  } else if (state.bloodwork.isStale) {
    reminders.push({
      type: "bloodwork_due",
      priority: "medium",
      title: "Bloodwork due soon",
      message: `Last panel was ${state.bloodwork.daysSince} days ago. Aim for one every 90 days while on cycle.`,
      due_date: addDays(today, 14),
      source_type: "bloodwork",
      source_data: { days_since: state.bloodwork.daysSince },
    });
  }

  // ── Hematocrit / blood donation ──

  const hctConcern = state.concerns.find(c => c.title.toLowerCase().includes("hematocrit"));
  if (hctConcern || (state.trend.hematocrit?.direction === "rising" && state.trend.hematocrit.pctChange > 4)) {
    reminders.push({
      type: "donate_blood",
      priority: state.trend.hematocrit?.to > 52 ? "high" : "medium",
      title: "Consider blood donation",
      message: state.trend.hematocrit?.to
        ? `Hematocrit at ${state.trend.hematocrit.to}% and rising. Therapeutic phlebotomy or donation can help.`
        : "Hematocrit trending up. Therapeutic phlebotomy or donation can help.",
      due_date: addDays(today, 7),
      source_type: "trend",
      source_data: { marker: "hematocrit" },
    });
  }

  // ── Liver checks for oral users ──

  const orals = state.activeCompounds.filter(c =>
    ["anavar", "winstrol", "dianabol", "superdrol", "halotestin", "turinabol"]
      .some(o => c.name.toLowerCase().includes(o))
  );

  if (orals.length > 0) {
    // If on orals and no recent liver check
    const altMarker = state.bloodwork.flaggedMarkers?.find(m => m.name?.toLowerCase().includes("alt"));
    const needsCheck = state.bloodwork.daysSince === null || state.bloodwork.daysSince > 30;

    if (needsCheck) {
      reminders.push({
        type: "liver_check",
        priority: state.bloodwork.daysSince > 60 ? "high" : "medium",
        title: "Liver markers check needed",
        message: `On ${orals.map(o => o.name).join(", ")}. Check ALT/AST every 4-6 weeks during oral cycles.`,
        due_date: addDays(today, 7),
        source_type: "compound",
        source_data: { compounds: orals.map(o => o.name) },
      });
    }
  }

  // ── E2 monitoring on AI ──

  const hasAI = state.activeCompounds.some(c =>
    ["aromasin", "arimidex", "exemestane", "anastrozole", "letrozole"]
      .some(ai => c.name.toLowerCase().includes(ai))
  );

  if (hasAI && (state.bloodwork.daysSince === null || state.bloodwork.daysSince > 45)) {
    reminders.push({
      type: "e2_check",
      priority: "medium",
      title: "Check estradiol",
      message: "On AI without recent E2. Crashed E2 is a common dosing mistake — pull labs to see where you're at.",
      due_date: addDays(today, 7),
      source_type: "compound",
      source_data: { reason: "ai_without_e2_check" },
    });
  }

  // ── Cycle phase reminders ──

  if (state.cycle) {
    if (state.cycle.weeksRemaining <= 2 && state.cycle.weeksRemaining > 0) {
      reminders.push({
        type: "cycle_ending",
        priority: "medium",
        title: `Cycle ends in ${state.cycle.weeksRemaining} weeks`,
        message: `${state.cycle.name} is wrapping up. Plan your PCT, cruise, or next phase now.`,
        due_date: addDays(today, state.cycle.weeksRemaining * 7),
        source_type: "cycle",
        source_data: { cycle_name: state.cycle.name },
      });
    } else if (state.cycle.isOverdue) {
      reminders.push({
        type: "cycle_overdue",
        priority: "medium",
        title: "Cycle running long",
        message: `Week ${state.cycle.weeksElapsed} of a planned ${state.cycle.plannedWeeks}-week cycle. Extended use increases suppression and side effect risk.`,
        due_date: today,
        source_type: "cycle",
        source_data: { weeks_over: state.cycle.weeksElapsed - state.cycle.plannedWeeks },
      });
    }

    // Mid-cycle bloodwork
    if (state.cycle.weeksElapsed >= 4 && state.cycle.weeksElapsed <= state.cycle.plannedWeeks - 2 && state.bloodwork.daysSince > 45) {
      reminders.push({
        type: "midcycle_bloodwork",
        priority: "medium",
        title: "Mid-cycle bloodwork",
        message: `Week ${state.cycle.weeksElapsed} of cycle. Pull a panel now to catch issues before they compound.`,
        due_date: addDays(today, 14),
        source_type: "cycle",
      });
    }
  }

  // ── Symptom tracking nudges ──

  if (state.symptoms.daysTracked === 0 && state.activeCompounds.length > 0) {
    reminders.push({
      type: "track_symptoms",
      priority: "low",
      title: "Start tracking symptoms",
      message: "Log libido, energy, mood, and sleep daily. Patterns reveal a lot about how compounds affect you.",
      due_date: today,
      source_type: "engagement",
    });
  }

  // ── Dedup against existing active reminders ──
  const { data: existing } = await db
    .from("reminders")
    .select("type")
    .eq("user_id", userId)
    .eq("active", true)
    .is("dismissed_at", null);

  const existingTypes = new Set((existing || []).map(r => r.type));
  const newReminders = reminders.filter(r => !existingTypes.has(r.type));

  // Insert new ones
  if (newReminders.length) {
    await db.from("reminders").insert(
      newReminders.map(r => ({
        user_id: userId,
        ...r,
      }))
    );
  }

  return {
    generated: newReminders.length,
    skipped_existing: reminders.length - newReminders.length,
    reminders: newReminders,
  };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
