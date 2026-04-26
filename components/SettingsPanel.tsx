"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import type { GeminiVoice, Lang } from "@/lib/types";
import { t, DEMO_PROMPTS } from "@/lib/i18n";
import { LanguagePills } from "./LanguagePills";

interface SettingsPanelProps {
  open: boolean;
  voice: GeminiVoice;
  language: Lang;
  locationGranted: boolean;
  onVoiceChange: (v: GeminiVoice) => void;
  onLanguageChange: (l: Lang) => void;
  onRequestLocation: () => void;
  onClose: () => void;
}

const VOICES: { id: GeminiVoice; label: string; hint_uz: string; hint_ru: string; hint_en: string }[] = [
  { id: "Aoede",  label: "Aoede",  hint_uz: "Ayol ovozi · iliq",       hint_ru: "Женский · тёплый",     hint_en: "Female · warm" },
  { id: "Kore",   label: "Kore",   hint_uz: "Ayol ovozi · aniq",       hint_ru: "Женский · чёткий",     hint_en: "Female · clear" },
  { id: "Puck",   label: "Puck",   hint_uz: "Erkak ovozi · samimiy",   hint_ru: "Мужской · дружелюбный", hint_en: "Male · friendly" },
  { id: "Charon", label: "Charon", hint_uz: "Erkak ovozi · chuqur",    hint_ru: "Мужской · глубокий",   hint_en: "Male · deep" },
  { id: "Fenrir", label: "Fenrir", hint_uz: "Erkak ovozi · jiddiy",    hint_ru: "Мужской · серьёзный",  hint_en: "Male · serious" },
];

export function SettingsPanel({
  open, voice, language, locationGranted,
  onVoiceChange, onLanguageChange, onRequestLocation, onClose,
}: SettingsPanelProps) {
  const prompts = DEMO_PROMPTS[language];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-bg-elevated border-l border-white/10 z-50 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">{t(language, "settings")}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300"
                aria-label={t(language, "settings")}
              >
                <X size={20} />
              </button>
            </div>

            {/* Language */}
            <section className="mb-8">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                {t(language, "language")}
              </div>
              <LanguagePills value={language} onChange={onLanguageChange} size="md" />
            </section>

            {/* Voice */}
            <section className="mb-8">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                {t(language, "voice")}
              </div>
              <div className="space-y-2">
                {VOICES.map((v) => {
                  const hint =
                    language === "ru" ? v.hint_ru : language === "en" ? v.hint_en : v.hint_uz;
                  return (
                    <button
                      key={v.id}
                      onClick={() => onVoiceChange(v.id)}
                      className={[
                        "w-full text-left px-4 py-3 rounded-xl border transition",
                        v.id === voice
                          ? "border-accent-teal/60 bg-accent-teal/10"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <div className="font-medium text-white">{v.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{hint}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                {t(language, "voice_change_note")}
              </p>
            </section>

            {/* Location permission */}
            <section className="mb-8">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                <MapPin size={11} className="inline -mt-0.5 mr-1" />
                Location
              </div>
              {locationGranted ? (
                <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">
                  ✓ {t(language, "loc_shared")}
                </div>
              ) : (
                <button
                  onClick={onRequestLocation}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-200 transition flex items-center gap-2"
                >
                  <MapPin size={14} />
                  {t(language, "loc_share_button")}
                </button>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                {language === "uz"
                  ? "Eng yaqin filial / bankomatlarni topish uchun ishlatiladi"
                  : language === "ru"
                    ? "Используется для поиска ближайших филиалов и банкоматов"
                    : "Used to find your nearest branches and ATMs"}
              </p>
            </section>

            {/* Tips */}
            <section className="mb-8">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                {t(language, "tips")}
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>{t(language, "tip_headphones")}</li>
                <li>{t(language, "tip_natural")}</li>
                <li>{t(language, "tip_interrupt")}</li>
              </ul>
            </section>

            {/* Demo prompts */}
            <section className="mb-8">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                {t(language, "bank_questions")}
              </div>
              <div className="space-y-2">
                {prompts.bank.map((q) => (
                  <PromptChip key={q} text={q} />
                ))}
              </div>
            </section>

            <section>
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                {t(language, "utility_questions")}
              </div>
              <div className="space-y-2">
                {prompts.utility.map((q) => (
                  <PromptChip key={q} text={q} />
                ))}
              </div>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PromptChip({ text }: { text: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-slate-300">
      &ldquo;{text}&rdquo;
    </div>
  );
}
