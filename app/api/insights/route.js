import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { retrieveUserContext } from "@/lib/context";

// ══════════════════════════════════════════════════════════════
// POST /api/insights
//
// Generates insights from user data. Call this after:
//   - New blood panel uploaded
//   - Compound added/changed
//   - Weekly cron job
//   - User requests "Get Insights" from the UI
//
// Two-pass system:
//   1. Rule-based flags (fast, always works)
//   2. AI-generated insights (optional, richer)
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const db = createServerClient();
    const body = await request.json();
    const { trigger = "manual" } = body; // 'bloodwork', 'compound_change', 'weekly', 'manual'

    // Retrieve full context
    const context = await retrieveUserContext(userId, {
      includeChat: false,
      includeMemory: true,
      includeInsights: false, // avoid circular reference
      includeBloodwork: true,
      includeTraining: true,
    });

    const newInsights = [];
    const newAlerts = [];

    // ── PASS 1: Rule-based analysis ──

    // Bloodwork rules
    if (context.bloodwork?.markers?.length) {
      const m = {};
      context.bloodwork.markers.forEach(marker => {
        m[marker.name.toLowerCase().replace(/\s/g, "_")] = marker;
      });

      // HDL critically low
      if (m.hdl?.value && m.hdl.value < 35) {
        newAlerts.push({
          severity: "high",
          title: "HDL critically low",
          message: `HDL at ${m.hdl.value} ${m.hdl.unit || "mg/dL"}. Consider reviewing oral compounds and adding cardio. Discuss with provider.`,
          trigger_type: "bloodwork_flag",
          trigger_data: { marker: "hdl", value: m.hdl.value },
        });
      }

      // Hematocrit elevated
      if (m.hematocrit?.value && m.hematocrit.value > 52) {
        newAlerts.push({
          severity: "high",
          title: "Hematocrit elevated",
          message: `HCT at ${m.hematocrit.value}%. Consider blood donation, hydration check, or dose review.`,
          trigger_type: "bloodwork_flag",
          trigger_data: { marker: "hematocrit", value: m.hematocrit.value },
        });
      }

      // Estradiol potentially over-suppressed
      const e2 = m.estradiol || m.e2;
      const hasAI = context.compounds.some(c =>
        ["Aromasin", "Arimidex", "Exemestane", "Anastrozole"].some(name =>
          c.name.toLowerCase().includes(name.toLowerCase())
        )
      );
      if (e2?.value && e2.value < 15 && hasAI) {
        newAlerts.push({
          severity: "medium",
          title: "Estradiol may be over-suppressed",
          message: `E2 at ${e2.value} ${e2.unit || "pg/mL"} with active AI. Consider reducing AI dose or frequency.`,
          trigger_type: "bloodwork_flag",
          trigger_data: { marker: "estradiol", value: e2.value },
        });
      }

      // Liver enzymes elevated
      if (m.alt?.value && m.alt.value > 50) {
        newInsights.push({
          type: "bloodwork",
          severity: m.alt.value > 100 ? "warning" : "notice",
          title: "ALT elevated",
          summary: `ALT at ${m.alt.value} U/L. ${context.compounds.some(c => ["Anavar", "Winstrol", "Dianabol", "Turinabol"].some(n => c.name.includes(n))) ? "Likely related to oral compound use." : "Monitor and retest."}`,
          source_type: "bloodwork",
        });
      }

      // IGF-1 check for GH users
      const igf = m.igf1 || m["igf-1"];
      const onGH = context.compounds.some(c => c.name.includes("HGH") || c.name.includes("MK-677"));
      if (igf?.value && onGH && igf.value < 200) {
        newInsights.push({
          type: "bloodwork",
          severity: "notice",
          title: "Low IGF-1 despite GH use",
          summary: `IGF-1 at ${igf.value} ${igf.unit || "ng/mL"} while on GH-related compounds. May indicate poor GH→IGF-1 conversion, timing issues, or underdosed product.`,
          source_type: "bloodwork",
        });
      }

      // General flagged markers as insights
      context.bloodwork.markers
        .filter(marker => marker.low || marker.high)
        .forEach(marker => {
          // Skip ones we already have specific rules for
          const name = marker.name.toLowerCase();
          if (["hdl", "hematocrit", "estradiol", "e2", "alt", "igf-1", "igf1"].some(k => name.includes(k))) return;

          newInsights.push({
            type: "bloodwork",
            severity: "info",
            title: `${marker.name} ${marker.low ? "below" : "above"} range`,
            summary: `${marker.name}: ${marker.value} ${marker.unit || ""} (ref: ${marker.refRange || "N/A"})`,
            source_type: "bloodwork",
          });
        });
    }

    // Metric trend rules
    if (context.recentLogs.length >= 3) {
      const moods = context.recentLogs.map(l => l.mood).filter(Boolean);
      if (moods.length >= 3) {
        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        if (avg < 4) {
          newInsights.push({
            type: "recovery",
            severity: "warning",
            title: "Mood trending low",
            summary: `Average mood ${avg.toFixed(1)}/10 over recent entries. Consider reviewing compound sides, sleep quality, and stress management.`,
            source_type: "log",
          });
        }
      }

      // Weight stall detection
      const weights = context.recentLogs.map(l => l.weight).filter(Boolean);
      if (weights.length >= 5) {
        const range = Math.max(...weights) - Math.min(...weights);
        const isRecomp = context.cycle?.goals?.some(g => g.toLowerCase().includes("recomp") || g.toLowerCase().includes("fat loss"));
        if (range < 1 && isRecomp) {
          newInsights.push({
            type: "progress",
            severity: "info",
            title: "Weight stable",
            summary: `Weight within ${range.toFixed(1)} lbs range over ${weights.length} entries. ${isRecomp ? "If targeting fat loss, consider adjusting caloric deficit or reviewing metabolic compounds." : "On track for maintenance."}`,
            source_type: "log",
          });
        }
      }
    }

    // Side effect frequency
    const sideEffectEntries = context.recentLogs.filter(l => l.sideEffects).length;
    if (sideEffectEntries >= 3 && context.recentLogs.length >= 4) {
      newInsights.push({
        type: "risk",
        severity: "notice",
        title: "Frequent side effects",
        summary: `Side effects reported in ${sideEffectEntries} of last ${context.recentLogs.length} logs. Consider reviewing which compound was most recently added or dose-changed.`,
        source_type: "log",
      });
    }

    // ── PASS 2: AI-generated insights (optional) ──

    if (trigger === "manual" || trigger === "bloodwork") {
      try {
        const aiInsights = await generateAIInsights(context);
        if (aiInsights.length) {
          newInsights.push(...aiInsights);
        }
      } catch (err) {
        console.error("AI insight generation failed:", err);
        // Non-critical — rule-based insights still work
      }
    }

    // ── Store results ──

    if (newInsights.length) {
      await db.from("insights").insert(
        newInsights.map(i => ({
          user_id: userId,
          type: i.type,
          severity: i.severity,
          title: i.title,
          summary: i.summary,
          source_type: i.source_type || trigger,
          source_ids: i.source_ids || [],
        }))
      );
    }

    if (newAlerts.length) {
      // Deactivate old alerts of the same type before inserting new ones
      for (const alert of newAlerts) {
        await db
          .from("alerts")
          .update({ active: false, resolved_reason: "superseded" })
          .eq("user_id", userId)
          .eq("title", alert.title)
          .eq("active", true);
      }

      await db.from("alerts").insert(
        newAlerts.map(a => ({
          user_id: userId,
          severity: a.severity,
          title: a.title,
          message: a.message,
          trigger_type: a.trigger_type,
          trigger_data: a.trigger_data || {},
        }))
      );
    }

    return NextResponse.json({
      insights: newInsights,
      alerts: newAlerts,
      counts: {
        insights: newInsights.length,
        alerts: newAlerts.length,
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

// ── AI insight generation ──

async function generateAIInsights(context) {
  const summary = [];
  if (context.compounds.length) summary.push(`Compounds: ${context.compounds.map(c => `${c.name} ${c.dose}${c.unit}`).join(", ")}`);
  if (context.recentLogs.length) summary.push(`Latest: weight ${context.recentLogs[0].weight || "?"}lbs, mood ${context.recentLogs[0].mood || "?"}/10`);
  if (context.bloodwork?.markers?.length) summary.push(`Blood markers: ${context.bloodwork.markers.map(m => `${m.name}=${m.value}`).join(", ")}`);
  if (context.training.prs.length) summary.push(`PRs: ${context.training.prs.map(p => `${p.exercise} ${p.estimated1RM}lbs`).join(", ")}`);
  if (context.cycle?.goals?.length) summary.push(`Goals: ${context.cycle.goals.join(", ")}`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: `You analyze health/fitness tracking data and generate concise insights. Respond ONLY with a JSON array. No markdown. Format: [{"type":"progress|risk|recommendation","severity":"info|notice|warning","title":"short title","summary":"1-2 sentences"}]. Generate 2-4 insights max. Focus on actionable observations.`,
      messages: [{ role: "user", content: summary.join("\n") }],
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "[]";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}
