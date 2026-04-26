"use client";

import { motion } from "framer-motion";
import { ExternalLink, MapPin } from "lucide-react";
import type { Lang, ToolInvocation } from "@/lib/types";
import { formatToolForUI } from "@/lib/tools";
import { formatDistance } from "@/lib/geo";

interface ToolCardProps {
  invocation: ToolInvocation;
  lang: Lang;
}

export function ToolCard({ invocation, lang }: ToolCardProps) {
  const formatted = formatToolForUI(invocation, lang);
  const { emoji, title, body, locations } = formatted;
  const pending = invocation.status === "pending";
  const error = invocation.status === "error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 min-w-[260px] max-w-[340px] shadow-lg shadow-black/40"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-medium text-slate-200 flex-1">{title}</span>
        {pending && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 animate-pulse">…</span>
        )}
        {error && (
          <span className="text-[10px] uppercase tracking-wider text-red-400">✕</span>
        )}
      </div>

      {locations && locations.length > 0 ? (
        <div className="space-y-3 mt-1">
          {locations.map((l, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/[0.03] border border-white/5 p-3"
            >
              <div className="flex items-start gap-2">
                <MapPin
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    l.type === "atm" ? "text-blue-300" : "text-accent-teal"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-slate-100 leading-tight">
                    {l.name}
                    {l.distance_km !== undefined && (
                      <span className="ml-1.5 text-[11px] text-slate-400 font-normal">
                        · {formatDistance(l.distance_km, lang)}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-300 leading-snug mt-0.5">
                    {l.address}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    ⏰ {l.hours}
                    {l.is_24h && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] uppercase tracking-wide">
                        24/7
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5 pl-6">
                <MapLink href={l.map_url_yandex} label="Yandex" />
                <MapLink href={l.map_url_google} label="Google" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="text-sm text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
          {body}
        </pre>
      )}
    </motion.div>
  );
}

function MapLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 hover:bg-white/[0.10] hover:border-accent-teal/40 transition text-[11px] text-slate-200"
    >
      <ExternalLink size={10} />
      {label}
    </a>
  );
}
