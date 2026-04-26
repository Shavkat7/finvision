// POST /api/agent/qa-review
//
// Two input modes:
//   1. multipart/form-data with field `audio` (an audio File ≤ 20 MB)
//      → Gemini 2.5 Pro transcribes + analyzes in one multimodal call
//   2. application/json with field `transcript` (string)
//      → Skip transcription, just analyze
//
// Returns: { review: QAReview, latency_ms, model }

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getQAPrompt, type QALang } from "@/lib/agent/qa-prompt";
import type { QAReview } from "@/lib/agent/qa-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_QA_MODEL ?? "gemini-2.5-pro";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB inline limit for Gemini

let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

const TRANSIENT_RX =
  /\b(503|UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|429|temporarily|high demand)\b/i;

interface AnalyzeInput {
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

function normalizeLang(v: unknown): QALang {
  return v === "ru" || v === "en" ? v : "uz";  // default = uz
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";

  let input: AnalyzeInput;
  let mode: "audio" | "transcript" = "transcript";
  let lang: QALang = "uz";

  try {
    if (ct.startsWith("multipart/form-data")) {
      const fd = await req.formData();
      const audio = fd.get("audio");
      lang = normalizeLang(fd.get("lang"));
      if (!(audio instanceof File)) {
        return NextResponse.json({ error: "Missing 'audio' file in form data" }, { status: 400 });
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          { error: `Audio too large (${audio.size} bytes); max ${MAX_AUDIO_BYTES}` },
          { status: 413 },
        );
      }
      const buf = Buffer.from(await audio.arrayBuffer());
      const base64 = buf.toString("base64");
      mode = "audio";
      input = {
        parts: [
          { inlineData: { mimeType: audio.type || "audio/mpeg", data: base64 } },
          { text: "Transcribe the call above and produce the QA review JSON per the schema." },
        ],
      };
    } else {
      const body = (await req.json()) as { transcript?: string; lang?: string };
      lang = normalizeLang(body.lang);
      const transcript = (body.transcript ?? "").trim();
      if (!transcript) {
        return NextResponse.json({ error: "Missing 'transcript' string" }, { status: 400 });
      }
      input = {
        parts: [
          {
            text:
              `═══ TRANSCRIPT (already produced by call recorder) ═══\n${transcript}\n\n` +
              `═══ TASK ═══\nProduce the QA review JSON now.`,
          },
        ],
      };
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Bad request", detail: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  const ai = getClient();
  const t0 = Date.now();
  let rawText = "";
  let lastErr = "";

  // Up to 3 attempts on transient 5xx.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: input.parts }],
        config: {
          systemInstruction: getQAPrompt(lang),
          responseMimeType: "application/json",
          temperature: 0.2,
          // Pro requires thinking; give it room.
          maxOutputTokens: 8192,
        },
      });
      rawText = resp.text ?? "";
      if (attempt > 1) console.log(`[qa-review] succeeded on attempt ${attempt}`);
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      const transient = TRANSIENT_RX.test(lastErr);
      console.error(
        `[qa-review] attempt ${attempt}/3 ${transient ? "transient" : "fatal"}: ${lastErr.slice(0, 220)}`,
      );
      if (!transient || attempt === 3) {
        return NextResponse.json(
          { error: "QA analysis failed", detail: lastErr, transient },
          { status: transient ? 503 : 502 },
        );
      }
      await new Promise((r) => setTimeout(r, 400 * attempt * attempt));
    }
  }

  const cleaned = stripJsonFences(rawText);
  let parsed: QAReview;
  try {
    parsed = JSON.parse(cleaned) as QAReview;
  } catch {
    console.error(
      `[qa-review] failed to parse JSON (raw len=${rawText.length}). Head:\n${rawText.slice(0, 1200)}`,
    );
    return NextResponse.json(
      { error: "Model returned invalid JSON", raw: rawText.slice(0, 1200) },
      { status: 502 },
    );
  }

  return NextResponse.json({
    review: parsed,
    latency_ms: Date.now() - t0,
    model: MODEL,
    mode,
    lang,
  });
}

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
