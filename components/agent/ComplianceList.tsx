"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle } from "lucide-react";
import type { ComplianceState } from "@/lib/agent/types";
import { COMPLIANCE_LABELS } from "@/lib/agent/types";

export function ComplianceList({ state }: { state: ComplianceState }) {
  const items = (Object.keys(COMPLIANCE_LABELS) as (keyof ComplianceState)[]).map((k) => ({
    key: k,
    label: COMPLIANCE_LABELS[k],
    done: state[k],
    isViolation: k === "no_guaranteed_promises" && !state[k],
  }));
  const completed = items.filter((i) => i.done && !i.isViolation).length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-3.5">
      <div
        className="flex items-center justify-between mb-2"
        title="KYC/AML items the agent must confirm. Items glow green when the AI detects them; red ✕ if a 'guaranteed' / illegal promise is made."
      >
        <div>
          <div className="text-[11px] font-semibold text-slate-100 leading-tight">
            📋 Required disclosures
          </div>
          <div className="text-[9px] uppercase tracking-hud text-slate-500">
            KYC / compliance · auto-tracked
          </div>
        </div>
        <div className="text-[11px] tabular-nums text-slate-300">
          {completed}<span className="text-slate-500">/{items.length}</span>
        </div>
      </div>

      <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-3">
        <motion.div
          animate={{ width: pct + "%" }}
          transition={{ duration: 0.4 }}
          className="h-full bg-gradient-to-r from-emerald-500 to-accent-teal"
        />
      </div>

      <ul className="space-y-1">
        <AnimatePresence>
          {items.map((item) => (
            <motion.li
              key={item.key}
              layout
              animate={item.done ? { x: [0, 1, 0] } : {}}
              className={[
                "flex items-start gap-2 text-[11.5px] leading-snug px-1 py-0.5 rounded",
                item.isViolation && "text-red-300 bg-red-500/8",
                item.done && !item.isViolation && "bg-emerald-500/4",
              ].filter(Boolean).join(" ")}
            >
              {item.isViolation ? (
                <span className="w-3.5 h-3.5 rounded-sm bg-red-500/30 border border-red-500/60 flex items-center justify-center shrink-0 mt-0.5 text-red-200">
                  ✕
                </span>
              ) : item.done ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-3.5 h-3.5 rounded-sm bg-emerald-500/30 border border-emerald-500/60 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                >
                  <Check size={9} className="text-emerald-200" strokeWidth={3} />
                </motion.span>
              ) : (
                <Circle size={13} className="shrink-0 mt-0.5 text-slate-600" />
              )}
              <span className={item.done ? "text-emerald-200/90" : "text-slate-300"}>
                {item.label}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
