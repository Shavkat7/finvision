"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, ShieldCheck, ShieldAlert,
  TrendingUp, Lightbulb, MessageSquare,
} from "lucide-react";
import type { QAReview } from "@/lib/agent/qa-types";
import { CountUp } from "@/components/agent/CountUp";

const OUTCOME_LABELS: Record<QAReview["call_outcome"], { label: string; tone: "ok" | "warn" | "info" }> = {
  sale_closed:           { label: "Sale closed",           tone: "ok"   },
  appointment_scheduled: { label: "Appointment scheduled", tone: "ok"   },
  follow_up_needed:      { label: "Follow-up needed",      tone: "info" },
  no_sale:               { label: "No sale",               tone: "warn" },
  complaint:             { label: "Complaint raised",      tone: "warn" },
  unclear:               { label: "Outcome unclear",       tone: "info" },
};

const COMPLIANCE_LABELS: Record<keyof QAReview["compliance"], string> = {
  full_name_confirmed:        "Customer's full name confirmed",
  purpose_explained:          "Purpose of the call clearly explained",
  rate_disclosed:             "Interest rate disclosed",
  consent_obtained:           "Data-processing consent obtained",
  cooling_off_mentioned:      "Cooling-off period / right to refuse",
  no_guaranteed_promises:     "No 'guaranteed profit' / illegal promises",
};

interface QAResultsProps {
  review: QAReview;
  latencyMs?: number;
  model?: string;
}

