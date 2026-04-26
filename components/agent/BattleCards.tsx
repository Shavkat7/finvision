"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { Objection } from "@/lib/agent/types";

const OBJECTION_LABELS: Record<Objection, string> = {
  price_high:    "Price / rate too high",
  thinking:      "“I'll think about it”",
  comparison:    "Comparing with another bank",
  no_need:       "No current need",
  trust:         "Trust concern",
  wrong_time:    "Wrong moment / busy",
  other:         "Other objection",
};

interface BattleCardsProps {
  objection: Objection | null;
  primary: string | null;
  alternatives: string[];
  warnings: string[];
}

export function BattleCards({
  objection, primary, alternatives, warnings,
}: BattleCardsProps) {
  const hasObjection = Boolean(objection);
  const hasWarnings = warnings.length > 0;
  if (!hasObjection && !hasWarnings) return null;

  // Ordered, deduped responses (primary first, then alternatives).
  const responses = primary
    ? [primary, ...alternatives.filter((a) => a !== primary)]
    : alternatives;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={[
        "rounded-2xl border p-3.5",
        hasWarnings
          ? "bg-red-500/8 border-red-500/40 shadow-[0_0_30px_-12px_rgba(239,68,68,0.5)]"
          : "bg-rose-500/8 border-rose-500/30 shadow-[0_0_30px_-12px_rgba(244,63,94,0.4)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={[
          "w-6 h-6 rounded-lg flex items-center justify-center",
          hasWarnings ? "bg-red-500/30" : "bg-rose-500/30",
        ].join(" ")}>
          <AlertTriangle size={12} className={hasWarnings ? "text-red-200" : "text-rose-200"} />
        </div>
        <div className={[
          "text-[10px] uppercase tracking-[0.18em]",
          hasWarnings ? "text-red-200" : "text-rose-200",
        ].join(" ")}>
          {hasWarnings ? "Compliance warning" : "Battle card"}
        </div>
        {objection && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-rose-300/80 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded">
            {OBJECTION_LABELS[objection]}
          </span>
        )}
      </div>

      {hasWarnings && (
        <ul className="mb-2 space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-[12px] text-red-100 leading-snug">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      {responses.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 px-1">
            Approved responses · click to copy
          </div>
          {responses.slice(0, 3).map((r, i) => (
            <ResponseChip key={r} text={r} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ResponseChip({ text, index }: { text: string; index: number }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="w-full text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 hover:border-rose-300/40 transition group"
    >
      <div className="flex items-start gap-2">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 shrink-0 mt-0.5 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 text-[12.5px] text-slate-100 leading-snug">
          “{text}”
        </div>
        <span className={[
          "shrink-0 text-[10px] flex items-center gap-1 transition",
          copied ? "text-emerald-300 opacity-100" : "text-slate-500 opacity-0 group-hover:opacity-100",
        ].join(" ")}>
          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
        </span>
      </div>
    </button>
  );
}
