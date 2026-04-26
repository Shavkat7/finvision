// BM25-lite over the KB chunks. ~120 LoC, no external deps.
// Tuned for short, fact-heavy chunks.

import type { KBChunk } from "./flatten";
import { tokenize } from "./tokenize";
import { expandTokensWithSynonyms } from "./synonyms";

interface IndexedDoc {
  chunk: KBChunk;
  tokens: string[];
  tf: Map<string, number>;
}

export interface KBSearchHit {
  path: string;
  topic: string;
  text: string;
  score: number;
}

export class BM25Index {
  private docs: IndexedDoc[];
  private df: Map<string, number>;
  private avgDocLen: number;
  private readonly k1 = 1.5;
  // Mild length normalization — many KB chunks are very short,
  // and full-bio chunks shouldn't be penalized too hard.
  private readonly b = 0.5;

  constructor(chunks: KBChunk[]) {
    this.docs = chunks.map((chunk) => {
      // Inject synonyms at token level (preserves term frequency).
      const baseTokens = tokenize(chunk.text);
      const tokens = expandTokensWithSynonyms(baseTokens);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      return { chunk, tokens, tf };
    });

    this.df = new Map();
    for (const d of this.docs) {
      for (const t of new Set(d.tokens)) {
        this.df.set(t, (this.df.get(t) ?? 0) + 1);
      }
    }

    const totalLen = this.docs.reduce((s, d) => s + d.tokens.length, 0);
    this.avgDocLen = totalLen / Math.max(1, this.docs.length);
  }

  search(query: string, k = 5): KBSearchHit[] {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];

    const N = this.docs.length;
    const hits: Array<{ doc: IndexedDoc; score: number }> = [];

    for (const doc of this.docs) {
      let score = 0;

      for (const qt of qTokens) {
        const dft = this.df.get(qt) ?? 0;
        if (dft === 0) continue;
        const tft = doc.tf.get(qt) ?? 0;
        if (tft === 0) continue;

        const idf = Math.log(1 + (N - dft + 0.5) / (dft + 0.5));
        const numer = tft * (this.k1 + 1);
        const denom =
          tft + this.k1 * (1 - this.b + (this.b * doc.tokens.length) / this.avgDocLen);

        score += idf * (numer / denom);
      }

      // Topic boost: queries that share words with the topic name (e.g. "phone"
      // → topic "headquarters_and_contact") get a small lift.
      const topicTokens = tokenize(doc.chunk.topic.replace(/_/g, " "));
      const topicMatches = qTokens.filter((q) => topicTokens.includes(q)).length;
      if (topicMatches > 0) score += 0.5 * topicMatches;

      if (score > 0) hits.push({ doc, score });
    }

    hits.sort((a, b) => b.score - a.score);

    return hits.slice(0, k).map(({ doc, score }) => ({
      path: doc.chunk.path,
      topic: doc.chunk.topic,
      text: doc.chunk.text,
      score: Number(score.toFixed(3)),
    }));
  }

  size(): number {
    return this.docs.length;
  }
}
