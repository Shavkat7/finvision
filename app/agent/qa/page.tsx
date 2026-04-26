"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, ClipboardCheck, Languages } from "lucide-react";
import Link from "next/link";

import { QAUploader } from "@/components/agent/qa/QAUploader";
import { QAResults } from "@/components/agent/qa/QAResults";
import { LanguagePills } from "@/components/LanguagePills";
import type { QAReview } from "@/lib/agent/qa-types";
import type { Lang } from "@/lib/types";

const LANG_KEY = "ovozai.qa.lang";

const HERO_COPY: Record<Lang, { tag: string; title: string; body: string; reportLabel: string }> = {
  uz: {
    tag: "Manager uchun AI sifat tahlili",
    title: "Har qanday qo'ng'iroqni bir bosishda tahlil qiling.",
    body: "Yozuvni yuklang yoki transkriptni joylashtiring. Sun'iy intellekt qo'ng'iroqni umumlashtiradi, etika buzilishlarini aniqlaydi, agent yaxshi qilgan narsalarni tan oladi va menejer aytadigan koachlik tavsiyalarini yozadi.",
    reportLabel: "Hisobot tili",
  },
  ru: {
    tag: "QA на основе ИИ для менеджеров",
    title: "Аудит любого звонка одним кликом.",
    body: "Загрузите запись или вставьте транскрипт. ИИ резюмирует звонок, отмечает нарушения этики, признаёт сильные стороны агента и пишет коучинговые рекомендации, которые менеджер может произнести дословно.",
    reportLabel: "Язык отчёта",
  },
  en: {
    tag: "AI-powered QA for managers",
    title: "Audit any call in one click.",
    body: "Drop a recording or paste a transcript. The AI summarizes the call, flags ethics violations with exact quotes, recognizes what the agent did well, and writes coaching notes the manager can deliver verbatim.",
    reportLabel: "Report language",
  },
};

export default function QAReviewPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<QAReview | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [model, setModel] = useState<string | null>(null);
  // Default = Uzbek. User can switch to ru/en for the AI-generated narration.
  // Quotes in the transcript stay in the original spoken language regardless.
  const [lang, setLang] = useState<Lang>("uz");

  // Persist the chosen output language so it sticks across reloads.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved === "uz" || saved === "ru" || saved === "en") setLang(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const submit = useCallback(async (init: RequestInit) => {
    setBusy(true);
    setError(null);
    setReview(null);
    try {
      const res = await fetch("/api/agent/qa-review", init);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { review: QAReview; latency_ms: number; model: string };
      setReview(data.review);
      setLatency(data.latency_ms);
      setModel(data.model);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleAudio = useCallback((file: File) => {
    const fd = new FormData();
    fd.append("audio", file);
    fd.append("lang", lang);
    void submit({ method: "POST", body: fd });
  }, [submit, lang]);

  const handleText = useCallback((transcript: string) => {
    void submit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, lang }),
    });
  }, [submit, lang]);

  const copy = HERO_COPY[lang];

  return (
    <main className="hud-mesh min-h-screen text-slate-100 relative">
      <div className="max-w-[1500px] mx-auto px-4 py-3 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-5 gap-3 flex-wrap">
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
                Post-call QA · ethics & compliance review
              </div>
            </div>
          </div>
          <SubNav active="qa" />
        </header>

        {/* Hero pitch (translated by selected report language) */}
        <div className="max-w-3xl mx-auto text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-200 text-[11px] uppercase tracking-hud mb-3">
            <ClipboardCheck size={11} />
            {copy.tag}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            {copy.title}
          </h1>
          <p className="text-[14px] text-slate-300 max-w-xl mx-auto leading-relaxed">
            {copy.body}
          </p>
        </div>

        {/* Output-language picker — controls the AI report language. */}
        <div className="max-w-3xl mx-auto mb-3 flex items-center justify-center gap-2.5">
          <Languages size={12} className="text-slate-400" />
          <span className="text-[11px] uppercase tracking-hud text-slate-400">
            {copy.reportLabel}
          </span>
          <LanguagePills value={lang} onChange={setLang} size="sm" />
        </div>

        {/* Uploader */}
        <QAUploader
          busy={busy}
          onAnalyzeAudio={handleAudio}
          onAnalyzeText={handleText}
        />

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm"
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {review && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <QAResults review={review} latencyMs={latency ?? undefined} model={model ?? undefined} />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 mb-4 text-[10px] text-slate-500 italic text-center">
          Synthetic / demo data only. In production this view writes the QA
          report to the bank's QA system and triggers manager-coaching tasks.
        </p>
      </div>
    </main>
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
