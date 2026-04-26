"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import type { SuggestedQuestion } from "@/lib/agent/types";

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onAsk: (text: string) => void;
}

export function SuggestedQuestions({ questions, onAsk }: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl bg-violet-500/8 border border-violet-500/30 p-3.5 shadow-[0_0_30px_-12px_rgba(139,92,246,0.4)]"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-violet-500/30 flex items-center justify-center">
          <MessageCircleQuestion size={12} className="text-violet-200" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-violet-200">
          Try asking
        </div>
        <span className="ml-auto text-[9px] uppercase tracking-wider text-violet-300/70 tabular-nums">
          {questions.length} option{questions.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="space-y-1.5">
        <AnimatePresence>
          {questions.slice(0, 3).map((q, i) => (
            <motion.li
              key={q.text}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <button
                onClick={() => onAsk(q.text)}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 hover:border-violet-300/40 transition group"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-slate-100 leading-snug">
                      {q.text}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {q.reason}
                    </div>
                  </div>
                  <ArrowRight
                    size={13}
                    className="shrink-0 mt-1 text-violet-300/0 group-hover:text-violet-300 transition"
                  />
                </div>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
