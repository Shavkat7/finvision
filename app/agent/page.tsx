"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PhoneOff, Sparkles, ArrowLeft, Command, HelpCircle } from "lucide-react";
import Link from "next/link";

import { AgentTranscript } from "@/components/agent/AgentTranscript";
import { StageBar } from "@/components/agent/StageBar";
import { WhisperCard } from "@/components/agent/WhisperCard";
import { NextBestOfferCard } from "@/components/agent/NextBestOffer";
import { BattleCards } from "@/components/agent/BattleCards";
import { QuestionChips } from "@/components/agent/QuestionChips";
import { ProfileCard } from "@/components/agent/ProfileCard";
import { ComplianceList } from "@/components/agent/ComplianceList";
import { AgentComposer } from "@/components/agent/AgentComposer";
import { SummaryModal } from "@/components/agent/SummaryModal";
import { HealthScore } from "@/components/agent/HealthScore";
import { CloseProbability } from "@/components/agent/CloseProbability";
import { DealValueCounter } from "@/components/agent/DealValueCounter";
import { CallTimer } from "@/components/agent/CallTimer";
import { ToastStream } from "@/components/agent/ToastStream";
import { CommandPalette } from "@/components/agent/CommandPalette";
import { WelcomeHero } from "@/components/agent/WelcomeHero";
import { CoachCallout, type CoachMessage } from "@/components/agent/CoachCallout";
import { HelpDrawer } from "@/components/agent/HelpDrawer";

import type {
  Analysis,
  ComplianceState,
  Turn,
} from "@/lib/agent/types";
import { DEMO_CUSTOMER, INITIAL_COMPLIANCE } from "@/lib/agent/mock-profile";
import { DEMO_DIALOG } from "@/lib/agent/demo-script";
import { uid } from "@/lib/utils";

const EMPTY_METRICS = {
  close_probability_pct: 30,
  customer_health_score: 50,
  ai_confidence: 0.4,
  estimated_deal_value_uzs: 0,
};

