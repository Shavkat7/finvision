// Shared client-side helper: POST a file to /api/kb/upload and turn the
// response into a UserDocument with a fresh id. Used by both the header
// KnowledgeUpload panel and the inline composer paperclip.

import type { UserDocument } from "./types";

interface UploadResponse {
  filename: string;
  bytes: number;
  characters: number;
  chunks: string[];
  preview: string;
}

export async function uploadDocument(file: File): Promise<UserDocument> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/kb/upload", { method: "POST", body: fd });
  if (!res.ok) {
    let body: { error?: string } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new Error(body.error ?? `Upload failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as UploadResponse;

  return {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    filename: data.filename,
    uploaded_at: Date.now(),
    characters: data.characters,
    chunks: data.chunks,
    preview: data.preview,
  };
}
