"use client";

import { Banknote } from "lucide-react";
import { CountUp } from "./CountUp";

interface DealValueCounterProps {
  value: number; // UZS
}

export function DealValueCounter({ value }: DealValueCounterProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/30"
      title="Estimated SQB margin if the customer accepts the recommended product. 0 if no offer yet."
    >
      <Banknote size={11} className="text-emerald-400" />
      <div className="flex flex-col leading-none">
        <div className="text-[8px] uppercase tracking-[0.18em] text-emerald-300/70">
          Bank revenue
        </div>
        <div className="text-[13px] font-bold text-emerald-300 tabular-nums">
          <CountUp
            value={value}
            format={(n) => {
              if (n < 1) return "—";
              if (n < 1_000_000) return `${Math.round(n / 1_000)}k`;
              if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
              return `${(n / 1_000_000_000).toFixed(2)}B`;
            }}
          />
          <span className="text-[10px] ml-0.5 opacity-70">UZS</span>
        </div>
      </div>
    </div>
  );
}
