import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  retrieveUserContext,
  buildSystemPrompt,
  formatMessagesForClaude,
} from "@/lib/context";

// ══════════════════════════════════════════════════════════════
// POST /api/ai
//
// The main chat endpoint. Flow:
//   1. Authenticate user via Clerk
//   2. Retrieve full user context from Supabase
//   3. Build grounded system prompt
//   4. Call Claude with context + chat history + new message
//   5. Store user message + assistant response
//   6. Optionally extract memories and insights
//   7. Return the response
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    // 1. Auth
    const userId = await getUserId();
    const body = await request.json();
    const { message, threadId, extractMemory = true } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = createServerClient();

    // 2. Get or create chat thread
    let activeThreadId = threadId;
    if (!activeThreadId) {
      // Check for existing active thread
      const { data: existingThread } = await db
        .from("chat_threads")
        .select("id")
        .eq("user_id", userId)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (existingThread) {
        activeThreadId = existingThread.id;
      } else {
        // Create new thread
        const { data: newThread } = await db
          .from("chat_threads")
          .insert({ user_id: userId, title: message.slice(0, 60) })
          .select("id")
          .single();
        activeThreadId = newThread.id;
      }
    }

    // 3. Retrieve full user context
    const context = await retrieveUserContext(userId, {
      includeChat: true,
      chatThreadId: activeThreadId,
      chatMessageLimit: 20,
      includeMemory: true,
      includeInsights: true,
      includeBloodwork: true,
      includeTraining: true,
    });

    // 4. Build the prompt
    const systemPrompt = buildSystemPrompt(context);
    const messages = formatMessagesForClaude(context.chatHistory, message);

    // 5. Call Claude
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!claudeResponse.ok) {
      const errData = await claudeResponse.json().catch(() => ({}));
      console.error("Claude API error:", claudeResponse.status, errData);
      return NextResponse.json(
        { error: "AI service error", detail: errData },
        { status: 502 }
      );
    }

    const claudeData = await claudeResponse.json();
    const assistantMessage =
      claudeData.content?.map((block) => block.text || "").join("") || "";

    // 6. Store messages
    const messagesToStore = [
      {
        thread_id: activeThreadId,
        user_id: userId,
        role: "user",
        content: message,
      },
      {
        thread_id: activeThreadId,
        user_id: userId,
        role: "assistant",
        content: assistantMessage,
        model: "claude-sonnet-4-20250514",
        tokens_used: claudeData.usage?.output_tokens || null,
        context_snapshot: {
          compounds: context.compounds.map((c) => c.name),
          latestWeight: context.recentLogs[0]?.weight || null,
          latestMood: context.recentLogs[0]?.mood || null,
          memoryCount: context.memory.length,
          alertCount: context.alerts.length,
        },
      },
    ];

    await db.from("chat_messages").insert(messagesToStore);

    // 7. Extract memories (async — don't block the response)
    if (extractMemory) {
      extractMemoriesFromChat(db, userId, message, assistantMessage, context)
        .catch((err) => console.error("Memory extraction failed:", err));
    }

    // 8. Return
    return NextResponse.json({
      message: assistantMessage,
      threadId: activeThreadId,
      model: "claude-sonnet-4-20250514",
      tokensUsed: claudeData.usage?.output_tokens || null,
    });
  } catch (error) {
    console.error("AI route error:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════
// MEMORY EXTRACTION
//
// After each conversation turn, ask Claude to identify any
// persistent facts worth remembering. This runs asynchronously
// so it doesn't slow down the chat response.
// ══════════════════════════════════════════════════════════════

async function extractMemoriesFromChat(db, userId, userMsg, assistantMsg, context) {
  try {
    // Only extract from substantive conversations
    if (userMsg.length < 20 && assistantMsg.length < 100) return;

    // Build extraction prompt
    const existingMemories = context.memory
      .map((m) => `[${m.category}] ${m.fact}`)
      .join("\n");

    const extractionResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You extract persistent facts about a user from their conversations with a health/fitness tracking assistant. 

EXISTING MEMORIES (do not duplicate these):
${existingMemories || "(none yet)"}

Extract NEW facts only. Categories: routine, goal, constraint, preference, health_pattern, decision, context.

Respond ONLY with a JSON array. No markdown, no explanation. If nothing new to extract, respond with [].
Format: [{"category":"...","content":"...","confidence":0.8}]`,
          messages: [
            {
              role: "user",
              content: `USER said: "${userMsg}"\n\nASSISTANT replied: "${assistantMsg.slice(0, 500)}"`,
            },
          ],
        }),
      }
    );

    if (!extractionResponse.ok) return;

    const extractionData = await extractionResponse.json();
    const text =
      extractionData.content?.map((b) => b.text || "").join("") || "[]";

    let memories;
    try {
      memories = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return; // Failed to parse — skip silently
    }

    if (!Array.isArray(memories) || memories.length === 0) return;

    // Store new memories
    const rows = memories
      .filter((m) => m.content && m.category)
      .slice(0, 5) // max 5 per turn
      .map((m) => ({
        user_id: userId,
        category: m.category,
        content: m.content,
        confidence: Math.min(1, Math.max(0, m.confidence || 0.7)),
        source_type: "chat",
      }));

    if (rows.length > 0) {
      await db.from("agent_memory").insert(rows);
    }
  } catch (err) {
    // Non-critical — log and move on
    console.error("Memory extraction error:", err);
  }
}
