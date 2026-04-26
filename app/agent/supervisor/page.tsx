"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, AlertTriangle, Activity, Sparkles } from "lucide-react";
import Link from "next/link";

import { CallTile } from "@/components/agent/CallTile";
import { CountUp } from "@/components/agent/CountUp";
import {
  buildInitialCalls,
  tickCall,
  summaryKpis,
  type ConcurrentCall,
} from "@/lib/agent/supervisor-mock";
import { uid } from "@/lib/utils";

interface ToastEntry {
  id: string;
  text: string;
  tone: "ok" | "info";
}

export default function SupervisorPage() {
  const [calls, setCalls] = useState<ConcurrentCall[]>(() => buildInitialCalls());
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const callsRef = useRef(calls);
  useEffect(() => { callsRef.current = calls; }, [calls]);

  // Tick every 2s — call evolves plausibly.
  useEffect(() => {
    const id = setInterval(() => {
      setCalls((cur) => cur.map(tickCall));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const pushToast = (text: string, tone: ToastEntry["tone"] = "info") => {
    const id = uid();
    setToasts((cur) => [...cur, { id, text, tone }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 2500);
  };

  const handleListen = (c: ConcurrentCall) => {
    pushToast(`🎧 Listening in on ${c.customer_name} (read-only)`);
  };
  const handleBarge = (c: ConcurrentCall) => {
    pushToast(`📣 Barged into ${c.customer_name}'s call — supervisor live`, "ok");
  };

  const kpis = summaryKpis(calls);
  // Synthetic "today" totals — combine live with cumulative for a realistic feel
  const todayCalls = 247 + Math.floor(calls[0]?.duration_sec ? 0 : 0); // placeholder
  const pipelineUzs = 2_400_000_000;
  const conversionPct = 41;

  return (
    <main className="hud-mesh scanlines min-h-screen text-slate-100 relative">
      <div className="max-w-[1700px] mx-auto px-4 py-3 relative z-10">
        {/* Top bar with sub-nav */}
        <header className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="p-2 rounded-full hover:bg-white/8 text-slate-300" title="Home">
              <ArrowLeft size={16} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[14px] font-semibold leading-tight">
                SQB <span className="text-accent-teal">Operator Copilot</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight uppercase tracking-hud">
                Supervisor live monitoring
              </div>
            </div>
          </div>

          <SubNav active="supervisor" />
        </header>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KpiTile
            icon={<Activity size={13} className="text-emerald-300" />}
            label="Active calls now"
            value={kpis.active_calls}
            color="emerald"
          />
          <KpiTile
            icon={<Eye size={13} className="text-cyan-300" />}
            label="Avg close-prob"
            value={kpis.avg_close_prob_pct}
            suffix="%"
            color="cyan"
          />
          <KpiTile
            label="Avg compliance"
            value={kpis.avg_compliance_pct}
            suffix="%"
            color="emerald"
          />
          <KpiTile
            label="Today total calls"
            value={todayCalls + calls.reduce((s, c) => s + (c.duration_sec > 30 ? 1 : 0), 0)}
            color="indigo"
          />
          <KpiTile
            icon={<AlertTriangle size={13} className="text-rose-300" />}
            label="Compliance warnings"
            value={kpis.total_warnings}
            color="rose"
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
            <h2 className="text-[12px] uppercase tracking-hud text-slate-300">
              Active calls ({calls.length})
            </h2>
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            Pipeline today · <span className="text-emerald-300">{(pipelineUzs / 1_000_000_000).toFixed(2)}B UZS</span> · conversion {conversionPct}%
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
          {calls.map((c) => (
            <CallTile key={c.id} call={c} onListen={handleListen} onBarge={handleBarge} />
          ))}
        </div>

        <p className="mt-6 text-[10px] text-slate-500 italic">
          Synthetic data for demo. In production this view streams from the
          PBX (Asterisk / Cisco / Avaya) + Kafka event bus, ≥ 500 concurrent calls.
        </p>
      </div>

      {/* Floating toast stream */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {toasts.slice(-4).map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={[
              "px-3 py-2 rounded-xl border text-[12px] backdrop-blur",
              t.tone === "ok"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-100"
                : "bg-white/[0.06] border-white/15 text-slate-100",
            ].join(" ")}
          >
            {t.text}
          </motion.div>
        ))}
      </div>
    </main>
  );
}

function KpiTile({
  icon, label, value, suffix, color,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: "emerald" | "cyan" | "indigo" | "rose";
}) {
  const accents = {
    emerald: "from-emerald-500/15 to-teal-500/5 border-emerald-500/30 text-emerald-300",
    cyan:    "from-cyan-500/15 to-sky-500/5 border-cyan-500/30 text-cyan-300",
    indigo:  "from-indigo-500/15 to-violet-500/5 border-indigo-500/30 text-indigo-300",
    rose:    "from-rose-500/15 to-red-500/5 border-rose-500/30 text-rose-300",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${accents[color]} border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <div className="text-[10px] uppercase tracking-hud text-slate-400">
          {label}
        </div>
      </div>
      <div className="text-2xl font-bold tabular-nums text-white">
        <CountUp value={value} />{suffix ?? ""}
      </div>
    </div>
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
    <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/10 p-0.5">
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <Link
            key={it.id}
            href={it.href}
            className={[
              "px-3 py-1.5 rounded-full text-[11px] uppercase tracking-hud transition",
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
