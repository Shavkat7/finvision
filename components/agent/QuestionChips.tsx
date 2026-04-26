"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, MessageCircleQuestion } from "lucide-react";
import type { SuggestedQuestion } from "@/lib/agent/types";

interface QuestionChipsProps {
  questions: SuggestedQuestion[];
  onAsk: (text: string) => void;
}

// Horizontal strip of clickable suggested questions, anchored just above the
// composer. This is where the operator's eye already is when they're about to
// type — way easier to target than the center pane (which scrolls during demo).
export function QuestionChips({ questions, onAsk }: QuestionChipsProps) {
  return (
    <AnimatePresence>
      {questions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="border-t border-white/5 bg-violet-500/[0.03]"
        >
          <div className="px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-hud text-violet-200/70">
              <MessageCircleQuestion size={11} />
              <span>Try asking · click to insert</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
              {questions.slice(0, 4).map((q, i) => (
                <motion.button
                  key={q.text}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => onAsk(q.text)}
                  title={q.reason}
                  className="group shrink-0 max-w-[300px] text-left px-3 py-2 rounded-xl bg-violet-500/12 hover:bg-violet-500/20 border border-violet-400/25 hover:border-violet-300/60 transition flex items-start gap-2"
                >
                  <span className="text-[12.5px] leading-snug text-slate-100 line-clamp-2">
                    {q.text}
                  </span>
                  <ArrowUpRight
                    size={13}
                    className="shrink-0 mt-0.5 text-violet-300/60 group-hover:text-violet-200 transition"
                  />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
