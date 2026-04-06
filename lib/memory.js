import { createServerClient } from "./supabase";

// ══════════════════════════════════════════════════════════════
// MEMORY MANAGEMENT
//
// The app's long-term memory of the user. Handles:
//   - Extracting facts from chat, logs, onboarding
//   - Deduplicating against existing memories
//   - Updating confidence when facts get re-confirmed
//   - Superseding old facts when new ones contradict them
// ══════════════════════════════════════════════════════════════

const VALID_CATEGORIES = [
  "routine",         // e.g. "Injects test E subQ every Monday and Thursday"
  "goal",            // e.g. "Wants to bulk to 185 lbs while keeping BF under 15%"
  "constraint",      // e.g. "Cannot take compounds that crash HDL"
  "preference",      // e.g. "Prefers fasted morning cardio"
  "health_pattern",  // e.g. "SHBG historically runs low (15-18)"
  "decision",        // e.g. "Chose not to add var after reviewing lipid panel"
  "context",         // e.g. "University schedule restricts gym time to evenings"
];

// ──────────────────────────────────────────────
// ADD MEMORY (with dedup + confidence update)
// ──────────────────────────────────────────────

export async function addMemory(userId, fact, options = {}) {
  const {
    category,
    confidence = 0.7,
    sourceType = "manual",
    sourceId = null,
  } = options;

  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid memory category: ${category}`);
  }
  if (!fact || fact.length < 5) return null;

  const db = createServerClient();

  // Check for existing similar memory (simple text similarity)
  const { data: existing } = await db
    .from("agent_memory")
    .select("id, content, confidence, last_confirmed_at")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("active", true);

  // Look for a near-duplicate
  const duplicate = findSimilarMemory(fact, existing || []);

  if (duplicate) {
    // Re-confirm existing memory: bump confidence + update timestamp
    const newConfidence = Math.min(1, duplicate.confidence + 0.1);
    await db
      .from("agent_memory")
      .update({
        confidence: newConfidence,
        last_confirmed_at: new Date().toISOString(),
      })
      .eq("id", duplicate.id);
    return { id: duplicate.id, action: "confirmed", confidence: newConfidence };
  }

  // Insert new memory
  const { data, error } = await db
    .from("agent_memory")
    .insert({
      user_id: userId,
      category,
      content: fact,
      confidence,
      source_type: sourceType,
      source_id: sourceId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id, action: "created", confidence };
}

// ──────────────────────────────────────────────
// SUPERSEDE MEMORY
// Use when a new fact replaces an old one.
// e.g. "User no longer takes HGH" supersedes "User takes 4 IU HGH daily"
// ──────────────────────────────────────────────

export async function supersedeMemory(userId, oldMemoryId, newFact, options = {}) {
  const db = createServerClient();

  // Insert new memory
  const newMem = await addMemory(userId, newFact, options);

  // Mark old memory as superseded and inactive
  await db
    .from("agent_memory")
    .update({
      active: false,
      superseded_by: newMem.id,
    })
    .eq("id", oldMemoryId)
    .eq("user_id", userId);

  return newMem;
}

// ──────────────────────────────────────────────
// DEACTIVATE MEMORY (user explicitly says "that's not true anymore")
// ──────────────────────────────────────────────

export async function deactivateMemory(userId, memoryId) {
  const db = createServerClient();
  await db
    .from("agent_memory")
    .update({ active: false })
    .eq("id", memoryId)
    .eq("user_id", userId);
}

// ──────────────────────────────────────────────
// GET ACTIVE MEMORIES
// ──────────────────────────────────────────────

export async function getActiveMemories(userId, category = null, limit = 50) {
  const db = createServerClient();

  let query = db
    .from("agent_memory")
    .select("id, category, content, confidence, source_type, last_confirmed_at, created_at")
    .eq("user_id", userId)
    .eq("active", true);

  if (category) query = query.eq("category", category);

  const { data } = await query
    .order("confidence", { ascending: false })
    .order("last_confirmed_at", { ascending: false })
    .limit(limit);

  return data || [];
}

// ══════════════════════════════════════════════════════════════
// EXTRACTION ENGINES
// ══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────
// EXTRACT FROM CHAT
// More sophisticated than the v1 version in /api/ai/route.js
// ──────────────────────────────────────────────

export async function extractFromChat(userId, userMessage, assistantMessage, chatContext = null) {
  // Skip trivial exchanges
  if (userMessage.length < 15 && assistantMessage.length < 80) return [];

  const existingMemories = chatContext?.memory || await getActiveMemories(userId);
  const existingStr = existingMemories
    .map(m => `[${m.category}] ${m.content}`)
    .join("\n");

  const systemPrompt = `You extract persistent facts about a user from their conversations with a health/fitness tracking assistant.

EXISTING MEMORIES (do NOT extract facts that duplicate these):
${existingStr || "(none yet)"}

CATEGORIES:
- routine: dosing schedules, regular habits, timing patterns
- goal: what the user is trying to achieve
- constraint: things the user wants to avoid or can't do
- preference: stylistic choices, formats they like
- health_pattern: recurring biomarker patterns, historical labs, body responses
- decision: conclusions the user has reached after deliberation
- context: life circumstances that affect protocol (schedule, work, etc.)

RULES:
- Only extract facts that will be useful weeks from now
- Don't extract one-off complaints or transient states
- Don't extract facts that are clearly temporary ("feeling tired today")
- Prefer specific over vague ("SHBG runs 16" > "SHBG is low")
- Confidence 0.9+ for directly stated facts
- Confidence 0.6-0.8 for inferred facts
- Skip anything ambiguous

Respond with ONLY a JSON array. No markdown. If nothing worth extracting, respond with [].
Format: [{"category":"routine|goal|constraint|preference|health_pattern|decision|context","content":"the fact","confidence":0.85}]`;

  try {
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
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `USER: "${userMessage}"\n\nASSISTANT: "${assistantMessage.slice(0, 800)}"`,
        }],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "[]";

    let extracted;
    try {
      extracted = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return [];
    }

    if (!Array.isArray(extracted)) return [];

    // Filter and store
    const results = [];
    for (const mem of extracted.slice(0, 5)) {
      if (!mem.category || !mem.content) continue;
      if (!VALID_CATEGORIES.includes(mem.category)) continue;
      if (mem.content.length < 10 || mem.content.length > 300) continue;

      try {
        const result = await addMemory(userId, mem.content, {
          category: mem.category,
          confidence: Math.min(1, Math.max(0, mem.confidence || 0.7)),
          sourceType: "chat",
        });
        if (result) results.push(result);
      } catch (err) {
        console.error("Failed to store memory:", err);
      }
    }

    return results;
  } catch (err) {
    console.error("extractFromChat failed:", err);
    return [];
  }
}

// ──────────────────────────────────────────────
// EXTRACT FROM LOG ENTRY
// When a user logs a daily entry, pull out durable patterns.
// ──────────────────────────────────────────────

export async function extractFromLog(userId, log) {
  const facts = [];

  // Note patterns, not daily noise
  if (log.physique_notes && log.physique_notes.length > 20) {
    // Only extract if it's a pattern-worthy observation
    const text = log.physique_notes.toLowerCase();
    if (text.includes("always") || text.includes("consistently") || text.includes("every time") || text.includes("usually")) {
      facts.push({
        category: "health_pattern",
        content: log.physique_notes,
        confidence: 0.75,
      });
    }
  }

  // Side effects that keep appearing — the cross-log detection happens in detectPatterns
  // Individual log-level extraction just catches new complaint patterns

  for (const fact of facts) {
    try {
      await addMemory(userId, fact.content, {
        ...fact,
        sourceType: "log",
        sourceId: log.id,
      });
    } catch {}
  }

  return facts;
}

// ──────────────────────────────────────────────
// DETECT PATTERNS ACROSS LOGS
// Runs periodically (weekly cron or on-demand) to find
// patterns that span multiple entries.
// ──────────────────────────────────────────────

export async function detectLogPatterns(userId) {
  const db = createServerClient();

  const { data: logs } = await db
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(30);

  if (!logs || logs.length < 5) return [];

  const patterns = [];

  // Pattern: consistent side effect
  const sideEffectCounts = {};
  logs.forEach(log => {
    if (!log.side_effects) return;
    log.side_effects.split(",").map(s => s.trim().toLowerCase()).forEach(se => {
      if (se) sideEffectCounts[se] = (sideEffectCounts[se] || 0) + 1;
    });
  });

  Object.entries(sideEffectCounts).forEach(([effect, count]) => {
    if (count >= Math.ceil(logs.length * 0.4)) {
      patterns.push({
        category: "health_pattern",
        content: `"${effect}" appears in ${count} of last ${logs.length} log entries — persistent side effect`,
        confidence: 0.8,
      });
    }
  });

  // Pattern: sleep quality correlation with specific compounds
  const lowSleepDays = logs.filter(l => l.sleep_score && l.sleep_score < 65);
  if (lowSleepDays.length >= 3 && lowSleepDays.length >= logs.length * 0.3) {
    patterns.push({
      category: "health_pattern",
      content: `Sleep score frequently below 65 (${lowSleepDays.length} of ${logs.length} days). May indicate compound timing issue.`,
      confidence: 0.7,
    });
  }

  // Pattern: mood trending low
  const moods = logs.map(l => l.mood).filter(Boolean);
  if (moods.length >= 5) {
    const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
    if (avg < 5) {
      patterns.push({
        category: "health_pattern",
        content: `Mood averaging ${avg.toFixed(1)}/10 over ${moods.length} entries — monitor for over-suppression or recovery issues`,
        confidence: 0.75,
      });
    }
  }

  // Store patterns
  for (const pattern of patterns) {
    try {
      await addMemory(userId, pattern.content, {
        category: pattern.category,
        confidence: pattern.confidence,
        sourceType: "log_pattern",
      });
    } catch {}
  }

  return patterns;
}

// ──────────────────────────────────────────────
// EXTRACT FROM ONBOARDING
// Store everything from the onboarding form as memory.
// ──────────────────────────────────────────────

export async function extractFromOnboarding(userId, profile) {
  const facts = [];

  if (profile.experience) {
    facts.push({
      category: "context",
      content: `${profile.experience} level with prior compound experience`,
      confidence: 0.95,
    });
  }

  if (profile.goals?.length) {
    profile.goals.forEach(goal => {
      facts.push({
        category: "goal",
        content: goal,
        confidence: 0.9,
      });
    });
  }

  if (profile.health_conditions && profile.health_conditions.toLowerCase() !== "none" && profile.health_conditions.length > 5) {
    facts.push({
      category: "constraint",
      content: `Health condition: ${profile.health_conditions}`,
      confidence: 0.95,
    });
  }

  if (profile.sensitivities && profile.sensitivities.toLowerCase() !== "none" && profile.sensitivities.length > 5) {
    facts.push({
      category: "constraint",
      content: `Sensitivities: ${profile.sensitivities}`,
      confidence: 0.95,
    });
  }

  if (profile.prior_cycles && profile.prior_cycles.toLowerCase() !== "none" && profile.prior_cycles.length > 10) {
    facts.push({
      category: "health_pattern",
      content: `Prior cycle history: ${profile.prior_cycles}`,
      confidence: 0.85,
    });
  }

  for (const fact of facts) {
    try {
      await addMemory(userId, fact.content, {
        category: fact.category,
        confidence: fact.confidence,
        sourceType: "onboarding",
        sourceId: userId,
      });
    } catch {}
  }

  return facts;
}

// ══════════════════════════════════════════════════════════════
// HELPER: SIMILARITY DETECTION
// ══════════════════════════════════════════════════════════════

function normalizeText(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "of", "to", "for", "with", "on", "in", "at", "by", "user", "users"]);
  return normalizeText(s).split(" ").filter(w => w.length > 2 && !stopWords.has(w));
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function findSimilarMemory(newFact, existing, threshold = 0.55) {
  let bestMatch = null;
  let bestScore = 0;

  for (const mem of existing) {
    const score = jaccardSimilarity(newFact, mem.content);
    if (score > threshold && score > bestScore) {
      bestScore = score;
      bestMatch = mem;
    }
  }

  return bestMatch;
}
