// Flatten the structured SQB KB JSON into semantically coherent chunks.
//
// Heuristic:
// - Primitives → one chunk per leaf
// - Arrays of strings → one combined chunk
// - Arrays of objects → one chunk per object (full object dump)
// - Small objects (<500 chars JSON) at depth ≥ 2 → one combined chunk
// - Larger objects → recurse

import { pathToReadable } from "./tokenize";

export interface KBChunk {
  /** dotted path with array indices, e.g. `executive_management_board_2026.members.[2]` */
  path: string;
  /** the top-level section this chunk belongs to */
  topic: string;
  /** human-readable summary, used for ranking AND for what the LLM/UI sees */
  text: string;
  /** raw value (string/object) — useful if the consumer wants structured access */
  raw: unknown;
}

const MAX_INLINE_OBJECT_LEN = 500;
const MAX_TEXT_LEN = 1200;

export function flatten(json: unknown): KBChunk[] {
  const chunks: KBChunk[] = [];
  _flatten(json, [], chunks);
  return chunks;
}

function _flatten(node: unknown, path: string[], out: KBChunk[]): void {
  if (node === null || node === undefined) return;

  const topic = path[0] ?? "root";

  // Primitives.
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    if (path.length === 0) return; // skip top-level scalar (none expected)
    const readablePath = pathToReadable(path);
    out.push({
      path: path.join("."),
      topic,
      text: clip(`${readablePath}: ${String(node)}`),
      raw: node,
    });
    return;
  }

  if (Array.isArray(node)) {
    // Array of strings/numbers → one combined chunk.
    if (node.length > 0 && node.every((x) => typeof x === "string" || typeof x === "number")) {
      out.push({
        path: path.join("."),
        topic,
        text: clip(`${pathToReadable(path)}: ${node.join("; ")}`),
        raw: node,
      });
      return;
    }
    // Array of objects → chunk per element.
    node.forEach((item, i) => {
      const itemPath = [...path, `[${i}]`];
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        out.push({
          path: itemPath.join("."),
          topic,
          text: clip(`${pathToReadable(itemPath)}: ${objectToReadable(item as Record<string, unknown>)}`),
          raw: item,
        });
      } else {
        _flatten(item, itemPath, out);
      }
    });
    return;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const serLen = JSON.stringify(obj).length;

    // Small object at depth ≥ 2 → bundle.
    if (path.length >= 2 && serLen < MAX_INLINE_OBJECT_LEN) {
      out.push({
        path: path.join("."),
        topic,
        text: clip(`${pathToReadable(path)}: ${objectToReadable(obj)}`),
        raw: obj,
      });
      return;
    }

    for (const [k, v] of Object.entries(obj)) {
      _flatten(v, [...path, k], out);
    }
  }
}

function objectToReadable(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/_/g, " ");
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      parts.push(`${key}: ${v}`);
    } else if (Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number")) {
      parts.push(`${key}: ${v.join(", ")}`);
    } else if (typeof v === "object") {
      parts.push(`${key}: ${objectToReadable(v as Record<string, unknown>)}`);
    }
  }
  return parts.join("; ");
}

function clip(s: string, max = MAX_TEXT_LEN): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
