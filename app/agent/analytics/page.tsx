"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowUp, ArrowDown, Sparkles,
  TrendingUp, ShieldCheck, Phone, DollarSign, Smile,
  Trophy, Package, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

import { Sparkline } from "@/components/agent/Sparkline";
import { CountUp } from "@/components/agent/CountUp";
import { ANALYTICS } from "@/lib/agent/analytics-mock";

function fmtPipeline(uzs: number): string {
  if (uzs >= 1_000_000_000) return `${(uzs / 1_000_000_000).toFixed(2)}B`;
  if (uzs >= 1_000_000) return `${(uzs / 1_000_000).toFixed(1)}M`;
  return uzs.toLocaleString("ru-RU");
}

function fmtSec(sec: number): string {
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function pctDelta(now: number, prev: number): { value: number; up: boolean } {
  if (prev === 0) return { value: 0, up: true };
  const v = ((now - prev) / prev) * 100;
  return { value: Math.abs(Math.round(v)), up: v >= 0 };
}

export default function AnalyticsPage() {
  const t = ANALYTICS.today;

  const callsDelta = pctDelta(t.total_calls, t.total_calls_yesterday);
  const convDelta  = pctDelta(t.conversion_pct, t.conversion_pct_yesterday);
  const pipeDelta  = pctDelta(t.pipeline_uzs, t.pipeline_uzs_yesterday);
  const callDelta  = pctDelta(t.avg_call_sec_yesterday, t.avg_call_sec); // shorter is better; invert
  const compDelta  = pctDelta(t.avg_compliance_pct, t.avg_compliance_pct_yesterday);

  return (
    <main className="hud-mesh scanlines min-h-screen text-slate-100 relative">
      <div className="max-w-[1500px] mx-auto px-4 py-3 relative z-10">
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
                Management analytics dashboard
              </div>
            </div>
          </div>
          <SubNav active="analytics" />
        </header>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KPI icon={<Phone size={13} />} label="Calls today" value={t.total_calls} delta={callsDelta} />
          <KPI icon={<TrendingUp size={13} />} label="Conversion" value={t.conversion_pct} suffix="%" delta={convDelta} accent="emerald" />
          <KPI icon={<DollarSign size={13} />} label="Pipeline UZS" custom={fmtPipeline(t.pipeline_uzs)} delta={pipeDelta} accent="emerald" />
          <KPI icon={<Phone size={13} />} label="Avg call time" custom={fmtSec(t.avg_call_sec)} delta={callDelta} accent="cyan" tooltip="Shorter is better" />
          <KPI icon={<ShieldCheck size={13} />} label="Compliance" value={t.avg_compliance_pct} suffix="%" delta={compDelta} accent="emerald" />
        </div>

        <div className="grid grid-cols-12 gap-3 mb-5">
          {/* Conversion trend chart */}
          <Panel
            title="Conversion rate · last 30 days"
            subtitle="Daily % of calls that closed"
            className="col-span-12 lg:col-span-6"
          >
            <div className="text-emerald-300 mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                <CountUp value={t.conversion_pct} format={(n) => Math.round(n) + "%"} />
              </span>
              <DeltaPill delta={convDelta} />
            </div>
            <Sparkline
              values={ANALYTICS.conversion_30d}
              strokeColor="#34d399"
              fillColor="#34d399"
              height={70}
            />
          </Panel>

          {/* Compliance trend chart */}
          <Panel
            title="Script & compliance score · last 30 days"
            subtitle="% of required disclosures said"
            className="col-span-12 lg:col-span-6"
          >
            <div className="text-cyan-300 mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                <CountUp value={t.avg_compliance_pct} format={(n) => Math.round(n) + "%"} />
              </span>
              <DeltaPill delta={compDelta} />
            </div>
            <Sparkline
              values={ANALYTICS.compliance_30d}
              strokeColor="#22d3ee"
              fillColor="#22d3ee"
              height={70}
            />
          </Panel>

          {/* Call volume */}
          <Panel
            title="Call volume · last 30 days"
            subtitle="Outbound + inbound, all agents"
            className="col-span-12"
          >
            <Sparkline
              values={ANALYTICS.call_volume_30d}
              strokeColor="#a78bfa"
              fillColor="#a78bfa"
              height={64}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-12 gap-3 mb-5">
          {/* Top agents */}
          <Panel
            title="Top agents today"
            subtitle="Conversion · script adherence"
            className="col-span-12 md:col-span-6 lg:col-span-4"
            icon={<Trophy size={13} className="text-amber-300" />}
          >
            <ul className="space-y-1.5">
              {ANALYTICS.agents_top.map((a, i) => (
                <li key={a.name} className="flex items-center gap-2 text-[12px] py-1">
                  <span className="w-5 text-center text-[11px] font-bold tabular-nums text-slate-500">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-slate-200 truncate">{a.name}</span>
                  <span className="text-emerald-300 tabular-nums w-10 text-right">
                    {a.conversion_pct}%
                  </span>
                  <span className="text-slate-400 tabular-nums w-10 text-right">
                    {a.calls_today}
                  </span>
                  <span className="text-cyan-300 tabular-nums w-12 text-right">
                    {a.script_adherence_pct}%
                  </span>
                </li>
              ))}
            </ul>
            <div className="text-[9px] uppercase tracking-hud text-slate-500 mt-2 flex justify-end gap-3">
              <span className="w-10 text-right">conv</span>
              <span className="w-10 text-right">calls</span>
              <span className="w-12 text-right">script</span>
            </div>
          </Panel>

          {/* Best products */}
          <Panel
            title="Best-performing recommendations"
            subtitle="Conversion × volume"
            className="col-span-12 md:col-span-6 lg:col-span-4"
            icon={<Package size={13} className="text-accent-teal" />}
          >
            <ul className="space-y-1.5">
              {ANALYTICS.products_top.map((p, i) => (
                <li key={p.product} className="flex items-center gap-2 text-[12px] py-1">
                  <span className="w-5 text-center text-[11px] font-bold tabular-nums text-slate-500">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-slate-200 truncate">{p.product}</span>
                  <span className="text-emerald-300 tabular-nums w-10 text-right">
                    {p.conversion_pct}%
                  </span>
                  <span className="text-slate-400 tabular-nums w-10 text-right">
                    {p.calls}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Most-missed objections */}
          <Panel
            title="Most-missed objections"
            subtitle="Where agents need help"
            className="col-span-12 md:col-span-6 lg:col-span-4"
            icon={<AlertTriangle size={13} className="text-rose-300" />}
          >
            <ul className="space-y-1.5">
              {ANALYTICS.objections_missed.map((o) => (
                <li key={o.objection} className="text-[12px] py-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-slate-200 truncate flex-1">{o.objection}</span>
                    <span className="text-rose-300 tabular-nums">{o.count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      animate={{ width: o.resolved_pct + "%" }}
                      className="h-full bg-emerald-500/70"
                    />
                  </div>
                  <div className="text-[9px] uppercase tracking-hud text-slate-500 mt-0.5">
                    Resolved {o.resolved_pct}%
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Compliance breakdown */}
        <Panel
          title="Compliance breakdown"
          subtitle="Per-item adherence rate today"
          className="col-span-12 mb-5"
          icon={<ShieldCheck size={13} className="text-emerald-300" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ANALYTICS.compliance_breakdown.map((c) => (
              <div key={c.item} className="text-[12px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300 truncate">{c.item}</span>
                  <span className={`tabular-nums font-bold ${
                    c.pct >= 95 ? "text-emerald-300" :
                    c.pct >= 85 ? "text-amber-300" :
                    "text-rose-300"
                  }`}>
                    {c.pct}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    animate={{ width: c.pct + "%" }}
                    className={`h-full ${
                      c.pct >= 95 ? "bg-gradient-to-r from-emerald-400 to-accent-teal" :
                      c.pct >= 85 ? "bg-gradient-to-r from-amber-400 to-orange-500" :
                      "bg-rose-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* NPS card */}
        <Panel
          title="Customer NPS"
          subtitle="Post-call survey · last 30 days"
          className="mb-5"
          icon={<Smile size={13} className="text-pink-300" />}
        >
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold tabular-nums text-pink-300">
              <CountUp value={t.nps} format={(n) => "+" + Math.round(n)} />
            </div>
            <div>
              <DeltaPill delta={pctDelta(t.nps, t.nps_yesterday)} />
              <div className="text-[10px] uppercase tracking-hud text-slate-500 mt-1">
                Industry avg in UZ banking: +28
              </div>
            </div>
          </div>
        </Panel>

        <p className="text-[10px] text-slate-500 italic mb-4">
          Synthetic data for demo. Production wires to ClickHouse + the
          A/B-test cohort marker for pre/post copilot rollout comparison.
        </p>
      </div>
    </main>
  );
}

function KPI({
  icon, label, value, suffix, custom, delta, accent = "indigo", tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  suffix?: string;
  custom?: string;
  delta?: { value: number; up: boolean };
  accent?: "indigo" | "emerald" | "cyan";
  tooltip?: string;
}) {
  const accents = {
    indigo:  "from-indigo-500/15 to-violet-500/5 border-indigo-500/30 text-indigo-300",
    emerald: "from-emerald-500/15 to-teal-500/5 border-emerald-500/30 text-emerald-300",
    cyan:    "from-cyan-500/15 to-sky-500/5 border-cyan-500/30 text-cyan-300",
  };
  return (
    <div
      title={tooltip}
      className={`rounded-2xl bg-gradient-to-br ${accents[accent]} border p-3.5`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-current opacity-80">{icon}</span>
        <div className="text-[10px] uppercase tracking-hud text-slate-400">
          {label}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold tabular-nums text-white">
          {custom !== undefined ? custom : <><CountUp value={value ?? 0} />{suffix ?? ""}</>}
        </div>
        {delta && <DeltaPill delta={delta} />}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: { value: number; up: boolean } }) {
  if (delta.value === 0) return null;
  return (
    <span className={[
      "text-[10px] font-medium tabular-nums flex items-center gap-0.5 px-1.5 py-0.5 rounded",
      delta.up
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-rose-500/15 text-rose-300",
    ].join(" ")}>
      {delta.up ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
      {delta.value}%
    </span>
  );
}

function Panel({
  title, subtitle, children, className, icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-white/[0.02] border border-white/8 p-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <div>
          <div className="text-[12px] font-semibold text-white leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="text-[10px] text-slate-500 uppercase tracking-hud">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {children}
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