export function QAResults({ review, latencyMs, model }: QAResultsProps) {
  const outcome = OUTCOME_LABELS[review.call_outcome];
  const violations = review.ethics_violations ?? [];
  const strengths = review.strengths ?? [];
  const recs = review.coaching_recommendations ?? [];
  const arc = review.sentiment_arc ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ── Header summary ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-hud text-slate-400">
            Post-call summary
          </span>
          <span className={[
            "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-hud border",
            outcome.tone === "ok"   && "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
            outcome.tone === "warn" && "bg-rose-500/10 border-rose-500/30 text-rose-200",
            outcome.tone === "info" && "bg-cyan-500/10 border-cyan-500/30 text-cyan-200",
          ].filter(Boolean).join(" ")}>
            {outcome.label}
          </span>
          <span className="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
            <span>⏱ ~{review.duration_estimate_minutes} min</span>
            <span>·</span>
            <span className="uppercase">{review.language_detected}</span>
            {latencyMs && <><span>·</span><span>analysis {(latencyMs / 1000).toFixed(1)}s</span></>}
            {model && <><span>·</span><span className="font-mono opacity-60">{model}</span></>}
          </span>
        </div>
        <p className="text-[15px] text-slate-100 leading-relaxed">{review.summary}</p>
      </motion.div>

      {/* ── Score grid ───────────────────────────────────────────── */}
      <ScoreGrid scores={review.scores} />

      {/* ── Two columns: violations + strengths ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ViolationsPanel items={violations} />
        <StrengthsPanel items={strengths} />
      </div>

      {/* ── Compliance grid ──────────────────────────────────────── */}
      <CompliancePanel flags={review.compliance} />

      {/* ── Sentiment arc ────────────────────────────────────────── */}
      {arc.length > 0 && <SentimentArcPanel arc={arc} />}

      {/* ── Coaching recommendations ─────────────────────────────── */}
      {recs.length > 0 && (
        <Panel
          title="Coaching recommendations"
          subtitle="Actionable items the manager can deliver verbatim"
          icon={<Lightbulb size={14} className="text-amber-300" />}
          tone="amber"
        >
          <ol className="space-y-2 list-decimal list-inside marker:text-amber-300">
            {recs.map((r, i) => (
              <li key={i} className="text-[13.5px] text-slate-100 leading-relaxed pl-1">{r}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* ── Transcript ──────────────────────────────────────────── */}
      {review.transcript?.length > 0 && (
        <Panel
          title="Annotated transcript"
          subtitle="Speaker-tagged · re-segmented by the AI"
          icon={<MessageSquare size={14} className="text-slate-300" />}
        >
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
            {review.transcript.map((t, i) => (
              <TranscriptRow
                key={i}
                line={t}
                violations={violations}
                strengths={strengths}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ─── ScoreGrid ───────────────────────────────────────────────────
function ScoreGrid({ scores }: { scores: QAReview["scores"] }) {
  const items: Array<{ key: keyof QAReview["scores"]; label: string }> = [
    { key: "overall",            label: "Overall" },
    { key: "empathy",            label: "Empathy" },
    { key: "script_adherence",   label: "Script adherence" },
    { key: "objection_handling", label: "Objection handling" },
    { key: "compliance",         label: "Compliance" },
    { key: "closing",            label: "Closing" },
  ];
  const tone = (n: number) =>
    n >= 80 ? "from-emerald-500 to-accent-teal text-emerald-300 border-emerald-500/40" :
    n >= 60 ? "from-amber-500 to-orange-500 text-amber-300 border-amber-500/40" :
    "from-rose-500 to-red-600 text-rose-300 border-rose-500/40";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => {
        const v = Math.max(0, Math.min(100, Number(scores?.[it.key] ?? 0)));
        const t = tone(v);
        const ringColor =
          v >= 80 ? "stroke-emerald-400" :
          v >= 60 ? "stroke-amber-400" :
          "stroke-rose-400";
        const r = 28;
        const c = 2 * Math.PI * r;
        const off = c - (v / 100) * c;
        return (
          <div key={it.key} className={`rounded-2xl bg-white/[0.02] border p-3 flex items-center gap-3 ${t.split(" ").slice(-1)[0]}`}>
            <div className="relative w-[64px] h-[64px] shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                <circle cx="32" cy="32" r={r} className="stroke-white/10 fill-none" strokeWidth="5" />
                <motion.circle
                  cx="32" cy="32" r={r}
                  className={`fill-none ${ringColor}`}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={c}
                  animate={{ strokeDashoffset: off }}
                  transition={{ type: "spring", stiffness: 100, damping: 26 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-[15px] font-bold tabular-nums text-white`}>
                  <CountUp value={v} />
                </div>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-hud text-slate-400 leading-tight">
              {it.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ViolationsPanel ─────────────────────────────────────────────
function ViolationsPanel({ items }: { items: QAReview["ethics_violations"] }) {
  return (
    <Panel
      title={`Ethics violations (${items.length})`}
      subtitle={items.length === 0 ? "None detected — clean call" : "Flag and coach"}
      icon={<ShieldAlert size={14} className="text-rose-300" />}
      tone={items.length === 0 ? "emerald" : "rose"}
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-[13px] text-emerald-200">
          <CheckCircle2 size={14} />
          No ethics issues found in this call.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((v, i) => (
            <li key={i} className="rounded-xl bg-rose-500/8 border border-rose-500/25 p-3">
              <div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-hud">
                <span className={[
                  "px-1.5 py-0.5 rounded text-[9px] font-bold",
                  v.severity === "high"   && "bg-rose-500/30 text-rose-100",
                  v.severity === "medium" && "bg-amber-500/30 text-amber-100",
                  v.severity === "low"    && "bg-slate-500/30 text-slate-200",
                ].filter(Boolean).join(" ")}>
                  {v.severity}
                </span>
                <span className="text-rose-200">{v.type.replace(/_/g, " ")}</span>
                {v.regulation_violated && (
                  <span className="ml-auto text-[9px] text-rose-300/70 normal-case">{v.regulation_violated}</span>
                )}
              </div>
              <div className="text-[13px] text-rose-50 italic mb-1.5 leading-snug">
                “{v.quote}”
              </div>
              <div className="text-[12px] text-slate-300 leading-relaxed">{v.explanation}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ─── StrengthsPanel ──────────────────────────────────────────────
function StrengthsPanel({ items }: { items: QAReview["strengths"] }) {
  return (
    <Panel
      title={`What was great (${items.length})`}
      subtitle="Acknowledge in the coaching session"
      icon={<CheckCircle2 size={14} className="text-emerald-300" />}
      tone="emerald"
    >
      {items.length === 0 ? (
        <div className="text-[13px] text-slate-400 italic">
          Nothing notable to praise — coaching focus needed.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s, i) => (
            <li key={i} className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-3">
              <div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-hud text-emerald-200">
                <span>✓</span>
                <span>{s.type.replace(/_/g, " ")}</span>
              </div>
              <div className="text-[13px] text-emerald-50 italic mb-1.5 leading-snug">
                “{s.quote}”
              </div>
              <div className="text-[12px] text-slate-300 leading-relaxed">{s.explanation}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ─── CompliancePanel ─────────────────────────────────────────────
function CompliancePanel({ flags }: { flags: QAReview["compliance"] }) {
  const items = (Object.keys(COMPLIANCE_LABELS) as Array<keyof QAReview["compliance"]>);
  const done = items.filter((k) => flags[k] && k !== "no_guaranteed_promises").length
    + (flags.no_guaranteed_promises ? 1 : 0);
  const total = items.length;
  return (
    <Panel
      title={`KYC / Compliance · ${done}/${total}`}
      subtitle="Required disclosures (auto-detected)"
      icon={<ShieldCheck size={14} className="text-cyan-300" />}
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((k) => {
          const ok = flags[k] === true;
          const violation = k === "no_guaranteed_promises" && !ok;
          return (
            <li
              key={k}
              className={[
                "flex items-start gap-2 px-2.5 py-2 rounded-lg border text-[12.5px]",
                violation
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : ok
                    ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-200"
                    : "bg-white/[0.03] border-white/8 text-slate-400",
              ].join(" ")}
            >
              <span className="mt-0.5">{violation ? "✕" : ok ? "✓" : "○"}</span>
              <span>{COMPLIANCE_LABELS[k]}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ─── SentimentArcPanel ───────────────────────────────────────────
function SentimentArcPanel({ arc }: { arc: QAReview["sentiment_arc"] }) {
  const w = 800, h = 100;
  const xs = arc.length > 1 ? arc.map((_, i) => (i / (arc.length - 1)) * w) : [w / 2];
  const ys = arc.map((p) => h - ((p.sentiment + 1) / 2) * (h - 8) - 4);
  const path = arc.length > 1
    ? "M " + arc.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(" L ")
    : "";
  return (
    <Panel
      title="Sentiment arc"
      subtitle="How the customer's mood evolved"
      icon={<TrendingUp size={14} className="text-violet-300" />}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[100px]" preserveAspectRatio="none">
          <line x1="0" y1={h / 2} x2={w} y2={h / 2} className="stroke-white/8" strokeDasharray="3 4" />
          {path && (
            <path d={path} fill="none" className="stroke-violet-400/80" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {arc.map((p, i) => (
            <circle
              key={i}
              cx={xs[i]} cy={ys[i]} r="4"
              className={p.sentiment > 0.2 ? "fill-emerald-400" : p.sentiment < -0.2 ? "fill-rose-400" : "fill-slate-400"}
            />
          ))}
        </svg>
        <div className="flex justify-between mt-2 text-[10px] text-slate-500 px-1">
          {arc.map((p, i) => (
            <div key={i} className="text-center max-w-[100px] truncate" title={p.note ?? ""}>
              {p.moment}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ─── Transcript row with quote highlighting ─────────────────────
function TranscriptRow({
  line, violations, strengths,
}: {
  line: QAReview["transcript"][number];
  violations: QAReview["ethics_violations"];
  strengths: QAReview["strengths"];
}) {
  // If this turn matches a violation/strength quote, highlight the bubble.
  const isViolation = violations.some(
    (v) => v.quote && line.text.toLowerCase().includes(v.quote.toLowerCase().slice(0, 25)),
  );
  const isStrength = !isViolation && strengths.some(
    (s) => s.quote && line.text.toLowerCase().includes(s.quote.toLowerCase().slice(0, 25)),
  );
  const isAgent = line.speaker === "agent";

  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed border",
          isAgent
            ? "bg-indigo-500/15 text-indigo-50 border-indigo-400/25 rounded-br-sm"
            : line.speaker === "system"
              ? "bg-slate-500/10 text-slate-300 italic border-slate-500/20"
              : "bg-white/[0.04] text-slate-100 border-white/10 rounded-bl-sm",
          isViolation && "ring-2 ring-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.25)]",
          isStrength && "ring-2 ring-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]",
        ].filter(Boolean).join(" ")}
      >
        <div className="text-[9px] uppercase tracking-hud opacity-60 mb-0.5 flex items-center gap-1.5">
          <span>{isAgent ? "Agent" : line.speaker === "system" ? "System" : "Customer"}</span>
          {line.timestamp && <span className="font-mono">{line.timestamp}</span>}
          {isViolation && <span className="ml-auto text-rose-300">⚠ violation</span>}
          {isStrength && <span className="ml-auto text-emerald-300">✓ strength</span>}
        </div>
        <div className="whitespace-pre-wrap">{line.text}</div>
      </div>
    </div>
  );
}

// ─── Panel primitive ─────────────────────────────────────────────
function Panel({
  title, subtitle, icon, tone, children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: "rose" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const accents = {
    rose:    "bg-rose-500/[0.04] border-rose-500/25",
    emerald: "bg-emerald-500/[0.04] border-emerald-500/25",
    amber:   "bg-amber-500/[0.04] border-amber-500/25",
  };
  const cls = tone ? accents[tone] : "bg-white/[0.02] border-white/10";
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border p-4 ${cls}`}
    >
      <header className="flex items-center gap-2 mb-3">
        {icon}
        <div>
          <div className="text-[13px] font-semibold text-white leading-tight">{title}</div>
          {subtitle && (
            <div className="text-[10px] uppercase tracking-hud text-slate-500">{subtitle}</div>
          )}
        </div>
      </header>
      {children}
    </motion.section>
  );
}
