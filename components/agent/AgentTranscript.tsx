"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Turn, KeyEntity, EntityType } from "@/lib/agent/types";

interface AgentTranscriptProps {
  turns: Turn[];
  entities: KeyEntity[];
}

const ENTITY_COLORS: Record<EntityType, string> = {
  product:    "bg-accent-teal/15 border-accent-teal/40 text-accent-teal",
  amount_uzs: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  rate_pct:   "bg-amber-500/15 border-amber-500/40 text-amber-300",
  duration:   "bg-violet-500/15 border-violet-500/40 text-violet-300",
  location:   "bg-blue-500/15 border-blue-500/40 text-blue-300",
  date:       "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
  person:     "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300",
  occupation: "bg-pink-500/15 border-pink-500/40 text-pink-300",
  company:    "bg-indigo-500/15 border-indigo-500/40 text-indigo-300",
  competitor: "bg-rose-500/15 border-rose-500/40 text-rose-300",
};

export function AgentTranscript({ turns, entities }: AgentTranscriptProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  return (
    <div ref={ref} className="h-full overflow-y-auto px-3 py-3 space-y-2">
      <AnimatePresence initial={false}>
        {turns.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className={t.speaker === "agent" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={[
                "max-w-[88%] px-3 py-2 rounded-xl text-[12.5px] leading-relaxed",
                t.speaker === "agent"
                  ? "bg-gradient-to-br from-indigo-600/70 to-violet-700/70 text-white rounded-br-sm border border-indigo-400/30"
                  : t.speaker === "system"
                    ? "bg-amber-500/10 text-amber-200 border border-amber-500/20 italic"
                    : "bg-white/[0.05] text-slate-100 border border-white/[0.08] rounded-bl-sm",
              ].join(" ")}
            >
              <div className="text-[9px] uppercase tracking-[0.18em] opacity-60 mb-0.5 flex items-center gap-1">
                <span
                  className={`w-1 h-1 rounded-full ${t.speaker === "agent" ? "bg-indigo-300" : "bg-slate-300"}`}
                />
                {t.speaker === "agent" ? "Agent" : t.speaker === "customer" ? "Customer" : "System"}
                <span className="ml-auto text-slate-400 normal-case tracking-normal opacity-70 tabular-nums">
                  {new Date(t.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{t.text}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {turns.length === 0 && (
        <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
          Waiting for the call to start…
        </div>
      )}

      {entities.length > 0 && (
        <div className="sticky bottom-0 -mx-3 px-3 py-2 border-t border-white/5 bg-bg-elevated/80 backdrop-blur">
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 mb-1.5">
            Entities ({entities.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {entities.slice(0, 12).map((e, i) => (
              <span
                key={i}
                className={[
                  "px-1.5 py-0.5 rounded border text-[10px] tabular-nums",
                  ENTITY_COLORS[e.type] ?? "bg-white/[0.05] border-white/10 text-slate-300",
                ].join(" ")}
                title={e.type}
              >
                {e.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
