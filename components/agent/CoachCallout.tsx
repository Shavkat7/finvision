"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

export interface CoachMessage {
  id: string;
  text: string;
  emoji?: string;
  /** Direction the speech-bubble tail points toward — purely cosmetic. */
  pointTo?: "left" | "center" | "right";
}

interface CoachCalloutProps {
  message: CoachMessage | null;
}

export function CoachCallout({ message }: CoachCalloutProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message.id}
          initial={{ y: -16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-40 max-w-md pointer-events-none"
        >
          <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-fuchsia-500/10 border border-indigo-400/40 backdrop-blur shadow-2xl shadow-indigo-500/30">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                {message.emoji
                  ? <span className="text-base">{message.emoji}</span>
                  : <Lightbulb size={14} className="text-indigo-200" />}
              </div>
              <div className="text-[13px] leading-snug text-indigo-50">
                <div className="text-[10px] uppercase tracking-hud text-indigo-300/80 mb-0.5">
                  Coach tip
                </div>
                {message.text}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
