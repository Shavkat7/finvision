// POST /api/agent/analyze
// Body: { profile, turns, prevCompliance }
// Returns: Analysis JSON (stage, intent, sentiment, objection, NBO,
// whisper, compliance, warnings, outcome).

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildAnalysisPrompt } from "@/lib/agent/prompt";
import type {
  Analysis,
  ComplianceState,
  CustomerProfile,
  Turn,
} from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// gemini-2.5-flash-lite is the right balance for per-turn analysis:
// strong-enough structured JSON, ~1.5–2.5 s latency. Pro is materially
// better but takes ~20 s per turn — unusable for a live demo.
// Override via env if you want pro: GEMINI_ANALYSIS_MODEL=gemini-2.5-pro
const MODEL = process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-flash-lite";

// Singleton client.
let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

interface RequestBody {
  profile: CustomerProfile;
  turns: Turn[];
  prevCompliance: ComplianceState;
}

// Match transient upstream errors that warrant a retry.
const TRANSIENT_RX =
  /\b(503|UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|429|temporarily|high demand)\b/i;

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.profile || !Array.isArray(body.turns) || !body.prevCompliance) {
    return NextResponse.json(
      { error: "Required: { profile, turns, prevCompliance }" },
      { status: 400 },
    );
  }

  const { system, user } = buildAnalysisPrompt(
    body.profile,
    body.turns,
    body.prevCompliance,
  );

  const ai = getClient();
  const t0 = Date.now();

  // ─── Generate with retry on transient 5xx / 429 ───
  let rawText = "";
  let lastErr = "";
  let succeeded = false;

  // Pro models require thinking mode (rejecting thinkingBudget: 0).
  // Flash variants accept budget 0, which saves output tokens.
  const isFlash = /flash|lite/i.test(MODEL);
  const generationConfig: Record<string, unknown> = {
    systemInstruction: system,
    responseMimeType: "application/json",
    temperature: 0.3,
    // Pro needs more headroom for the thinking trace + JSON output.
    maxOutputTokens: isFlash ? 2048 : 4096,
  };
  if (isFlash) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: MODEL,
        contents: user,
        config: generationConfig,
      });
      rawText = resp.text ?? "";
      succeeded = true;
      if (attempt > 1) {
        console.log(`[/api/agent/analyze] succeeded on attempt ${attempt}`);
      }
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      const transient = TRANSIENT_RX.test(lastErr);
      console.error(
        `[/api/agent/analyze] attempt ${attempt}/3 ${transient ? "transient" : "fatal"}: ${lastErr.slice(0, 220)}`,
      );
      if (!transient || attempt === 3) {
        return NextResponse.json(
          { error: "Analyze failed", detail: lastErr, transient },
          { status: transient ? 503 : 502 },
        );
      }
      // Backoff before retry: 300ms, 900ms.
      await new Promise((r) => setTimeout(r, 300 * attempt * attempt));
    }
  }

  if (!succeeded) {
    return NextResponse.json(
      { error: "Analyze failed", detail: lastErr || "no response" },
      { status: 502 },
    );
  }

  const elapsed = Date.now() - t0;

  // ─── Parse + merge compliance ───
  const cleaned = stripJsonFences(rawText);
  let parsed: Analysis;
  try {
    parsed = JSON.parse(cleaned) as Analysis;
  } catch {
    console.error(
      "[/api/agent/analyze] failed to parse JSON. raw length=" + rawText.length,
      "\n>>>>", rawText.slice(0, 1200),
    );
    return NextResponse.json(
      { error: "Model returned invalid JSON", raw: rawText.slice(0, 1200) },
      { status: 502 },
    );
  }

  // Compliance is cumulative — never regress an item from true → false,
  // EXCEPT for "no_guaranteed_promises" which can flip to false on violation.
  const merged: ComplianceState = { ...body.prevCompliance };
  for (const k of Object.keys(merged) as (keyof ComplianceState)[]) {
    const next = parsed.compliance?.[k];
    if (typeof next === "boolean") {
      if (k === "no_guaranteed_promises") {
        merged[k] = next;
      } else {
        merged[k] = merged[k] || next;
      }
    }
  }
  parsed.compliance = merged;

  // ─── Deterministic stage post-processor ───
  // The LLM is conservative and often parks the call at "kyc"/"closing" even
  // after the customer has said goodbye. Detect farewell tokens explicitly
  // and force "wrap_up" so the StageBar lights up the final pill.
  const lastFew = body.turns.slice(-3).map((t) => t.text.toLowerCase()).join(" | ");
  if (FAREWELL_RX.test(lastFew)) {
    if (parsed.close_probability_pct < 75) parsed.close_probability_pct = 80;
    parsed.stage = "wrap_up";
  }

  return NextResponse.json({ analysis: parsed, latency_ms: elapsed, model: MODEL });
}

// Farewell signals across uz/ru/en. Tuned for high precision (no false fires
// on "rahmat / thank you" alone — needs an actual goodbye token nearby).
const FAREWELL_RX = new RegExp(
  [
    // Uzbek
    "\\bxayr\\b",
    "yaxshi\\s*kun\\s*tilayman",
    "ko'rishguncha",
    "ertaga\\s*uchrashamiz",
    "ko'rishamiz",
    "salomat\\s*bo'ling",
    // Russian
    "до\\s*свидан",
    "\\bпока\\b",
    "всего\\s*хорошего",
    "до\\s*завтра",
    "увидимся",
    // English
    "goodbye",
    "bye[,.\\s!]",
    "\\bbye\\b",
    "see\\s*you\\s*(tomorrow|later|soon)",
    "have\\s*a\\s*good\\s*(day|evening)",
  ].join("|"),
  "iu",
);

function stripJsonFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i !== -1 && j !== -1 && j > i) t = t.slice(i, j + 1);
  return t;
}
