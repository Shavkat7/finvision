"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { CountUp } from "./CountUp";

interface HealthScoreProps {
  value: number; // 0-100
}

export function HealthScore({ value }: HealthScoreProps) {
  const tier =
    value >= 80 ? "glowing" :
    value >= 60 ? "warm" :
    value >= 40 ? "cool" :
    value >= 20 ? "tense" : "hostile";

  const ringColor =
    value >= 70 ? "stroke-emerald-400" :
    value >= 40 ? "stroke-amber-400" : "stroke-rose-400";

  const bgGradient =
    value >= 70 ? "from-emerald-500/15 to-teal-500/5 border-emerald-500/30" :
    value >= 40 ? "from-amber-500/15 to-orange-500/5 border-amber-500/30" :
    "from-rose-500/15 to-red-500/5 border-rose-500/30";

  // Stroke-dasharray ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${bgGradient} border p-4`}>
      <div
        className="flex items-center gap-2 mb-3"
        title="0-100. Combines sentiment (40%), engagement (30%), compliance progress (20%), objection recovery (10%)."
      >
        <Activity size={13} className="text-emerald-300" />
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-white leading-tight">
            Call going well?
          </div>
          <div className="text-[11px] text-slate-400">
            Customer health
          </div>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-[96px] h-[96px] shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            <circle
              cx="48" cy="48" r={radius}
              className="stroke-white/10 fill-none"
              strokeWidth="7"
            />
            <motion.circle
              cx="48" cy="48" r={radius}
              className={`fill-none ${ringColor}`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ type: "spring", stiffness: 100, damping: 26 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[26px] font-bold text-white tabular-nums leading-none">
              <CountUp value={value} />
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-400">Tier</div>
          <div className="text-[15px] font-semibold text-white capitalize mb-1">
            {tier}
          </div>
          <div className="text-[11px] text-slate-400 leading-snug">
            Sentiment, engagement, compliance, objection recovery
          </div>
        </div>
      </div>
    </div>
  );
}
