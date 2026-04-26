"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Languages, FileText, Phone, ClipboardCheck, Sparkles, X,
  Headphones, BookOpen, ShieldCheck, RefreshCcw, Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAction: (id: string) => void;
}

const ICON = (n: number) => n;

const COMMANDS: Omit<Command, "action">[] = [
  { id: "insert-opening",    label: "Insert opening script", hint: "Greeting + purpose disclosure", icon: <Phone size={14} /> },
  { id: "insert-closing",    label: "Insert closing script", hint: "Cooling-off + consent",         icon: <ClipboardCheck size={14} /> },
  { id: "alt-offer",         label: "Generate alternative offer", hint: "Different product / rate", icon: <Sparkles size={14} /> },
  { id: "supervisor",        label: "Request supervisor",   hint: "Barge-in support",              icon: <Headphones size={14} /> },
  { id: "translate-ru",      label: "Translate transcript to Russian", icon: <Languages size={14} /> },
  { id: "translate-en",      label: "Translate transcript to English", icon: <Languages size={14} /> },
  { id: "open-product-kb",   label: "Open product knowledge base", hint: "Rates, conditions, FAQ", icon: <BookOpen size={14} /> },
  { id: "open-compliance",   label: "Open compliance checklist", icon: <ShieldCheck size={14} /> },
  { id: "summary-note",      label: "Add note for supervisor", icon: <FileText size={14} /> },
  { id: "reset-call",        label: "Reset / start a new call", icon: <RefreshCcw size={14} /> },
];

export function CommandPalette({ open, onClose, onAction }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(q.toLowerCase()) ||
    (c.hint?.toLowerCase().includes(q.toLowerCase()) ?? false),
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[idx];
      if (cmd) {
        onAction(cmd.id);
        onClose();
      }
    }
  };

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
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onKeyDown={onKey}
            className="fixed left-1/2 top-[18vh] -translate-x-1/2 z-50 w-[min(92vw,560px)] rounded-2xl bg-bg-elevated/95 border border-white/10 shadow-2xl shadow-black/60 backdrop-blur"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <Search size={14} className="text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                placeholder="Type a command…"
                className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500"
              />
              <kbd className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                Esc
              </kbd>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
                <X size={14} />
              </button>
            </div>

            <ul className="max-h-[50vh] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-[13px] text-slate-500 italic">
                  No commands match.
                </li>
              ) : (
                filtered.map((c, i) => (
                  <li key={c.id}>
                    <button
                      onClick={() => { onAction(c.id); onClose(); }}
                      onMouseEnter={() => setIdx(i)}
                      className={[
                        "w-full text-left px-4 py-2 flex items-center gap-3 transition",
                        i === idx
                          ? "bg-accent-teal/15 border-l-2 border-accent-teal"
                          : "border-l-2 border-transparent hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <span className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-slate-300">
                        {c.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-slate-100 truncate">{c.label}</div>
                        {c.hint && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {c.hint}
                          </div>
                        )}
                      </div>
                      {i === idx && (
                        <kbd className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                          ↵
                        </kbd>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>↑↓ navigate · ↵ run</span>
              <span>SQB Operator Copilot</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
