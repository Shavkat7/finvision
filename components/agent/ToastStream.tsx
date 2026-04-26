"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, AlertTriangle, ArrowUp, Info, Target } from "lucide-react";
import type { Analysis } from "@/lib/agent/types";
import { COMPLIANCE_LABELS } from "@/lib/agent/types";
import { uid } from "@/lib/utils";

type ToastTone = "ok" | "warn" | "info" | "milestone";

interface Toast {
  id: string;
  tone: ToastTone;
  text: string;
  ts: number;
}

interface ToastStreamProps {
  prev: Analysis | null;
  next: Analysis | null;
}

const TTL_MS = 4500;

export function ToastStream({ prev, next }: ToastStreamProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!next) return;
    const fresh = derive(prev, next);
    if (fresh.length === 0) return;
    setToasts((cur) => [...cur, ...fresh]);
    fresh.forEach((t) => {
      setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== t.id));
      }, TTL_MS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.slice(-4).map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className={[
              "max-w-xs px-3 py-2 rounded-xl border shadow-lg backdrop-blur",
              "flex items-center gap-2 text-[12px] pointer-events-auto",
              t.tone === "ok" &&
                "bg-emerald-500/15 border-emerald-500/40 text-emerald-100 shadow-emerald-500/20",
              t.tone === "warn" &&
                "bg-rose-500/15 border-rose-500/40 text-rose-100 shadow-rose-500/20",
              t.tone === "milestone" &&
                "bg-cyan-500/15 border-cyan-500/40 text-cyan-100 shadow-cyan-500/20",
              t.tone === "info" &&
                "bg-white/[0.06] border-white/15 text-slate-100",
            ].filter(Boolean).join(" ")}
          >
            <ToastIcon tone={t.tone} />
            <span className="leading-snug">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  const size = 13;
  if (tone === "ok") return <Check size={size} className="text-emerald-300 shrink-0" />;
  if (tone === "warn") return <AlertTriangle size={size} className="text-rose-300 shrink-0" />;
  if (tone === "milestone") return <Target size={size} className="text-cyan-300 shrink-0" />;
  return <Info size={size} className="text-slate-300 shrink-0" />;
}

function derive(prev: Analysis | null, next: Analysis): Toast[] {
  if (!prev) return [];
  const out: Toast[] = [];

  // Stage advance
  if (prev.stage !== next.stage) {
    out.push({
      id: uid(), ts: Date.now(), tone: "info",
      text: `Stage → ${pretty(next.stage)}`,
    });
  }

  // Compliance items flipping true
  for (const k of Object.keys(next.compliance) as Array<keyof typeof next.compliance>) {
    const before = prev.compliance[k];
    const after = next.compliance[k];
    if (k === "no_guaranteed_promises") continue; // negative — handled in warnings
    if (!before && after) {
      out.push({
        id: uid(), ts: Date.now(), tone: "ok",
        text: `Compliance ✓ ${COMPLIANCE_LABELS[k]}`,
      });
    }
  }

  // New warning(s)
  if (next.warnings.length > prev.warnings.length) {
    const newest = next.warnings.slice(prev.warnings.length);
    for (const w of newest) {
      out.push({ id: uid(), ts: Date.now(), tone: "warn", text: `⚠ ${w}` });
    }
  }

  // New objection
  if (!prev.detected_objection && next.detected_objection) {
    out.push({
      id: uid(), ts: Date.now(), tone: "warn",
      text: `Objection: ${pretty(next.detected_objection)}`,
    });
  }

  // Close-prob milestones
  const milestones = [50, 70, 80, 90];
  for (const m of milestones) {
    if (prev.close_probability_pct < m && next.close_probability_pct >= m) {
      out.push({
        id: uid(), ts: Date.now(), tone: "milestone",
        text: `Close probability ≥ ${m}%`,
      });
    }
  }

  return out;
}

function pretty(s: string): string {
  return s.replace(/_/g, " ");
}
