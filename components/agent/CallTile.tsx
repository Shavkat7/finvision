"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Headphones, Megaphone } from "lucide-react";
import type { ConcurrentCall } from "@/lib/agent/supervisor-mock";
import { CountUp } from "./CountUp";

interface CallTileProps {
  call: ConcurrentCall;
  onListen: (c: ConcurrentCall) => void;
  onBarge: (c: ConcurrentCall) => void;
}

const STAGE_LABELS: Record<string, string> = {
  greeting:           "Greeting",
  discovery:          "Discovery",
  presentation:       "Presentation",
  objection_handling: "Objection",
  closing:            "Closing",
  kyc:                "KYC",
  wrap_up:            "Wrap-up",
};

function fmtDuration(sec: number): string {
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = (sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function CallTile({ call, onListen, onBarge }: CallTileProps) {
  const sentColor =
    call.sentiment > 0.3 ? "text-emerald-300" :
    call.sentiment < -0.3 ? "text-rose-300" : "text-slate-300";
  const sentEmoji =
    call.sentiment > 0.3 ? "🙂" :
    call.sentiment < -0.3 ? "😟" : "😐";

  const healthColor =
    call.health >= 70 ? "from-emerald-500 to-accent-teal" :
    call.health >= 40 ? "from-amber-500 to-orange-500" :
    "from-rose-500 to-red-600";

  const compliancePct = (call.compliance_done / 8) * 100;
  const closeColor =
    call.close_prob_pct >= 70 ? "text-emerald-300" :
    call.close_prob_pct >= 40 ? "text-cyan-300" :
    "text-amber-300";

  const initials = call.customer_name
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="rounded-2xl bg-white/[0.03] border border-white/8 p-3.5 shadow-lg shadow-black/30 hover:border-white/15 transition relative overflow-hidden"
    >
      {/* live ribbon */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

      <div className="flex items-center gap-3 mb-2.5">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-white text-[12px] font-semibold shadow-md shadow-indigo-500/30 shrink-0">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-bg dot-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-white truncate leading-tight">
            {call.customer_name}
          </div>
          <div className="text-[10px] text-slate-400 truncate uppercase tracking-wider">
            {call.agent_name} · {call.language}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Duration
          </div>
          <div className="text-[12px] tabular-nums font-mono text-slate-200">
            {fmtDuration(call.duration_sec)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-[11px]">
        <span className="px-2 py-0.5 rounded-md bg-accent-teal/15 border border-accent-teal/30 text-accent-teal uppercase tracking-wider">
          {STAGE_LABELS[call.stage] ?? call.stage}
        </span>
        <span className={`flex items-center gap-1 ${sentColor}`}>
          {sentEmoji}
          <span className="tabular-nums">{(call.sentiment * 100).toFixed(0)}</span>
        </span>
      </div>

      <div className="mb-1 truncate text-[11px] text-slate-300">
        🎯 {call.product_in_discussion}
      </div>

      {/* Health bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">
          <span>Health</span>
          <span className="tabular-nums text-slate-300"><CountUp value={call.health} /></span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            animate={{ width: call.health + "%" }}
            transition={{ type: "spring", stiffness: 100, damping: 26 }}
            className={`h-full bg-gradient-to-r ${healthColor}`}
          />
        </div>
      </div>

      {/* Compliance bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">
          <span>Compliance</span>
          <span className="tabular-nums text-slate-300">{call.compliance_done}/8</span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            animate={{ width: compliancePct + "%" }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-emerald-500 to-accent-teal"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          Close prob
        </div>
        <div className={`text-[15px] font-bold tabular-nums ${closeColor}`}>
          <CountUp value={call.close_prob_pct} format={(n) => Math.round(n) + "%"} />
        </div>
      </div>

      {call.warnings > 0 && (
        <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-200 text-[10px]">
          <AlertTriangle size={10} />
          <span>{call.warnings} compliance warning{call.warnings === 1 ? "" : "s"}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onListen(call)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 hover:bg-white/[0.08] hover:border-white/20 text-[11px] transition"
        >
          <Headphones size={11} />
          Listen
        </button>
        <button
          onClick={() => onBarge(call)}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/20 text-[11px] transition"
        >
          <Megaphone size={11} />
          Barge in
        </button>
      </div>
    </motion.div>
  );
}
