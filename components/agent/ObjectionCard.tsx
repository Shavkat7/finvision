"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Objection } from "@/lib/agent/types";

const LABELS: Record<Objection, string> = {
  price_high:    "Price / rate too high",
  thinking:      "“I'll think about it”",
  comparison:    "Comparing with another bank",
  no_need:       "No current need",
  trust:         "Trust concern",
  wrong_time:    "Wrong moment / busy",
  other:         "Other objection",
};

interface ObjectionCardProps {
  objection: Objection | null;
  responseSuggestion?: string | null;
  warnings: string[];
}

export function ObjectionCard({ objection, responseSuggestion, warnings }: ObjectionCardProps) {
  const hasWarnings = warnings.length > 0;
  if (!objection && !hasWarnings) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className={[
          "rounded-2xl border p-4",
          hasWarnings
            ? "bg-red-500/10 border-red-500/30"
            : "bg-rose-500/10 border-rose-500/30",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={[
            "w-7 h-7 rounded-lg flex items-center justify-center",
            hasWarnings ? "bg-red-500/30" : "bg-rose-500/30",
          ].join(" ")}>
            <AlertTriangle size={14} className={hasWarnings ? "text-red-200" : "text-rose-200"} />
          </div>
          <div className={[
            "text-[11px] uppercase tracking-wider",
            hasWarnings ? "text-red-200" : "text-rose-200",
          ].join(" ")}>
            {hasWarnings ? "Compliance warning" : "Objection detected"}
          </div>
        </div>

        {objection && (
          <div className="text-[14px] font-medium text-white mb-1">
            {LABELS[objection]}
          </div>
        )}
        {responseSuggestion && (
          <div className="text-[13px] text-rose-50/90 leading-snug">
            <span className="text-[10px] uppercase tracking-wider text-rose-200/70 block mb-0.5">
              Suggested response
            </span>
            “{responseSuggestion}”
          </div>
        )}

        {hasWarnings && (
          <ul className="mt-2 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-[12px] text-red-100 leading-snug">
                ⚠ {w}
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
