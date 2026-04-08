import { NextResponse } from "next/server";
export const maxDuration = 60;

import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  retrieveUserContext,
  buildSystemPrompt,
  formatMessagesForClaude,
} from "@/lib/context";
import { extractFromChat } from "@/lib/memory";

// ══════════════════════════════════════════════════════════════
// POST /api/ai
//
// The main chat endpoint. Flow:
//   1. Authenticate user via Clerk
//   2. Retrieve full user context from Supabase
//   3. Build grounded system prompt
//   4. Call Claude with context + chat history + new message
//   5. Store user message + assistant response
//   6. Extract memories (async, non-blocking)
//   7. Return the response
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { message, threadId, extractMemory = true } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = createServerClient();

    // Get or create thread
    let activeThreadId = threadId;
    if (!activeThreadId) {
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
        const { data: newThread } = await db
          .from("chat_threads")
          .insert({ user_id: userId, title: message.slice(0, 60) })
          .select("id")
          .single();
        activeThreadId = newThread.id;
      }
    }

    // Retrieve full user context
    const context = await retrieveUserContext(userId, {
      includeChat: true,
      chatThreadId: activeThreadId,
      chatMessageLimit: 20,
      includeMemory: true,
      includeInsights: true,
      includeBloodwork: true,
      includeTraining: true,
    });

    // Build prompt + call Claude
    const systemPrompt = buildSystemPrompt(context);
    const messages = formatMessagesForClaude(context.chatHistory, message);

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

    // Store messages
    await db.from("chat_messages").insert([
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
    ]);

    // Extract memories async (non-blocking)
    if (extractMemory) {
      extractFromChat(userId, message, assistantMessage, context)
        .catch((err) => console.error("Memory extraction failed:", err));
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
