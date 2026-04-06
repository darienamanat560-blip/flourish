import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  addMemory,
  getActiveMemories,
  deactivateMemory,
  detectLogPatterns,
} from "@/lib/memory";

// ══════════════════════════════════════════════════════════════
// GET /api/memory
// List all active memories for the user, optionally filtered by category.
// ══════════════════════════════════════════════════════════════

export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "100");

    const memories = await getActiveMemories(userId, category, limit);

    // Group by category for easier consumption
    const grouped = {};
    memories.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push({
        id: m.id,
        content: m.content,
        confidence: m.confidence,
        source: m.source_type,
        createdAt: m.created_at,
        lastConfirmedAt: m.last_confirmed_at,
      });
    });

    return NextResponse.json({ memories, grouped, count: memories.length });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/memory error:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════
// POST /api/memory
// Manually add a memory. Used for "remember that I..." flows.
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { content, category, confidence = 0.9 } = body;

    if (!content || !category) {
      return NextResponse.json(
        { error: "content and category are required" },
        { status: 400 }
      );
    }

    const result = await addMemory(userId, content, {
      category,
      confidence,
      sourceType: "manual",
    });

    return NextResponse.json({ success: true, memory: result });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/memory error:", error);
    return NextResponse.json({ error: error.message || "Failed to add memory" }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════
// DELETE /api/memory?id=xxx
// Deactivate a memory (soft delete).
// ══════════════════════════════════════════════════════════════

export async function DELETE(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await deactivateMemory(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to deactivate memory" }, { status: 500 });
  }
}
