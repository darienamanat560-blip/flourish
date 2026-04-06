import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { parseBloodworkPDF, parseBloodworkText } from "@/lib/parser";
import { normalizeMarker } from "@/lib/markers";

// ══════════════════════════════════════════════════════════════
// POST /api/bloodwork/parse
//
// Parses a bloodwork PDF or text using Claude vision/text.
// Returns structured marker data for the user to review and edit
// before saving to the database via /api/bloodwork POST.
//
// Body (one of):
//   { type: "pdf", data: "base64-encoded-pdf-data" }
//   { type: "text", data: "raw lab report text" }
//
// Note: this endpoint can take 5-15 seconds depending on PDF length.
// Frontend should show a loading state.
// ══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const userId = await getUserId();
    const body = await request.json();

    if (!body.type || !body.data) {
      return NextResponse.json(
        { error: "type ('pdf' or 'text') and data are required" },
        { status: 400 }
      );
    }

    let parsed;
    try {
      if (body.type === "pdf") {
        parsed = await parseBloodworkPDF(body.data);
      } else if (body.type === "text") {
        parsed = await parseBloodworkText(body.data);
      } else {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
    } catch (parseError) {
      console.error("Parser error:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse lab report",
          detail: parseError.message,
          fallback: "manual_entry",
        },
        { status: 422 }
      );
    }

    // Normalize all parsed markers using the canonical marker dictionary
    const normalizedMarkers = (parsed.markers || []).map(m => {
      const normalized = normalizeMarker(m.name, m.value, m.unit, m.refLow, m.refHigh);
      return {
        ...normalized,
        // Pass through the original raw values too in case the user wants to verify
        rawName: m.name,
        rawValue: m.value,
        // Add computed flag info
        flaggedLow: normalized.refLow !== null && normalized.value < normalized.refLow,
        flaggedHigh: normalized.refHigh !== null && normalized.value > normalized.refHigh,
        // Was this marker recognized in our canonical list?
        recognized: !!normalized.canonical && normalized.canonical !== normalized.rawName.toLowerCase().replace(/\s+/g, "_"),
      };
    });

    return NextResponse.json({
      labName: parsed.labName,
      collectionDate: parsed.collectionDate,
      fasting: parsed.fasting,
      markers: normalizedMarkers,
      markerCount: normalizedMarkers.length,
    });
  } catch (error) {
    console.error("Parse endpoint error:", error);
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
