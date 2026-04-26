// Singleton facade for the SQB knowledge base.
// Loads JSON once at module init, builds the BM25 index, exposes search().

import sqbData from "../../sqb_enriched_knowledge_base.json";
import { flatten } from "./flatten";
import { BM25Index, type KBSearchHit } from "./search";

let _index: BM25Index | null = null;

function getIndex(): BM25Index {
  if (_index) return _index;
  const chunks = flatten(sqbData);
  _index = new BM25Index(chunks);
  // eslint-disable-next-line no-console
  console.log(`[kb] Loaded SQB KB — ${chunks.length} chunks indexed`);
  return _index;
}

export function searchKB(query: string, k = 5): KBSearchHit[] {
  return getIndex().search(query, k);
}

export function kbSize(): number {
  return getIndex().size();
}

export type { KBSearchHit };
