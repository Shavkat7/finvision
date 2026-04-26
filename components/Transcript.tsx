"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { TranscriptEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TranscriptProps {
  entries: TranscriptEntry[];
  emptyText?: string;
}

export function Transcript({ entries, emptyText }: TranscriptProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  return (
    <div
      ref={ref}
      className="h-full overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10"
    >
      <AnimatePresence initial={false}>
        {entries.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "flex",
              e.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[82%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                e.role === "user" &&
                  "bg-gradient-to-br from-teal-500/90 to-cyan-600/90 text-white rounded-br-md",
                e.role === "assistant" &&
                  "bg-white/[0.06] backdrop-blur text-slate-100 border border-white/[0.08] rounded-bl-md",
                e.role === "system" &&
                  "bg-amber-500/10 text-amber-200 border border-amber-500/20",
                e.role === "tool" &&
                  "bg-blue-500/10 text-blue-200 border border-blue-500/20",
                e.partial && "opacity-80",
              )}
            >
              {e.role === "tool" && (
                <div className="text-[11px] uppercase tracking-wider opacity-70 mb-1">
                  🔧 {e.toolName}
                </div>
              )}
              <div className="whitespace-pre-wrap">{e.text || "…"}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {entries.length === 0 && (
        <div className="h-full flex items-center justify-center text-slate-500 text-sm">
          {emptyText ?? "Suhbat shu yerda paydo bo'ladi"}
        </div>
      )}
    </div>
  );
}
