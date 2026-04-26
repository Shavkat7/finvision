// Mints a short-lived ephemeral token for direct browser-to-Gemini WebSocket.
// The actual GEMINI_API_KEY never leaves this server.

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Singleton — re-creating on every request is slow and contributes to flakiness.
let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in env");
  _ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });
  return _ai;
}

interface CreateError {
  message: string;
  name?: string;
  status?: number;
}

function parseError(e: unknown): CreateError {
  if (e instanceof Error) {
    const anyE = e as Error & { status?: number; code?: number };
    return {
      message: e.message,
      name: e.name,
      status: anyE.status ?? anyE.code,
    };
  }
  return { message: String(e) };
}

async function mintToken(model: string): Promise<{ token: string; expiresAt: string; model: string }> {
  const ai = getClient();
  const now = new Date();
  const expireTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 min
  // Default newSessionExpireTime is 60s — explicitly extend to 5 min so a
  // slow first-paint or HMR delay doesn't kill the token before the WS opens.
  const newSessionExpireTime = new Date(now.getTime() + 5 * 60 * 1000);

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: expireTime.toISOString(),
      newSessionExpireTime: newSessionExpireTime.toISOString(),
    },
  });

  if (!token?.name) throw new Error("Token returned without `name` field");

  return {
    token: token.name,
    expiresAt: expireTime.toISOString(),
    model,
  };
}

export async function POST() {
  const model = process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";

  if (!process.env.GEMINI_API_KEY) {
    console.error("[/api/token] GEMINI_API_KEY missing");
    return NextResponse.json(
      { error: "Server misconfigured", detail: "GEMINI_API_KEY not set" },
      { status: 500 },
    );
  }

  // Up to 3 attempts on transient 5xx; backoff 200ms, 600ms.
  let lastErr: CreateError | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const out = await mintToken(model);
      if (attempt > 1) {
        console.log(`[/api/token] succeeded on attempt ${attempt}`);
      }
      return NextResponse.json(out);
    } catch (e) {
      const parsed = parseError(e);
      lastErr = parsed;
      console.error(
        `[/api/token] attempt ${attempt}/3 failed:`,
        parsed.name ?? "Error",
        parsed.message,
        parsed.status ? `(status=${parsed.status})` : "",
      );
      // Don't retry obvious 4xx (bad key, quota etc).
      const status = parsed.status ?? 0;
      if (status >= 400 && status < 500) break;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 200 * attempt * attempt));
    }
  }

  return NextResponse.json(
    {
      error: "Failed to mint token",
      detail: lastErr?.message ?? "Unknown error",
      upstreamStatus: lastErr?.status,
    },
    { status: lastErr?.status && lastErr.status >= 400 && lastErr.status < 500 ? lastErr.status : 502 },
  );
}
