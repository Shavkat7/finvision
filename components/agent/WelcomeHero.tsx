"use client";

import { motion } from "framer-motion";
import { Play, Type, HelpCircle, Sparkles } from "lucide-react";

interface WelcomeHeroProps {
  onRunDemo: () => void;
  onTypeYourOwn: () => void;
  onShowHelp: () => void;
}

export function WelcomeHero({ onRunDemo, onTypeYourOwn, onShowHelp }: WelcomeHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-6 min-h-0 overflow-y-auto"
    >
      <div className="max-w-3xl w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-[11px] uppercase tracking-hud mb-5">
          <Sparkles size={11} />
          Real-time AI · for bank call agents
        </div>

        <h1 className="text-3xl md:text-[2.6rem] font-bold mb-3 tracking-tight leading-[1.1]">
          The AI <span className="text-accent-teal">whispers</span> while
          <br className="hidden md:block" />
          {" "}your agent talks to the customer.
        </h1>

        <p className="text-[15px] md:text-base text-slate-300 mb-7 max-w-xl mx-auto leading-relaxed">
          Listens to both speakers in Uzbek / Russian / English, picks the
          best product to pitch, keeps every compliance box ticked, and
          auto-fills the CRM at the end.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-7 max-w-2xl mx-auto">
          <Step
            n={1}
            color="indigo"
            title="Listens"
            desc="Streams transcript in 3 languages, detects intent + sentiment + objections."
          />
          <Step
            n={2}
            color="teal"
            title="Suggests"
            desc="Whispers the next move + the best product to pitch to THIS customer."
          />
          <Step
            n={3}
            color="emerald"
            title="Complies"
            desc="Tracks KYC items, flags illegal phrases, auto-fills CRM at end of call."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={onRunDemo}
            className="group flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-br from-accent-teal via-cyan-500 to-cyan-600 text-white font-semibold shadow-2xl shadow-accent-teal/40 hover:shadow-accent-teal/60 transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play size={16} className="fill-white" />
            <span>Run live demo</span>
            <span className="text-[11px] opacity-80 px-1.5 py-0.5 rounded bg-white/20">
              ~90s
            </span>
          </button>

          <button
            onClick={onTypeYourOwn}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 hover:bg-white/[0.08] hover:border-white/20 transition"
          >
            <Type size={14} />
            Or type your own
          </button>

          <button
            onClick={onShowHelp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition text-[13px]"
            title="What does each panel do?"
          >
            <HelpCircle size={14} />
            What is this?
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <span>Tip:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-300">?</kbd>
          <span>opens the panel guide ·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-300">⌘K</kbd>
          <span>opens commands</span>
        </div>
      </div>
    </motion.div>
  );
}

function Step({
  n, title, desc, color,
}: {
  n: number;
  title: string;
  desc: string;
  color: "indigo" | "teal" | "emerald";
}) {
  const accents = {
    indigo:  "from-indigo-500/15 to-violet-500/5 border-indigo-500/30 text-indigo-200",
    teal:    "from-accent-teal/15 to-cyan-500/5 border-accent-teal/30 text-accent-teal",
    emerald: "from-emerald-500/15 to-teal-500/5 border-emerald-500/30 text-emerald-200",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${accents[color]} border p-4 text-left`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold tabular-nums ${
          color === "indigo" ? "border-indigo-400/60 bg-indigo-400/15" :
          color === "teal" ? "border-accent-teal/60 bg-accent-teal/15" :
          "border-emerald-400/60 bg-emerald-400/15"
        }`}>
          {n}
        </div>
        <div className="text-[14px] font-semibold text-white">{title}</div>
      </div>
      <div className="text-[12px] text-slate-300/90 leading-snug">{desc}</div>
    </div>
  );
}