export default function AgentCopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [prevAnalysis, setPrevAnalysis] = useState<Analysis | null>(null);
  const [compliance, setCompliance] = useState<ComplianceState>(INITIAL_COMPLIANCE);
  const [busy, setBusy] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [coachMsg, setCoachMsg] = useState<CoachMessage | null>(null);
  const [callEndedAt, setCallEndedAt] = useState<number | null>(null);
  // True while we're waiting for the final in-flight analyze to land
  // before locking state + opening the summary modal.
  const [endCallRequested, setEndCallRequested] = useState(false);

  // ─── Refs ───
  // turnsRef / complianceRef / analysisRef shadow state so analyzeNow
  // doesn't need them as deps (which would cause an infinite loop).
  const turnsRef = useRef<Turn[]>([]);
  const complianceRef = useRef<ComplianceState>(INITIAL_COMPLIANCE);
  const analysisRef = useRef<Analysis | null>(null);
  // True after End-call. Blocks all further analyze fetches and state writes.
  const callEndedRef = useRef(false);
  // Aborts the in-flight analyze fetch on End-call or new turn.
  const analyzeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { complianceRef.current = compliance; }, [compliance]);
  useEffect(() => { analysisRef.current = analysis; }, [analysis]);

  const newCall = useCallback(() => {
    // Cancel any pending fetch from the previous call.
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    callEndedRef.current = false;

    setTurns([]);
    setAnalysis(null);
    setPrevAnalysis(null);
    setCompliance(INITIAL_COMPLIANCE);
    setLatency(null);
    setSummaryOpen(false);
    setCallStartedAt(null);
    setCallEndedAt(null);
    setBusy(false);
    setCoachMsg(null);
    setEndCallRequested(false);
  }, []);

  // ─── Stable analyzeNow ───
  // ZERO deps on purpose. Uses refs for everything mutable so the callback
  // identity stays stable, which keeps the parent useEffect from looping.
  // Three callEnded gates: entry, post-fetch, pre-state-write.
  const analyzeNow = useCallback(async () => {
    if (callEndedRef.current) return;
    if (turnsRef.current.length === 0) return;

    // Cancel any earlier in-flight analyze so a slow response can't
    // overwrite the latest state.
    analyzeAbortRef.current?.abort();
    const abort = new AbortController();
    analyzeAbortRef.current = abort;

    setBusy(true);
    const body = JSON.stringify({
      profile: DEMO_CUSTOMER,
      turns: turnsRef.current,
      prevCompliance: complianceRef.current,
    });

    let data: { analysis: Analysis; latency_ms: number } | null = null;
    let lastDetail = "";

    for (let attempt = 1; attempt <= 2 && !data; attempt++) {
      if (abort.signal.aborted || callEndedRef.current) break;
      try {
        const res = await fetch("/api/agent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: abort.signal,
        });
        if (res.ok) {
          data = (await res.json()) as { analysis: Analysis; latency_ms: number };
          break;
        }
        let payload: { detail?: string; error?: string; transient?: boolean } = {};
        try { payload = await res.json(); } catch { /* */ }
        lastDetail = payload.detail ?? payload.error ?? res.statusText;
        const transient = payload.transient === true || res.status === 503;
        console.warn(
          `[analyze] attempt ${attempt} ${transient ? "transient" : "fatal"} ${res.status}: ${lastDetail.slice(0, 140)}`,
        );
        if (!transient || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // Caller superseded us (new turn, end-call, etc.) — silent bail.
          return;
        }
        lastDetail = e instanceof Error ? e.message : String(e);
        console.warn(`[analyze] attempt ${attempt} fetch error:`, lastDetail);
        if (attempt === 2) break;
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    // Final guard: if End-call landed during the request, drop the result.
    if (callEndedRef.current || abort.signal.aborted) {
      setBusy(false);
      return;
    }

    if (data) {
      setPrevAnalysis(analysisRef.current);
      setAnalysis(data.analysis);
      setCompliance(data.analysis.compliance);
      setLatency(data.latency_ms);
    } else {
      // Transient failure → keep the previous analysis on screen.
      console.error("[analyze] gave up — last detail:", lastDetail);
    }
    setBusy(false);
  }, []);

  const addTurn = useCallback(
    (speaker: Turn["speaker"], text: string) => {
      // Once End-call has been clicked, no new turns may be appended —
      // the call is frozen. User must run a new demo / start over to reset.
      if (callEndedRef.current) {
        console.warn("[addTurn] call has ended; ignoring new turn:", text.slice(0, 40));
        return;
      }
      const t: Turn = { id: uid(), speaker, text, ts: Date.now() };
      setTurns((cur) => [...cur, t]);
      setCallStartedAt((cur) => cur ?? Date.now());
    },
    [],
  );

  useEffect(() => {
    if (turns.length === 0) return;
    if (callEndedRef.current) return;
    const id = setTimeout(() => { void analyzeNow(); }, 250);
    return () => clearTimeout(id);
    // analyzeNow has zero deps (refs) so its identity is stable — no loop.
  }, [turns, analyzeNow]);

  const demoCancelRef = useRef<{ cancelled: boolean } | null>(null);
  const coachTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDemo = useCallback(async () => {
    newCall();
    setDemoRunning(true);
    const ctrl = { cancelled: false };
    demoCancelRef.current = ctrl;
    for (let i = 0; i < DEMO_DIALOG.length; i++) {
      if (ctrl.cancelled) break;
      const step = DEMO_DIALOG[i];
      addTurn(step.speaker, step.text);
      // Fire coach callout if attached to this turn.
      if (step.coach) {
        setCoachMsg({
          id: `coach-${i}-${Date.now()}`,
          text: step.coach.text,
          emoji: step.coach.emoji,
        });
        if (coachTimeoutRef.current) clearTimeout(coachTimeoutRef.current);
        coachTimeoutRef.current = setTimeout(() => setCoachMsg(null), 4500);
      }
      await new Promise((r) => setTimeout(r, step.delayMsAfter));
    }
    setDemoRunning(false);
  }, [newCall, addTurn]);

  useEffect(() => {
    return () => {
      if (coachTimeoutRef.current) clearTimeout(coachTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (demoCancelRef.current) demoCancelRef.current.cancelled = true;
    };
  }, []);

  // ─── End-call (graceful) ───
  // We do NOT abort the in-flight analyze, otherwise the summary opens
  // with stale state (one turn behind). Instead we cancel the demo +
  // coach immediately for responsive feel, then wait via an effect for
  // `busy` to fall to false → finalize → open summary. A 5-second
  // safety timeout force-finalizes if analyze hangs.
  const finalizeEndCall = useCallback(() => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    setCallEndedAt(Date.now());
    setEndCallRequested(false);
    setSummaryOpen(true);
  }, []);

  const endCall = useCallback(() => {
    if (callEndedRef.current) {
      setSummaryOpen(true);  // already ended — just re-show summary
      return;
    }
    // Cancel demo + coach immediately (so the agent stops talking).
    if (demoCancelRef.current) demoCancelRef.current.cancelled = true;
    setDemoRunning(false);
    if (coachTimeoutRef.current) clearTimeout(coachTimeoutRef.current);
    setCoachMsg(null);

    // Mark end-call as requested. The effect below will finalize once
    // `busy` falls to false (i.e. the last analyze landed).
    setEndCallRequested(true);

    // Safety: if analyze hangs (network issue), force-finalize after 5 s
    // so the user always reaches the summary.
    setTimeout(() => {
      if (callEndedRef.current) return;
      analyzeAbortRef.current?.abort();
      finalizeEndCall();
    }, 5000);
  }, [finalizeEndCall]);

  // When end-call is requested AND analyze is no longer busy → finalize.
  useEffect(() => {
    if (!endCallRequested) return;
    if (busy) return;
    finalizeEndCall();
  }, [endCallRequested, busy, finalizeEndCall]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        if (helpOpen) setHelpOpen(false);
      } else if (!typing && e.key === "?" && !paletteOpen && !helpOpen) {
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, helpOpen]);

  // Focus the composer textarea (for "Or type your own" CTA).
  const focusComposer = useCallback(() => {
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(
        "textarea[placeholder*='Agent says'], textarea[placeholder*='Customer says']",
      );
      ta?.focus();
    }, 50);
  }, []);

  const handlePaletteAction = useCallback(
    (id: string) => {
      if (id === "reset-call") newCall();
    },
    [newCall],
  );

  const insertAgentTurn = useCallback((text: string) => {
    addTurn("agent", text);
  }, [addTurn]);

  const closeProbValue = analysis?.close_probability_pct ?? EMPTY_METRICS.close_probability_pct;
  const healthValue = analysis?.customer_health_score ?? EMPTY_METRICS.customer_health_score;
  const dealValue = analysis?.estimated_deal_value_uzs ?? EMPTY_METRICS.estimated_deal_value_uzs;
  const aiConf = analysis?.ai_confidence ?? EMPTY_METRICS.ai_confidence;

  return (
    <main className="hud-mesh scanlines min-h-screen text-slate-100 relative">
      <div className="max-w-[1600px] mx-auto px-4 py-3 h-screen flex flex-col relative z-10">
        {/* HUD top bar */}
        <header className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-white/8 text-slate-300"
              title="Back to OvozAI"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-tight truncate flex items-center gap-1.5">
                SQB <span className="text-accent-teal">Operator Copilot</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight truncate uppercase tracking-hud">
                Cluely-style real-time AI sales assistant
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <SubNav active="copilot" />
            <CallTimer startedAt={callStartedAt} frozenAt={callEndedAt} />
            <DealValueCounter value={dealValue} />
            <CloseProbability value={closeProbValue} />
            {latency !== null && (
              <div
                className={[
                  "text-[10px] uppercase tracking-hud px-2 py-1 rounded-full border tabular-nums",
                  latency < 1500
                    ? "bg-emerald-500/8 border-emerald-500/30 text-emerald-300"
                    : latency < 2200
                      ? "bg-cyan-500/8 border-cyan-500/30 text-cyan-300"
                      : "bg-amber-500/8 border-amber-500/30 text-amber-300",
                ].join(" ")}
              >
                {latency} ms
              </div>
            )}
            <button
              onClick={() => setHelpOpen(true)}
              title="What is each panel? (?)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 text-[11px] hover:bg-white/[0.08] transition"
            >
              <HelpCircle size={11} />
              <span className="hidden sm:inline">What is this?</span>
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              title="Command palette (Cmd+K)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 text-[11px] hover:bg-white/[0.08] transition"
            >
              <Command size={11} />
              <span>K</span>
            </button>
            <button
              onClick={endCall}
              disabled={turns.length === 0 || endCallRequested}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition disabled:opacity-50",
                endCallRequested
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-200 cursor-wait"
                  : "bg-red-500/10 border-red-500/40 text-red-200 hover:bg-red-500/20",
              ].join(" ")}
            >
              {endCallRequested ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin" />
                  Finalizing…
                </>
              ) : (
                <>
                  <PhoneOff size={11} />
                  End call
                </>
              )}
            </button>
          </div>
        </header>

        {/* Stage bar — only shown once a call is in progress */}
        {turns.length > 0 && (
          <div className="mb-3 px-2">
            <StageBar current={analysis?.stage ?? "greeting"} />
          </div>
        )}

        {/* WELCOME — shown until the first turn */}
        {turns.length === 0 ? (
          <>
            <WelcomeHero
              onRunDemo={runDemo}
              onTypeYourOwn={focusComposer}
              onShowHelp={() => setHelpOpen(true)}
            />
            {/* Composer is still mounted so user can type */}
            <div className="max-w-3xl mx-auto w-full glass rounded-2xl border-white/8 mt-2 mb-1 overflow-hidden">
              <AgentComposer
                onSend={addTurn}
                onRunDemo={runDemo}
                demoRunning={demoRunning}
                busy={busy}
              />
            </div>
          </>
        ) : (
        /* Three-pane HUD — shown once the call is live */
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* LEFT */}
          <section className="col-span-12 lg:col-span-4 glass rounded-2xl flex flex-col min-h-0 overflow-hidden border-white/8">
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dot-pulse" />
                <div className="text-[10px] uppercase tracking-hud text-slate-300">
                  Live transcript
                </div>
              </div>
              <div className="text-[10px] text-slate-500 tabular-nums">
                {turns.length} turns
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <AgentTranscript turns={turns} entities={analysis?.key_entities ?? []} />
            </div>
            {/* Anchored interactive area — questions live right above the
                composer where the operator's hand is. No scrolling required. */}
            <QuestionChips
              questions={analysis?.suggested_questions ?? []}
              onAsk={insertAgentTurn}
            />
            <AgentComposer
              onSend={addTurn}
              onRunDemo={runDemo}
              demoRunning={demoRunning}
              busy={busy}
            />
          </section>

          {/* CENTER — read-only signals only. No scrolling needed because
              we limit to ≤ 3 cards in normal play. Interactive items moved
              to the LEFT pane (Question chips above composer + Battle Cards
              still here for click-to-copy). */}
          <section className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1 no-scrollbar">
            {/* Call-complete banner sits at the very top so the End-call CTA
                is impossible to miss. */}
            {analysis?.stage === "wrap_up" && (
              <CallCompleteCard
                outcome={analysis.call_outcome_so_far}
                onEnd={endCall}
              />
            )}

            {/* Whisper hero — single most useful tip right now */}
            <WhisperCard
              suggestion={analysis?.whisper_suggestion ?? null}
              busy={busy}
              confidence={aiConf}
            />

            {/* Battle Cards — interactive (click-to-copy approved responses).
                Only renders when there's an unresolved objection. */}
            <BattleCards
              objection={analysis?.detected_objection ?? null}
              primary={analysis?.objection_response_suggestion ?? null}
              alternatives={analysis?.alternative_objection_responses ?? []}
              warnings={analysis?.warnings ?? []}
            />

            {/* The product to pitch */}
            <NextBestOfferCard offer={analysis?.next_best_offer ?? null} />
          </section>

          {/* RIGHT */}
          <section className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1 no-scrollbar">
            <HealthScore value={healthValue} />
            <ProfileCard profile={DEMO_CUSTOMER} />
            <ComplianceList state={compliance} />
          </section>
        </div>
        )}

        {/* Footer hotkeys */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <Hotkey k="⌘K" label="Commands" />
            <Hotkey k="↵" label="Send" />
            <Hotkey k="?" label="Help" />
            <Hotkey k="Esc" label="Close" />
          </div>
          <div className="text-[10px] tabular-nums text-slate-600">
            OvozAI Operator Copilot
          </div>
        </div>
      </div>

      <ToastStream prev={prevAnalysis} next={analysis} />

      <CoachCallout message={coachMsg} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAction={handlePaletteAction}
      />

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />

      <SummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        turns={turns}
        analysis={analysis}
        customerName={DEMO_CUSTOMER.full_name}
        startedAt={callStartedAt}
        endedAt={callEndedAt}
        onStartNewCall={() => {
          setSummaryOpen(false);
          newCall();
        }}
      />
    </main>
  );
}

