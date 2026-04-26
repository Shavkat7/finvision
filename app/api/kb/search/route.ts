// POST /api/kb/search  —  body: { q: string, k?: number }
// Returns top-K matching chunks from the SQB knowledge base.

import { NextResponse } from "next/server";
import { searchKB, kbSize } from "@/lib/kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { q?: string; k?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const q = (body.q ?? "").trim();
  if (!q) return NextResponse.json({ error: "Missing `q`" }, { status: 400 });

  const k = Math.min(Math.max(Number(body.k ?? 5), 1), 10);
  const hits = searchKB(q, k);

  return NextResponse.json({
    query: q,
    total_chunks: kbSize(),
    hits,
  });
}

// Optional GET for debugging from the browser.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ total_chunks: kbSize(), usage: "?q=..." });
  }
  const k = Math.min(Math.max(Number(url.searchParams.get("k") ?? 5), 1), 10);
  return NextResponse.json({ query: q, hits: searchKB(q, k) });
}
