"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CountUp } from "./CountUp";

interface CloseProbabilityProps {
  value: number; // 0-100
}

export function CloseProbability({ value }: CloseProbabilityProps) {
  const prevRef = useRef(value);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    setDelta(value - prevRef.current);
    prevRef.current = value;
    const id = setTimeout(() => setDelta(0), 1600);
    return () => clearTimeout(id);
  }, [value]);

  const color =
    value >= 70 ? "text-emerald-300" :
    value >= 50 ? "text-cyan-300" :
    value >= 30 ? "text-amber-300" : "text-rose-300";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10"
      title="AI's estimate that this call ends in a sale. Climbs as the customer engages and compliance fills."
    >
      <Target size={11} className="text-slate-400" />
      <div className="flex flex-col leading-none">
        <div className="text-[8px] uppercase tracking-[0.18em] text-slate-500">Will they buy?</div>
        <div className={`text-[13px] font-bold tabular-nums ${color}`}>
          <CountUp value={value} format={(n) => Math.round(n).toString() + "%"} />
        </div>
      </div>
      {delta !== 0 && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`text-[10px] tabular-nums flex items-center ${
            delta > 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {delta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          {Math.abs(Math.round(delta))}
        </motion.span>
      )}
    </div>
  );
}
