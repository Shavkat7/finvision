"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import type { NextBestOffer } from "@/lib/agent/types";

// LLM may return null for absent optional numbers (JSON has no `undefined`).
// Treat null and undefined the same way.
function fmtUzs(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return n.toLocaleString("ru-RU") + " so'm";
}

export function NextBestOfferCard({ offer }: { offer: NextBestOffer | null }) {
  if (!offer) {
    return (
      <div
        className="rounded-2xl bg-white/[0.02] border border-white/8 p-4"
        title="The best SQB product for THIS customer based on profile + conversation."
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={13} className="text-slate-500" />
          <div>
            <div className="text-[12px] font-semibold text-slate-300 leading-tight">
              🎯 Recommend this product
            </div>
            <div className="text-[9px] uppercase tracking-hud text-slate-500">
              Best fit for this customer
            </div>
          </div>
        </div>
        <div className="text-[13px] text-slate-500 italic mt-1">
          Gathering context — no offer yet.
        </div>
      </div>
    );
  }
  const conf = offer.confidence ?? 0.5;
  const confColor =
    conf >= 0.75 ? "text-emerald-300" : conf >= 0.5 ? "text-amber-300" : "text-rose-300";

  return (
    <motion.div
      key={offer.product}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl bg-accent-teal/8 border border-accent-teal/30 p-4"
    >
      <div
        className="flex items-center gap-2.5 mb-3"
        title="Best SQB product to pitch RIGHT NOW based on the customer's profile and what they've said."
      >
        <div className="w-8 h-8 rounded-lg bg-accent-teal/20 flex items-center justify-center">
          <Sparkles size={14} className="text-accent-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-white leading-tight">
            Recommend this product
          </div>
          <div className="text-[11px] text-accent-teal/70">
            Best fit for this customer
          </div>
        </div>
        <span
          className={`text-[11px] tabular-nums ${confColor}`}
          title="How sure the AI is that this offer fits the customer."
        >
          <TrendingUp size={11} className="inline -mt-0.5 mr-0.5" />
          {Math.round(conf * 100)}%
        </span>
      </div>

      <div className="text-[17px] font-semibold text-white mb-1.5 leading-tight">
        {offer.product}
      </div>
      <div className="text-[13px] text-slate-300 mb-3 leading-relaxed">
        {offer.rationale}
      </div>

      <div className="flex flex-wrap gap-2 text-[12px]">
        {offer.indicative_rate_pct != null && Number.isFinite(offer.indicative_rate_pct) && (
          <Stat label="Rate" value={`${offer.indicative_rate_pct}%`} />
        )}
        {offer.indicative_amount_uzs != null && Number.isFinite(offer.indicative_amount_uzs) && (
          <Stat label="Amount" value={fmtUzs(offer.indicative_amount_uzs)} />
        )}
        {offer.monthly_payment_uzs != null && Number.isFinite(offer.monthly_payment_uzs) && (
          <Stat label="Monthly" value={fmtUzs(offer.monthly_payment_uzs)} />
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-slate-200">
      <span className="text-slate-400">{label}: </span>
      <strong className="tabular-nums text-white">{value}</strong>
    </span>
  );
}
