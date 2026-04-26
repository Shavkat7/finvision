// Browser-side knowledge base over user-uploaded documents.
// Reuses the same BM25Index class as the server-side SQB KB —
// it's environment-agnostic (no Node-only deps).

import { BM25Index, type KBSearchHit } from "./search";
import type { KBChunk } from "./flatten";

export interface UserDocument {
  id: string;
  filename: string;
  uploaded_at: number;
  characters: number;
  chunks: string[];
  preview: string;
}

let _index: BM25Index | null = null;
let _docsSnapshot: UserDocument[] = [];

function rebuild(docs: UserDocument[]): BM25Index {
  const allChunks: KBChunk[] = [];
  for (const d of docs) {
    d.chunks.forEach((text, i) => {
      allChunks.push({
        path: `${d.filename}#${i + 1}`,
        topic: d.filename,
        text,
        raw: null,
      });
    });
  }
  return new BM25Index(allChunks);
}

function ensureIndex(docs: UserDocument[]): BM25Index | null {
  if (docs.length === 0) return null;
  // Cheap identity check: same length + same ids → reuse.
  const same =
    docs.length === _docsSnapshot.length &&
    docs.every((d, i) => d.id === _docsSnapshot[i]?.id);
  if (!same || !_index) {
    _index = rebuild(docs);
    _docsSnapshot = docs;
  }
  return _index;
}

export function searchUserKB(
  docs: UserDocument[],
  query: string,
  k = 4,
): KBSearchHit[] {
  const idx = ensureIndex(docs);
  if (!idx) return [];
  return idx.search(query, k);
}

export function userKBSize(docs: UserDocument[]): number {
  return docs.reduce((s, d) => s + d.chunks.length, 0);
}
