"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Save, RefreshCcw } from "lucide-react";
import { useState } from "react";
import type { Analysis, Turn } from "@/lib/agent/types";
import { COMPLIANCE_LABELS } from "@/lib/agent/types";

interface SummaryModalProps {
  open: boolean;
  onClose: () => void;
  turns: Turn[];
  analysis: Analysis | null;
  customerName: string;
  /** Real call timestamps — used for the duration metric. */
  startedAt?: number | null;
  endedAt?: number | null;
  onStartNewCall?: () => void;
}

function formatDuration(startedAt?: number | null, endedAt?: number | null): string | null {
  if (!startedAt) return null;
  const end = endedAt ?? Date.now();
  const sec = Math.max(0, Math.floor((end - startedAt) / 1000));
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = (sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function SummaryModal({
  open, onClose, turns, analysis, customerName,
  startedAt, endedAt, onStartNewCall,
}: SummaryModalProps) {
  const [logged, setLogged] = useState(false);

  const completedCompliance = analysis
    ? (Object.keys(COMPLIANCE_LABELS) as Array<keyof typeof COMPLIANCE_LABELS>).filter(
        (k) => analysis.compliance[k] === true && k !== "no_guaranteed_promises",
      )
    : [];
  const totalCompliance = Object.keys(COMPLIANCE_LABELS).length - 1;
  const violations = analysis?.warnings ?? [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(92vw,640px)] max-h-[88vh] overflow-y-auto rounded-3xl bg-bg-elevated border border-white/10 shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-bg-elevated/95 backdrop-blur z-10">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400">
                  Post-call summary
                </div>
                <div className="text-lg font-semibold text-white">{customerName}</div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <SummarySection title="Outcome">
                <div className="text-sm text-slate-100">
                  {analysis?.call_outcome_so_far ?? "—"}
                </div>
              </SummarySection>

              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Duration"
                  value={formatDuration(startedAt, endedAt) ?? `${turns.length} turns`}
                  sub={formatDuration(startedAt, endedAt) ? `${turns.length} turns` : undefined}
                  emoji="⏱"
                />
                <Metric
                  label="Compliance"
                  value={`${completedCompliance.length}/${totalCompliance}`}
                  emoji="✅"
                  ok={completedCompliance.length === totalCompliance}
                />
                <Metric
                  label="Stage reached"
                  value={analysis?.stage?.replace(/_/g, " ") ?? "—"}
                  emoji="🎯"
                  ok={analysis?.stage === "wrap_up"}
                />
                <Metric
                  label="Quality score"
                  value={qualityScore(analysis, completedCompliance.length, totalCompliance)}
                  emoji="🏅"
                />
              </div>

              {analysis?.next_best_offer && (
                <SummarySection title="Recommended offer">
                  <div className="text-sm text-slate-100 font-medium">
                    {analysis.next_best_offer.product}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {analysis.next_best_offer.rationale}
                  </div>
                </SummarySection>
              )}

              {violations.length > 0 && (
                <SummarySection title="Compliance warnings" tone="error">
                  <ul className="text-sm text-red-200 space-y-1">
                    {violations.map((w, i) => (
                      <li key={i}>⚠ {w}</li>
                    ))}
                  </ul>
                </SummarySection>
              )}

              <SummarySection title="Action items">
                <ul className="text-sm text-slate-200 space-y-1">
                  <li>📅 Follow-up call in 2 business days</li>
                  <li>📑 Send mortgage documents checklist via SQB Mobile</li>
                  <li>🏢 Confirm in-branch consultation slot</li>
                </ul>
              </SummarySection>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setLogged(true)}
                  disabled={logged}
                  className={[
                    "flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition",
                    logged
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200"
                      : "bg-gradient-to-br from-accent-teal to-cyan-600 text-white hover:scale-[1.01]",
                  ].join(" ")}
                >
                  {logged ? (
                    <>
                      <Check size={16} /> Logged to CRM
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Log to CRM
                    </>
                  )}
                </button>
                {onStartNewCall && (
                  <button
                    onClick={onStartNewCall}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-white/[0.04] border border-white/15 text-slate-200 hover:bg-white/[0.08] transition"
                  >
                    <RefreshCcw size={14} />
                    Start new call
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SummarySection({
  title, children, tone,
}: {
  title: string; children: React.ReactNode; tone?: "error";
}) {
  return (
    <section>
      <div className={`text-[11px] uppercase tracking-wider mb-1.5 ${tone === "error" ? "text-red-300" : "text-slate-400"}`}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label, value, emoji, ok, sub,
}: {
  label: string; value: string | number; emoji: string; ok?: boolean; sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <span>{emoji}</span>
        {label}
      </div>
      <div className={`text-base font-semibold mt-1 capitalize ${ok ? "text-emerald-300" : "text-slate-100"}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-slate-500 mt-0.5 normal-case">
          {sub}
        </div>
      )}
    </div>
  );
}

function qualityScore(
  a: Analysis | null,
  done: number,
  total: number,
): string {
  if (!a) return "—";
  let s = 70;
  s += Math.round((done / Math.max(1, total)) * 20);   // up to +20 for compliance
  s += Math.round(((a.sentiment + 1) / 2) * 10);       // up to +10 for sentiment
  if ((a.warnings ?? []).length > 0) s -= 15;
  s = Math.max(0, Math.min(100, s));
  return `${s}/100`;
}
