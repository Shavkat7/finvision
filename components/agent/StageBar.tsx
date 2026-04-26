"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { SalesStage } from "@/lib/agent/types";

const STAGES: { id: SalesStage; label: string }[] = [
  { id: "greeting",            label: "Greeting" },
  { id: "discovery",           label: "Discovery" },
  { id: "presentation",        label: "Presentation" },
  { id: "objection_handling",  label: "Objection" },
  { id: "closing",             label: "Closing" },
  { id: "kyc",                 label: "KYC" },
  { id: "wrap_up",             label: "Wrap-up" },
];

export function StageBar({ current }: { current: SalesStage }) {
  const currentIdx = Math.max(0, STAGES.findIndex((s) => s.id === current));
  const isComplete = current === "wrap_up";
  const progressPct = ((currentIdx + 1) / STAGES.length) * 100;

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/8 px-4 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-medium text-slate-200 flex items-center gap-1.5">
          {isComplete && <CheckCircle2 size={13} className="text-emerald-400" />}
          <span>
            Stage <span className="text-slate-500">·</span>{" "}
            <span className="text-accent-teal">{STAGES[currentIdx].label}</span>
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-slate-400">
          {currentIdx + 1}<span className="text-slate-600">/{STAGES.length}</span>
        </div>
      </div>

      {/* Compact progress track */}
      <div className="relative h-1 rounded-full bg-white/5 overflow-hidden mb-2">
        <motion.div
          animate={{ width: progressPct + "%" }}
          transition={{ type: "spring", stiffness: 110, damping: 26 }}
          className={`h-full ${
            isComplete
              ? "bg-gradient-to-r from-emerald-400 to-accent-teal"
              : "bg-gradient-to-r from-cyan-500 to-accent-teal"
          }`}
        />
      </div>

      {/* Stage pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {STAGES.map((s, i) => {
          const passed = i < currentIdx;
          const active = i === currentIdx;
          return (
            <span
              key={s.id}
              className={[
                "px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition",
                active
                  ? "bg-accent-teal/15 text-accent-teal font-semibold"
                  : passed
                    ? "text-emerald-400/80"
                    : "text-slate-600",
              ].join(" ")}
            >
              {passed ? "✓ " : ""}
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
