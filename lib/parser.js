// ══════════════════════════════════════════════════════════════
// BLOODWORK PARSER
//
// Takes a PDF file (base64) or raw text from a lab report and uses
// Claude to extract structured marker data. Falls back gracefully
// if parsing fails — user can always do manual entry.
// ══════════════════════════════════════════════════════════════

const PARSE_SYSTEM_PROMPT = `You are a medical lab report parser. Extract every blood marker from the provided lab report.

CRITICAL RULES:
- Extract EVERY marker you find, not just common ones
- Preserve the exact name as printed on the report
- Convert values to numbers (no units in the value field)
- Extract reference ranges if present
- Identify the lab name and collection date if visible
- If a value has special characters like "<5" or ">100", use the numeric portion

OUTPUT FORMAT — respond with ONLY this JSON, no markdown, no explanation:

{
  "labName": "Quest Diagnostics" or "LabCorp" etc, or null,
  "collectionDate": "YYYY-MM-DD" or null,
  "fasting": true/false/null,
  "markers": [
    {
      "name": "Total Testosterone",
      "value": 854,
      "unit": "ng/dL",
      "refLow": 264,
      "refHigh": 916,
      "flag": null
    }
  ]
}

If you cannot extract anything meaningful, return: {"labName": null, "collectionDate": null, "markers": []}`;

// ──────────────────────────────────────────────
// Parse PDF (base64) using Claude vision
// ──────────────────────────────────────────────

export async function parseBloodworkPDF(base64Data) {
  if (!base64Data) throw new Error("No PDF data provided");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Extract all blood markers from this lab report.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();

  if (data.stop_reason === "max_tokens") {
    console.warn("Parser hit max_tokens — response was truncated. Attempting recovery.");
  }

  const text = data.content?.map(b => b.text || "").join("") || "";
  return parseClaudeResponse(text);
}

// ──────────────────────────────────────────────
// Parse plain text (e.g. user pasted lab report)
// ──────────────────────────────────────────────

export async function parseBloodworkText(text) {
  if (!text?.trim()) throw new Error("No text provided");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract all blood markers from this lab report text:\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  const responseText = data.content?.map(b => b.text || "").join("") || "";
  return parseClaudeResponse(responseText);
}

// ──────────────────────────────────────────────
// Extract JSON from Claude's response.
//
// Handles two failure modes:
//   1. Normal parse — complete JSON, JSON.parse succeeds directly.
//   2. Truncation recovery — response cut off mid-array (max_tokens hit).
//      Finds the last fully-closed marker object and patches the JSON closed,
//      salvaging all complete markers before the cutoff point.
// ──────────────────────────────────────────────

function parseClaudeResponse(text) {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const jsonStart = cleaned.indexOf("{");
  if (jsonStart === -1) {
    throw new Error("Could not find JSON in parser response");
  }

  // ── Attempt 1: normal full parse ──
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonEnd !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      if (parsed.markers && Array.isArray(parsed.markers)) {
        return parsed;
      }
    } catch {
      // Fall through to truncation recovery
    }
  }

  // ── Attempt 2: truncation recovery ──
  // Salvage all complete marker objects from the partial response.
  try {
    const partial = cleaned.slice(jsonStart);

    const labNameMatch  = partial.match(/"labName"\s*:\s*("(?:[^"\\]|\\.)*"|null)/);
    const dateMatch     = partial.match(/"collectionDate"\s*:\s*("(?:[^"\\]|\\.)*"|null)/);
    const fastingMatch  = partial.match(/"fasting"\s*:\s*(true|false|null)/);

    const markersKeyIdx = partial.indexOf('"markers"');
    if (markersKeyIdx === -1) throw new Error("No markers key in truncated response");

    const arrayOpen = partial.indexOf("[", markersKeyIdx);
    if (arrayOpen === -1) throw new Error("No markers array in truncated response");

    // Walk the array content tracking brace depth to find last complete object
    const arrayContent = partial.slice(arrayOpen + 1);
    let depth = 0;
    let lastCompleteEnd = -1;

    for (let i = 0; i < arrayContent.length; i++) {
      const ch = arrayContent[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) lastCompleteEnd = i;
      }
    }

    if (lastCompleteEnd === -1) throw new Error("No complete marker objects in truncated response");

    const salvaged = arrayContent.slice(0, lastCompleteEnd + 1);

    const patched = `{"labName":${labNameMatch ? labNameMatch[1] : "null"},"collectionDate":${dateMatch ? dateMatch[1] : "null"},"fasting":${fastingMatch ? fastingMatch[1] : "null"},"markers":[${salvaged}],"_truncated":true}`;

    const parsed = JSON.parse(patched);
    if (!Array.isArray(parsed.markers) || parsed.markers.length === 0) {
      throw new Error("Truncation recovery found no usable markers");
    }

    console.warn(`Parser truncation recovery: salvaged ${parsed.markers.length} markers.`);
    return parsed;
  } catch (recoveryErr) {
    throw new Error(`Failed to parse JSON: ${recoveryErr.message}`);
  }
}
