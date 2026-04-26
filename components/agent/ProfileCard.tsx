"use client";

import type { CustomerProfile } from "@/lib/agent/types";
import { Briefcase, MapPin, Star, ScrollText } from "lucide-react";

function fmtUzs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M UZS`;
  return n.toLocaleString("ru-RU");
}

export function ProfileCard({ profile }: { profile: CustomerProfile }) {
  return (
    <div
      className="rounded-2xl bg-white/[0.02] border border-white/8 p-3.5"
      title="Live data from the bank's CRM. Drives every recommendation."
    >
      <div className="mb-2">
        <div className="text-[11px] font-semibold text-slate-100 leading-tight">
          👤 Customer info
        </div>
        <div className="text-[9px] uppercase tracking-hud text-slate-500">
          CRM record · drives recommendations
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-white text-[13px] font-semibold shrink-0 shadow-md shadow-indigo-500/30">
          {profile.full_name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-white truncate leading-tight">
            {profile.full_name}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {profile.customer_id} · {profile.age} y.o.
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">
            Score
          </div>
          <div className={[
            "text-[13px] tabular-nums font-bold",
            profile.credit_score >= 700 ? "text-emerald-300" :
            profile.credit_score >= 600 ? "text-amber-300" : "text-rose-300",
          ].join(" ")}>
            {profile.credit_score}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-2">
        <Pill icon={<Briefcase size={9} />} label={profile.occupation} />
        <Pill icon={<MapPin size={9} />} label={`${profile.district}, ${profile.city}`} />
      </div>

      <dl className="space-y-1 text-[11px] mb-2">
        <Row k="Income/mo" v={fmtUzs(profile.monthly_income_uzs)} highlight />
        <Row k="Customer since" v={profile.customer_since} />
      </dl>

      <details className="mt-2">
        <summary className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1 cursor-pointer hover:text-slate-300 list-none flex items-center gap-1">
          <Star size={9} />
          Existing products ({profile.existing_products.length})
        </summary>
        <ul className="space-y-0.5 text-[10.5px] text-slate-300 mt-1 pl-1">
          {profile.existing_products.map((p, i) => (
            <li key={i} className="leading-snug">· {p}</li>
          ))}
        </ul>
      </details>

      <details className="mt-1.5">
        <summary className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1 cursor-pointer hover:text-slate-300 list-none flex items-center gap-1">
          <ScrollText size={9} />
          Recent activity ({profile.recent_activity.length})
        </summary>
        <ul className="space-y-0.5 text-[10.5px] text-slate-300 mt-1 pl-1">
          {profile.recent_activity.map((a, i) => (
            <li key={i} className="leading-snug">· {a}</li>
          ))}
        </ul>
      </details>

      {profile.last_call && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-0.5">
            Last call
          </div>
          <div className="text-[10.5px] text-slate-300 italic leading-snug">
            {profile.last_call}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{k}</span>
      <span className={`tabular-nums ${highlight ? "text-emerald-300 font-medium" : "text-slate-200"}`}>
        {v}
      </span>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/8 text-slate-300 truncate flex items-center gap-1">
      <span className="text-slate-500 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
