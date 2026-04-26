"use client";

import { motion } from "framer-motion";
import type { SentimentLabel } from "@/lib/agent/types";
import { useEffect, useRef, useState } from "react";

interface SentimentMeterProps {
  value: number;
  label: SentimentLabel;
}

const MAX_TRAIL = 20;

export function SentimentMeter({ value, label }: SentimentMeterProps) {
  const [trail, setTrail] = useState<number[]>([]);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastRef.current === value) return;
    lastRef.current = value;
    setTrail((cur) => {
      const next = [...cur, value];
      return next.length > MAX_TRAIL ? next.slice(-MAX_TRAIL) : next;
    });
  }, [value]);

  const pct = Math.max(0, Math.min(100, ((value + 1) / 2) * 100));
  const color =
    label === "positive" ? "from-emerald-500 to-accent-teal"
      : label === "negative" ? "from-rose-500 to-red-600"
        : "from-slate-500 to-slate-400";
  const emoji = label === "positive" ? "🙂" : label === "negative" ? "😟" : "😐";

  const w = 100, h = 22;
  const points = trail.length > 1
    ? trail.map((v, i) => {
        const x = (i / (trail.length - 1)) * w;
        const y = h - ((v + 1) / 2) * h;
        return `${x},${y.toFixed(2)}`;
      }).join(" ")
    : "";

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-3">
      <div
        className="flex items-center justify-between mb-1.5"
        title="Customer's mood right now, with a 20-point trend line. Pivot strategy if it dips."
      >
        <div>
          <div className="text-[11px] font-semibold text-slate-100 leading-tight">
            😊 Customer mood
          </div>
          <div className="text-[9px] uppercase tracking-hud text-slate-500">
            Sentiment + trend
          </div>
        </div>
        <div className="text-base">{emoji}</div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
        <motion.div
          animate={{ width: pct + "%" }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className={`h-full bg-gradient-to-r ${color}`}
        />
      </div>
      {points && (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[22px]" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={
              label === "positive" ? "text-emerald-400/70" :
              label === "negative" ? "text-rose-400/70" : "text-slate-400/60"
            }
          />
        </svg>
      )}
      <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mt-0.5">
        {label} · {trail.length} sample{trail.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
