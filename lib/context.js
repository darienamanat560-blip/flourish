import { createServerClient } from "./supabase";
import { computeUserState } from "./state";

// ══════════════════════════════════════════════════════════════
// CONTEXT RETRIEVER
// 
// Gathers all relevant user state before an AI call.
// Returns a structured object that gets serialized into the prompt.
//
// This is the single most important piece of the AI pipeline.
// Without it, the model is just a generic chatbot.
// With it, the model knows your compounds, your labs, your PRs,
// your goals, your patterns, and your history.
// ══════════════════════════════════════════════════════════════

export async function retrieveUserContext(userId, options = {}) {
  const db = createServerClient();
  const {
    includeChat = true,      // include recent chat messages
    chatThreadId = null,      // specific thread, or latest
    chatMessageLimit = 20,    // how many messages to include
    includeMemory = true,     // include agent memory
    includeInsights = true,   // include recent insights
    includeBloodwork = true,  // include latest blood panel
    includeTraining = true,   // include recent training/PRs
  } = options;

  // Run all queries in parallel for speed
  const [
    profileResult,
    cycleResult,
    compoundsResult,
    recentLogsResult,
    memoryResult,
    insightsResult,
    alertsResult,
    bloodworkResult,
    markersResult,
    trainingResult,
    prsResult,
    chatResult,
  ] = await Promise.all([
    // 1. Profile
    db.from("profiles").select("*").eq("id", userId).single(),

    // 2. Active cycle
    db.from("cycles")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),

    // 3. Active compounds (from active cycle)
    db.from("cycle_compounds")
      .select("*, cycles!inner(status)")
      .eq("user_id", userId)
      .eq("cycles.status", "active")
      .eq("status", "active"),

    // 4. Recent daily logs (last 7)
    db.from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),

    // 5. Agent memory
    includeMemory
      ? db.from("agent_memory")
          .select("category, content, confidence")
          .eq("user_id", userId)
          .eq("active", true)
          .order("confidence", { ascending: false })
          .limit(30)
      : { data: [] },

    // 6. Recent insights
    includeInsights
      ? db.from("insights")
          .select("type, severity, title, summary, created_at")
          .eq("user_id", userId)
          .eq("dismissed", false)
          .order("created_at", { ascending: false })
          .limit(10)
      : { data: [] },

    // 7. Active alerts
    db.from("alerts")
      .select("severity, title, message")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5),

    // 8. Latest blood panel
    includeBloodwork
      ? db.from("blood_panels")
          .select("id, date, lab_name, fasting, active_compounds_snapshot")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(1)
          .single()
      : { data: null },

    // 9. Blood markers from latest panel (separate query since we need the panel ID)
    // We'll handle this after getting the panel
    { data: [] }, // placeholder — filled below

    // 10. Recent training
    includeTraining
      ? db.from("training_sessions")
          .select("date, type, exercise, sets, duration_minutes, distance, estimated_1rm, is_pr, active_compounds")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(10)
      : { data: [] },

    // 11. Lift PRs
    includeTraining
      ? db.from("lift_prs")
          .select("exercise, estimated_1rm, date, active_compounds")
          .eq("user_id", userId)
      : { data: [] },

    // 12. Recent chat messages
    includeChat
      ? getChatMessages(db, userId, chatThreadId, chatMessageLimit)
      : { data: [] },
  ]);

  // Fetch blood markers if we have a panel
  let markers = [];
  if (bloodworkResult.data?.id) {
    const markersQuery = await db
      .from("blood_panel_markers")
      .select("marker_name, display_name, value, unit, reference_low, reference_high, flagged_low, flagged_high")
      .eq("blood_panel_id", bloodworkResult.data.id)
      .order("marker_name");
    markers = markersQuery.data || [];
  }

  // Assemble the context object
  const context = {
    profile: profileResult.data || null,
    cycle: cycleResult.data || null,
    compounds: (compoundsResult.data || []).map(c => ({
      name: c.name,
      dose: c.dose,
      unit: c.unit,
      frequency: c.frequency,
      category: c.category,
      titration: c.titration,
    })),
    recentLogs: (recentLogsResult.data || []).map(l => ({
      date: l.date,
      weight: l.weight,
      sleep: l.sleep_score,
      hrv: l.hrv,
      mood: l.mood,
      stress: l.stress,
      energy: l.energy,
      sideEffects: l.side_effects,
      physique: l.physique_notes,
    })),
    memory: (memoryResult.data || []).map(m => ({
      category: m.category,
      fact: m.content,
      confidence: m.confidence,
    })),
    insights: (insightsResult.data || []).map(i => ({
      type: i.type,
      severity: i.severity,
      title: i.title,
      summary: i.summary,
    })),
    alerts: (alertsResult.data || []).map(a => ({
      severity: a.severity,
      title: a.title,
      message: a.message,
    })),
    bloodwork: bloodworkResult.data
      ? {
          date: bloodworkResult.data.date,
          lab: bloodworkResult.data.lab_name,
          fasting: bloodworkResult.data.fasting,
          compoundsAtTime: bloodworkResult.data.active_compounds_snapshot,
          markers: markers.map(m => ({
            name: m.display_name || m.marker_name,
            value: m.value,
            unit: m.unit,
            low: m.flagged_low,
            high: m.flagged_high,
            refRange: m.reference_low && m.reference_high
              ? `${m.reference_low}-${m.reference_high}`
              : null,
          })),
        }
      : null,
    training: {
      recent: (trainingResult.data || []).map(t => ({
        date: t.date,
        type: t.type,
        exercise: t.exercise,
        sets: t.sets,
        duration: t.duration_minutes,
        distance: t.distance,
        estimated1RM: t.estimated_1rm,
        isPR: t.is_pr,
        onCompounds: t.active_compounds,
      })),
      prs: (prsResult.data || []).map(p => ({
        exercise: p.exercise,
        estimated1RM: p.estimated_1rm,
        date: p.date,
        onCompounds: p.active_compounds,
      })),
    },
    chatHistory: chatResult.data || [],
  };

  // Compute user state and attach to context — grounds AI responses in
  // actual current risk levels, hormonal state, and concerns.
  try {
    context.state = await computeUserState(userId);
  } catch (err) {
    console.error("State compute failed in context:", err);
    context.state = null;
  }

  return context;
}

