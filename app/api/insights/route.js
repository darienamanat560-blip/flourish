import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { retrieveUserContext } from "@/lib/context";
import { runAllRules } from "@/lib/rules";

// ══════════════════════════════════════════════════════════════
// POST /api/insights
//
// Two-pass insight generation:
//   1. Rules engine (lib/rules.js) — fast, deterministic, comprehensive
//   2. AI layer (optional) — adds nuanced observations rules can't catch
//
// Call this after:
//   - New blood panel uploaded
//   - Compound added/changed
//   - Weekly cron job
//   - User requests "Get Insights" from the UI
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const body = await request.json().catch(() => ({}));
    const { trigger = "manual", includeAI = true } = body;

    // Retrieve full context
    const context = await retrieveUserContext(userId, {
      includeChat: false,
      includeMemory: true,
      includeInsights: false,
      includeBloodwork: true,
      includeTraining: true,
    });

    // ── PASS 1: Rules engine ──
    const ruleFindings = runAllRules(context);

    // Split into insights and alerts
    const newInsights = ruleFindings
      .filter(f => f.kind === "insight")
      .map(f => ({
        user_id: userId,
        type: f.type,
        severity: f.severity,
        title: f.title,
        summary: f.summary,
        source_type: f.sourceType || trigger,
        source_ids: [],
      }));

    const newAlerts = ruleFindings
      .filter(f => f.kind === "alert")
      .map(f => ({
        user_id: userId,
        severity: f.severity,
        title: f.title,
        message: f.summary,
        trigger_type: f.sourceType || trigger,
        trigger_data: f.triggerData || {},
      }));

    // ── PASS 2: AI-generated insights (optional) ──
    if (includeAI && (trigger === "manual" || trigger === "bloodwork")) {
      try {
        const aiInsights = await generateAIInsights(context);
        aiInsights.forEach(i => {
          newInsights.push({
            user_id: userId,
            type: i.type || "recommendation",
            severity: i.severity || "info",
            title: i.title,
            summary: i.summary,
            source_type: "ai",
            source_ids: [],
          });
        });
      } catch (err) {
        console.error("AI insight generation failed:", err);
      }
    }

    // ── Deduplicate against existing insights ──
    const { data: existingInsights } = await db
      .from("insights")
      .select("title, created_at")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const existingTitles = new Set((existingInsights || []).map(i => i.title));
    const dedupedInsights = newInsights.filter(i => !existingTitles.has(i.title));

    // ── Store results ──
    if (dedupedInsights.length) {
      await db.from("insights").insert(dedupedInsights);
    }

    if (newAlerts.length) {
      // Deactivate old alerts of the same title before inserting new ones
      for (const alert of newAlerts) {
        await db
          .from("alerts")
          .update({ active: false, resolved_reason: "superseded" })
          .eq("user_id", userId)
          .eq("title", alert.title)
          .eq("active", true);
      }
      await db.from("alerts").insert(newAlerts);
    }

    return NextResponse.json({
      insights: dedupedInsights,
      alerts: newAlerts,
      counts: {
        insights: dedupedInsights.length,
        alerts: newAlerts.length,
        ruleFindings: ruleFindings.length,
        deduped: newInsights.length - dedupedInsights.length,
      },
    });
  } catch (error) {
    console.error("Insights error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────
// AI insight generation (pass 2)
// ──────────────────────────────────────────────

async function generateAIInsights(context) {
  const summary = [];
  if (context.compounds?.length) {
    summary.push(`Compounds: ${context.compounds.map(c => `${c.name} ${c.dose}${c.unit}`).join(", ")}`);
  }
  if (context.recentLogs?.length) {
    const l = context.recentLogs[0];
    summary.push(`Latest metrics: weight ${l.weight || "?"}lbs, sleep ${l.sleep || "?"}, mood ${l.mood || "?"}/10`);
  }
  if (context.bloodwork?.markers?.length) {
    summary.push(`Blood markers: ${context.bloodwork.markers.slice(0, 20).map(m => `${m.name}=${m.value}`).join(", ")}`);
  }
  if (context.training?.prs?.length) {
    summary.push(`PRs: ${context.training.prs.slice(0, 5).map(p => `${p.exercise} ${p.estimated1RM}lbs`).join(", ")}`);
  }
  if (context.cycle?.goals?.length) {
    summary.push(`Goals: ${context.cycle.goals.join(", ")}`);
  }
  if (context.memory?.length) {
    summary.push(`Known patterns: ${context.memory.slice(0, 5).map(m => m.fact).join("; ")}`);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      system: `You analyze health/fitness tracking data and generate concise, actionable insights beyond what simple rules can catch.

Focus on:
- Cross-domain patterns (e.g. "sleep dropping as T3 dose increases")
- Non-obvious compound interactions
- Goal alignment (is their stack actually matching their stated goal?)
- Efficiency observations ("your sleep is good but HRV is down — suggests CNS fatigue not rest issues")

Respond ONLY with a JSON array. No markdown. Generate 2-3 insights MAX. Skip trivial observations.
Format: [{"type":"progress|risk|recommendation|cycle","severity":"info|notice|warning","title":"short title","summary":"1-2 sentences with specific numbers"}]`,
      messages: [{ role: "user", content: summary.join("\n") }],
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "[]";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}
