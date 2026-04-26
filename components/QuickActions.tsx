"use client";

import { motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import type { AppContext } from "@/lib/context";

interface QuickActionsProps {
  context: AppContext;
  hasUploadedDocs: boolean;
  isConnected: boolean;
  lang: Lang;
  onChip: (text: string) => void;
}

interface Chip {
  emoji: string;
  text: string;
}

function chipsFor(ctx: AppContext, hasDocs: boolean, lang: Lang): Chip[] {
  const out: Chip[] = [];

  // Always-on essentials
  out.push(
    lang === "uz"
      ? { emoji: "🏧", text: "Eng yaqin bankomat" }
      : lang === "ru"
        ? { emoji: "🏧", text: "Ближайший банкомат" }
        : { emoji: "🏧", text: "Nearest ATM" },
  );

  // Time-aware
  if (ctx.is_business_hours_uz) {
    out.push(
      lang === "uz"
        ? { emoji: "📅", text: "Filialda uchrashuvga yozdiring" }
        : lang === "ru"
          ? { emoji: "📅", text: "Запишите на консультацию" }
          : { emoji: "📅", text: "Book a consultation" },
    );
  } else {
    out.push(
      lang === "uz"
        ? { emoji: "🌙", text: "24/7 bankomat" }
        : lang === "ru"
          ? { emoji: "🌙", text: "Банкомат 24/7" }
          : { emoji: "🌙", text: "24/7 ATM" },
    );
  }

  // Loan calculator
  out.push(
    lang === "uz"
      ? { emoji: "🧮", text: "Ipoteka kalkulyatori" }
      : lang === "ru"
        ? { emoji: "🧮", text: "Ипотечный калькулятор" }
        : { emoji: "🧮", text: "Mortgage calculator" },
  );

  // Document-aware
  if (hasDocs) {
    out.push(
      lang === "uz"
        ? { emoji: "📎", text: "Yuklagan hujjatim haqida" }
        : lang === "ru"
          ? { emoji: "📎", text: "О моём документе" }
          : { emoji: "📎", text: "About my document" },
    );
  }

  // Late-night → security tip
  if (ctx.hour_bucket === "late_night" || ctx.hour_bucket === "night") {
    out.push(
      lang === "uz"
        ? { emoji: "🛡", text: "Bankomat xavfsizligi" }
        : lang === "ru"
          ? { emoji: "🛡", text: "Безопасность банкомата" }
          : { emoji: "🛡", text: "ATM safety" },
    );
  }

  // Always-on extra
  out.push(
    lang === "uz"
      ? { emoji: "💱", text: "Dollar kursi" }
      : lang === "ru"
        ? { emoji: "💱", text: "Курс доллара" }
        : { emoji: "💱", text: "USD rate" },
  );

  return out;
}

export function QuickActions({
  context, hasUploadedDocs, isConnected, lang, onChip,
}: QuickActionsProps) {
  const chips = chipsFor(context, hasUploadedDocs, lang);

  return (
    <div className="w-full max-w-3xl overflow-x-auto -mx-2 px-2 pb-1 no-scrollbar">
      <div className="flex gap-2">
        {chips.map((c, i) => (
          <motion.button
            key={c.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.18 }}
            onClick={() => onChip(c.text)}
            disabled={!isConnected}
            className={[
              "shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition",
              isConnected
                ? "border-white/15 bg-white/[0.04] hover:bg-white/[0.10] text-slate-200 cursor-pointer"
                : "border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed",
            ].join(" ")}
            title={isConnected ? c.text : "Start voice first"}
          >
            <span className="mr-1">{c.emoji}</span>
            {c.text}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
