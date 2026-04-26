"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface CallTimerProps {
  startedAt: number | null;
  /** When set, the timer freezes at (frozenAt - startedAt) and stops ticking. */
  frozenAt?: number | null;
}

export function CallTimer({ startedAt, frozenAt }: CallTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Don't run the interval if there's no start time, or if the timer is frozen.
    if (!startedAt || frozenAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, frozenAt]);

  const endTime = frozenAt ?? now;
  const elapsed = startedAt ? Math.floor((endTime - startedAt) / 1000) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const frozen = Boolean(frozenAt);

  return (
    <div
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
        frozen
          ? "bg-slate-500/10 border-slate-500/30"
          : "bg-white/[0.04] border-white/10",
      ].join(" ")}
      title={frozen ? "Call ended — timer frozen" : "Live call duration"}
    >
      <Clock size={11} className={frozen ? "text-slate-500" : "text-slate-400"} />
      <div
        className={[
          "text-[13px] font-mono tabular-nums",
          frozen ? "text-slate-400" : "text-slate-200",
        ].join(" ")}
      >
        {startedAt ? `${mm}:${ss}` : "—"}
      </div>
      {frozen && (
        <span className="text-[9px] uppercase tracking-hud text-slate-500">
          ended
        </span>
      )}
    </div>
  );
}
