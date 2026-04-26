"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface PanelDoc {
  emoji: string;
  title: string;
  description: string;
  pane: "header" | "left" | "center" | "right";
}

const PANELS: PanelDoc[] = [
  {
    emoji: "🕐", pane: "header",
    title: "Call timer",
    description: "Total length of the live call. Starts when the first turn is sent.",
  },
  {
    emoji: "💵", pane: "header",
    title: "Revenue if they sign",
    description: "Estimated SQB margin if the customer accepts the recommended product. Updates live.",
  },
  {
    emoji: "🎯", pane: "header",
    title: "Will they buy? (close probability)",
    description: "AI's % estimate that this call ends in a sale. Climbs with positive signals.",
  },
  {
    emoji: "📞", pane: "left",
    title: "Live call (transcript)",
    description: "Speaker-tagged transcript. Indigo = agent, slate = customer. Entity chips at the bottom show what the AI extracted.",
  },
  {
    emoji: "💡", pane: "center",
    title: "Suggest next move",
    description: "Single most useful thing for the agent to say or ask, right now. Updates after every turn.",
  },
  {
    emoji: "🎯", pane: "center",
    title: "Recommend this product",
    description: "Best SQB product for THIS customer based on profile + conversation. Includes rate, amount, monthly payment, and AI confidence.",
  },
  {
    emoji: "💬", pane: "center",
    title: "Reply to objection (battle cards)",
    description: "Appears when the customer pushes back. Three approved responses — click any to copy to clipboard.",
  },
  {
    emoji: "❓", pane: "center",
    title: "Smart questions to ask",
    description: "AI suggests up to 3 questions worth asking next. Click any to insert it as the agent's next turn.",
  },
  {
    emoji: "❤️", pane: "right",
    title: "Call going well? (customer health)",
    description: "0-100. Combines sentiment, engagement, compliance progress, objection recovery. Glowing → near 100. Hostile → near 0.",
  },
  {
    emoji: "👤", pane: "right",
    title: "Customer info (CRM)",
    description: "Name, age, occupation, income, credit score, existing products, recent activity. Drives the recommendations.",
  },
  {
    emoji: "😊", pane: "right",
    title: "Customer mood (sentiment)",
    description: "Negative → neutral → positive, with a 20-point trend line. Pivot strategy when it dips.",
  },
  {
    emoji: "📋", pane: "right",
    title: "Required disclosures (compliance)",
    description: "8 KYC/AML items the agent must confirm. Items glow green as the AI detects them. Red ✕ if a 'guaranteed' / illegal promise is made.",
  },
];

const PANE_COLORS: Record<PanelDoc["pane"], string> = {
  header: "text-cyan-300",
  left:   "text-indigo-300",
  center: "text-amber-300",
  right:  "text-emerald-300",
};

export function HelpDrawer({ open, onClose }: HelpDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-bg-elevated border-l border-white/10 z-50 overflow-y-auto"
          >
            <div className="sticky top-0 px-6 py-4 border-b border-white/5 bg-bg-elevated/95 backdrop-blur z-10 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-hud text-slate-400">
                  Operator Copilot
                </div>
                <div className="text-lg font-semibold text-white">
                  What every panel does
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              <p className="text-[13px] text-slate-300 leading-relaxed mb-3">
                After every turn the AI re-analyzes the conversation, then
                routes the result into these panels. Click anywhere outside
                this card to dismiss.
              </p>

              {(["header", "left", "center", "right"] as const).map((pane) => {
                const items = PANELS.filter((p) => p.pane === pane);
                return (
                  <section key={pane} className="mb-4">
                    <div className={`text-[10px] uppercase tracking-hud mb-2 ${PANE_COLORS[pane]}`}>
                      {pane === "header" ? "Top bar" :
                       pane === "left"   ? "Left pane" :
                       pane === "center" ? "Center pane" : "Right pane"}
                    </div>
                    <ul className="space-y-2">
                      {items.map((p) => (
                        <li
                          key={p.title}
                          className="rounded-xl bg-white/[0.03] border border-white/8 p-3"
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-base shrink-0">{p.emoji}</span>
                            <div className="text-[13px] font-semibold text-white">
                              {p.title}
                            </div>
                          </div>
                          <div className="text-[12px] text-slate-300 leading-snug pl-7">
                            {p.description}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}

              <section className="mb-4">
                <div className="text-[10px] uppercase tracking-hud mb-2 text-slate-400">
                  Keyboard
                </div>
                <ul className="space-y-1.5 text-[12px]">
                  <Hk k="?" v="Open this guide" />
                  <Hk k="⌘K / Ctrl+K" v="Command palette" />
                  <Hk k="Enter" v="Send the typed turn" />
                  <Hk k="Esc" v="Close panel" />
                </ul>
              </section>

              <p className="text-[11px] text-slate-500 italic mt-4">
                Built for hackathon demo. In production, the transcript
                comes from the PBX (Asterisk / Cisco / Avaya) and CRM
                writes go to the bank's ABS system.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Hk({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-center justify-between">
      <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-200 tabular-nums text-[11px]">
        {k}
      </kbd>
      <span className="text-slate-300">{v}</span>
    </li>
  );
}
