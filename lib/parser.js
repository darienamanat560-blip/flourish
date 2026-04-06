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
      "flag": null  // or "L" for low, "H" for high if marked on report
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
      max_tokens: 4000,
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
      max_tokens: 4000,
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
// Extract JSON from Claude's response
// ──────────────────────────────────────────────

function parseClaudeResponse(text) {
  // Strip code fences if present
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Find the JSON object
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Could not find JSON in parser response");
  }

  const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.markers || !Array.isArray(parsed.markers)) {
      throw new Error("Invalid structure: missing markers array");
    }
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }
}