function CallCompleteCard({
  outcome, onEnd,
}: { outcome: string; onEnd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/40 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/25 flex items-center justify-center shrink-0 text-xl">
          ✓
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-emerald-100 leading-tight">
            Call complete
          </div>
          <div className="text-[12px] text-emerald-200/80 mt-0.5">
            {outcome}
          </div>
        </div>
        <button
          onClick={onEnd}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[12px] font-medium transition"
        >
          End call → Summary
        </button>
      </div>
    </motion.div>
  );
}

function Hotkey({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-300 tabular-nums">
        {k}
      </kbd>
      <span className="text-slate-500 uppercase tracking-hud">{label}</span>
    </span>
  );
}

function SubNav({ active }: { active: "copilot" | "supervisor" | "analytics" | "qa" }) {
  const items: { id: typeof active; label: string; href: string }[] = [
    { id: "copilot",    label: "Copilot",    href: "/agent" },
    { id: "supervisor", label: "Supervisor", href: "/agent/supervisor" },
    { id: "analytics",  label: "Analytics",  href: "/agent/analytics" },
    { id: "qa",         label: "QA Review",  href: "/agent/qa" },
  ];
  return (
    <div className="hidden md:inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/10 p-0.5 mr-1">
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <Link
            key={it.id}
            href={it.href}
            className={[
              "px-2.5 py-1 rounded-full text-[10px] uppercase tracking-hud transition",
              isActive
                ? "bg-gradient-to-br from-accent-teal/80 to-cyan-600/80 text-white shadow-md shadow-accent-teal/30"
                : "text-slate-300 hover:text-white",
            ].join(" ")}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
