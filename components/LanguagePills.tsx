"use client";

import { motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import { LANG_NAMES } from "@/lib/i18n";

interface LanguagePillsProps {
  value: Lang;
  onChange: (lang: Lang) => void;
  size?: "sm" | "md";
}

const ALL_LANGS: Lang[] = ["uz", "ru", "en"];
const FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

export function LanguagePills({ value, onChange, size = "sm" }: LanguagePillsProps) {
  const isCompact = size === "sm";

  return (
    <div
      className={[
        "relative flex items-center gap-1 overflow-x-auto no-scrollbar snap-x snap-mandatory",
        "rounded-full bg-white/[0.04] border border-white/10 p-0.5",
        isCompact ? "max-w-[220px]" : "w-full",
      ].join(" ")}
      role="tablist"
      aria-label="Language"
    >
      {ALL_LANGS.map((l) => {
        const active = l === value;
        return (
          <button
            key={l}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(l)}
            className={[
              "relative shrink-0 snap-center transition rounded-full",
              isCompact
                ? "px-2.5 py-1 text-[11px]"
                : "px-4 py-2 text-sm flex-1 min-w-[80px]",
              "flex items-center justify-center gap-1.5",
              active
                ? "text-white"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-bg-${size}`}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-teal/80 to-cyan-600/80 shadow-md"
              />
            )}
            <span className="relative z-10">{FLAGS[l]}</span>
            <span className="relative z-10 uppercase tracking-wider">
              {isCompact ? l : LANG_NAMES[l]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
