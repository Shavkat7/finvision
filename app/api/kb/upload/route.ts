// POST /api/kb/upload  —  multipart form, single field "file".
// Parses PDF / DOCX / TXT / MD into plain text, splits into chunks,
// and returns chunks to the browser for in-memory BM25 indexing.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const CHUNK_TARGET_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 120;

interface UploadResult {
  filename: string;
  bytes: number;
  characters: number;
  chunks: string[];
  preview: string;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${file.size} bytes); max ${MAX_BYTES}` },
      { status: 413 },
    );
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    if (ext === "txt" || ext === "md" || ext === "markdown") {
      text = buf.toString("utf-8");
    } else if (ext === "docx") {
      // mammoth — DOCX → text
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else if (ext === "pdf") {
      // pdf-parse — dynamic import avoids the package's startup-time test pdf read
      const pdfParseMod = await import("pdf-parse");
      const pdfParse = (pdfParseMod as { default?: typeof pdfParseMod }).default ?? pdfParseMod;
      // @ts-expect-error — runtime call
      const data = await pdfParse(buf);
      text = data.text;
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}. Use pdf, docx, txt, or md.` },
        { status: 415 },
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Failed to parse: ${msg}` }, { status: 422 });
  }

  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (text.length < 20) {
    return NextResponse.json(
      { error: "Document appears empty or unreadable" },
      { status: 422 },
    );
  }

  const chunks = chunkText(text, CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS);
  const preview = text.slice(0, 240) + (text.length > 240 ? "…" : "");

  const result: UploadResult = {
    filename: file.name,
    bytes: file.size,
    characters: text.length,
    chunks,
    preview,
  };
  return NextResponse.json(result);
}

// Split on paragraph boundaries, then merge into ~1200-char chunks
// with a small overlap to keep semantic continuity for BM25 + LLM.
function chunkText(text: string, target: number, overlap: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let cur = "";
  for (const p of paragraphs) {
    if (cur.length + 1 + p.length > target && cur.length > 0) {
      chunks.push(cur);
      // start the next chunk with the tail of the previous one for overlap
      cur = cur.slice(Math.max(0, cur.length - overlap)) + " " + p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur) chunks.push(cur);

  // If a single paragraph was already huge, hard-split.
  const out: string[] = [];
  for (const c of chunks) {
    if (c.length <= target * 1.5) {
      out.push(c);
    } else {
      for (let i = 0; i < c.length; i += target - overlap) {
        out.push(c.slice(i, i + target));
      }
    }
  }
  return out;
}