// Helper: get chat messages from a thread
async function getChatMessages(db, userId, threadId, limit) {
  // If no thread specified, get the latest active thread
  if (!threadId) {
    const threadResult = await db
      .from("chat_threads")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!threadResult.data) return { data: [] };
    threadId = threadResult.data.id;
  }

  const result = await db
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return {
    data: (result.data || []).map(m => ({
      role: m.role,
      content: m.content,
    })),
  };
}

// ══════════════════════════════════════════════════════════════
// PROMPT BUILDER
//
// Takes the context object and builds a grounded system prompt.
// This is what transforms a generic LLM into a personalized coach.
// ══════════════════════════════════════════════════════════════

export function buildSystemPrompt(context) {
  const sections = [];

  sections.push(`You are Flourish, a personal compound stack and performance tracking assistant. You help the user optimize their protocol based on their actual data. Be direct, specific, and reference the user's own numbers. Never give generic advice when you have real data to work with. You are NOT a doctor — always clarify that.`);

  // Computed state — grounds responses in current risk levels and concerns
  if (context.state) {
    const s = context.state;
    const stateParts = [];
    stateParts.push(`Phase: ${s.phase.name} (${s.phase.confidence} confidence — ${s.phase.reason})`);
    stateParts.push(`Lipid risk: ${s.risk.lipid.level} (${s.risk.lipid.score}/100)${s.risk.lipid.factors.length ? " — " + s.risk.lipid.factors.slice(0, 2).join("; ") : ""}`);
    stateParts.push(`Cardiovascular risk: ${s.risk.cardiovascular.level} (${s.risk.cardiovascular.score}/100)`);
    stateParts.push(`Hepatic risk: ${s.risk.hepatic.level} (${s.risk.hepatic.score}/100)`);
    stateParts.push(`Hormonal volatility: ${s.risk.hormonal_volatility.level} (${s.risk.hormonal_volatility.score}/100)`);
    stateParts.push(`Androgens: ${s.hormonal.androgens.state}${s.hormonal.androgens.value ? ` (${s.hormonal.androgens.value})` : ""}`);
    stateParts.push(`Estrogens: ${s.hormonal.estrogens.state}${s.hormonal.estrogens.value ? ` (${s.hormonal.estrogens.value})` : ""}`);
    if (s.hormonal.igf.value) stateParts.push(`IGF-1: ${s.hormonal.igf.state} (${s.hormonal.igf.value})`);
    if (s.cycle) stateParts.push(`Cycle: week ${s.cycle.weeksElapsed}/${s.cycle.plannedWeeks} (${s.cycle.percentComplete}% complete)`);
    if (s.bloodwork.hasPanels) stateParts.push(`Last bloodwork: ${s.bloodwork.daysSince} days ago${s.bloodwork.isStale ? " (STALE)" : ""}${s.bloodwork.flaggedCount ? ` with ${s.bloodwork.flaggedCount} flagged markers` : ""}`);
    if (s.concerns.length) {
      stateParts.push(`Active concerns: ${s.concerns.map(c => `[${c.severity}] ${c.title}`).join("; ")}`);
    }
    if (s.trend.hdl?.direction === "falling" || s.trend.hematocrit?.direction === "rising") {
      const trends = [];
      if (s.trend.hdl?.direction === "falling") trends.push(`HDL falling (${s.trend.hdl.pctChange}%)`);
      if (s.trend.hematocrit?.direction === "rising") trends.push(`HCT rising (${s.trend.hematocrit.pctChange}%)`);
      stateParts.push(`Notable trends: ${trends.join(", ")}`);
    }
    sections.push(`COMPUTED USER STATE:\n${stateParts.join("\n")}`);
  }

  // Profile
  if (context.profile) {
    const p = context.profile;
    const parts = [];
    if (p.name) parts.push(`Name: ${p.name}`);
    if (p.age) parts.push(`Age: ${p.age}`);
    if (p.weight) parts.push(`Weight: ${p.weight} lbs`);
    if (p.experience) parts.push(`Experience: ${p.experience}`);
    if (p.goals?.length) parts.push(`Goals: ${p.goals.join(", ")}`);
    if (p.health_conditions) parts.push(`Health: ${p.health_conditions}`);
    if (parts.length) sections.push(`USER PROFILE:\n${parts.join("\n")}`);
  }

  // Active cycle
  if (context.cycle) {
    const c = context.cycle;
    sections.push(`ACTIVE CYCLE: "${c.name}" (${c.goals?.join(", ") || "no goals set"}) — started ${c.start_date || "unknown"}, planned ${c.planned_weeks} weeks`);
  }

  // Compounds
  if (context.compounds.length) {
    const list = context.compounds.map(c =>
      `• ${c.name}: ${c.dose} ${c.unit} ${c.frequency}${c.titration?.length > 1 ? ` (titrating: ${c.titration.map(t => `wk${t.week}→${t.dose}`).join(", ")})` : ""}`
    ).join("\n");
    sections.push(`ACTIVE COMPOUNDS:\n${list}`);
  }

  // Recent metrics
  if (context.recentLogs.length) {
    const latest = context.recentLogs[0];
    const parts = [];
    if (latest.weight) parts.push(`Weight: ${latest.weight} lbs`);
    if (latest.sleep) parts.push(`Sleep: ${latest.sleep}`);
    if (latest.hrv) parts.push(`HRV: ${latest.hrv} ms`);
    if (latest.mood) parts.push(`Mood: ${latest.mood}/10`);
    if (latest.stress) parts.push(`Stress: ${latest.stress}/10`);
    if (latest.energy) parts.push(`Energy: ${latest.energy}/10`);
    if (latest.sideEffects) parts.push(`Side effects: ${latest.sideEffects}`);
    if (latest.physique) parts.push(`Physique notes: ${latest.physique}`);

    sections.push(`LATEST METRICS (${latest.date}):\n${parts.join("\n")}`);

    // Trends if we have multiple entries
    if (context.recentLogs.length >= 3) {
      const weights = context.recentLogs.map(l => l.weight).filter(Boolean);
      const moods = context.recentLogs.map(l => l.mood).filter(Boolean);
      if (weights.length >= 2) {
        const delta = weights[0] - weights[weights.length - 1];
        sections.push(`WEIGHT TREND: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} lbs over ${weights.length} entries`);
      }
      if (moods.length >= 2) {
        const avg = (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1);
        sections.push(`MOOD AVERAGE: ${avg}/10 over ${moods.length} entries`);
      }
    }

    // Recent side effects across all logs
    const allSides = context.recentLogs
      .map(l => l.sideEffects)
      .filter(Boolean)
      .join(", ");
    if (allSides) {
      const unique = [...new Set(allSides.split(",").map(s => s.trim()).filter(Boolean))];
      sections.push(`RECENT SIDE EFFECTS: ${unique.join(", ")}`);
    }
  }

  // Bloodwork
  if (context.bloodwork) {
    const bw = context.bloodwork;
    const markerStr = bw.markers
      .map(m => {
        let flag = "";
        if (m.low) flag = " ⚠ LOW";
        if (m.high) flag = " ⚠ HIGH";
        return `• ${m.name}: ${m.value} ${m.unit || ""}${m.refRange ? ` (ref: ${m.refRange})` : ""}${flag}`;
      })
      .join("\n");
    sections.push(`LATEST BLOODWORK (${bw.date}, ${bw.fasting ? "fasting" : "non-fasting"}, on: ${bw.compoundsAtTime?.join(", ") || "unknown"}):\n${markerStr}`);
  }

  // Training PRs
  if (context.training.prs.length) {
    const prStr = context.training.prs
      .map(p => `• ${p.exercise}: ${p.estimated1RM} lbs (${p.date}, on: ${p.onCompounds?.join(", ") || "unknown"})`)
      .join("\n");
    sections.push(`LIFT PRs:\n${prStr}`);
  }

  // Alerts
  if (context.alerts.length) {
    const alertStr = context.alerts
      .map(a => `⚠ [${a.severity.toUpperCase()}] ${a.title}: ${a.message}`)
      .join("\n");
    sections.push(`ACTIVE ALERTS:\n${alertStr}`);
  }

  // Insights
  if (context.insights.length) {
    const insightStr = context.insights
      .map(i => `[${i.severity}] ${i.title}: ${i.summary}`)
      .join("\n");
    sections.push(`RECENT INSIGHTS:\n${insightStr}`);
  }

  // Memory (the persistent facts)
  if (context.memory.length) {
    const grouped = {};
    context.memory.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m.fact);
    });
    const memStr = Object.entries(grouped)
      .map(([cat, facts]) => `${cat.toUpperCase()}:\n${facts.map(f => `• ${f}`).join("\n")}`)
      .join("\n\n");
    sections.push(`USER MEMORY (persistent facts):\n${memStr}`);
  }

  sections.push(`INSTRUCTIONS:
- Reference the user's actual data when answering. Cite specific numbers.
- If a question relates to bloodwork, compounds, or training, use the data above.
- If you notice patterns (improving/worsening trends), mention them.
- If something looks concerning (flagged markers, high stress, side effects), flag it.
- Be concise. Use short paragraphs, not walls of text.
- You are NOT a doctor. Don't diagnose. Say "consider discussing with your provider" when appropriate.
- If you don't have enough data to answer confidently, say so.`);

  return sections.join("\n\n---\n\n");
}

// ══════════════════════════════════════════════════════════════
// FORMAT CHAT HISTORY FOR CLAUDE
//
// Converts stored messages into the Anthropic messages format.
// ══════════════════════════════════════════════════════════════

export function formatMessagesForClaude(chatHistory, newUserMessage) {
  const messages = [];

  // Add chat history
  for (const msg of chatHistory) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the new message
  messages.push({ role: "user", content: newUserMessage });

  return messages;
}
