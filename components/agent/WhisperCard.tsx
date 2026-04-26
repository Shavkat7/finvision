"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Loader2 } from "lucide-react";
import { TypewriterText } from "./TypewriterText";

interface WhisperCardProps {
  suggestion: string | null;
  busy: boolean;
  confidence: number; // 0-1
}

// The hero card. Largest, most prominent — the operator's PRIMARY signal.
export function WhisperCard({ suggestion, busy, confidence }: WhisperCardProps) {
  const conf = Math.max(0, Math.min(1, confidence));
  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/25 p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Lightbulb size={15} className="text-amber-300" />
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-amber-50 leading-tight">
            Suggest next move
          </div>
          <div className="text-[11px] text-amber-200/60">
            Single most useful tip · in your customer's language
          </div>
        </div>
        {busy ? (
          <Loader2 size={13} className="animate-spin text-amber-300" />
        ) : suggestion ? (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-200/70">
            <span className="tabular-nums">{Math.round(conf * 100)}%</span>
            <div className="w-10 h-1 rounded-full bg-amber-500/15 overflow-hidden">
              <motion.div
                animate={{ width: conf * 100 + "%" }}
                transition={{ duration: 0.4 }}
                className="h-full bg-amber-300"
              />
            </div>
          </div>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={suggestion ?? "empty"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="text-[16px] leading-relaxed text-amber-50/95 font-medium"
        >
          {suggestion ? <TypewriterText text={suggestion} /> : "Listening to the call…"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
