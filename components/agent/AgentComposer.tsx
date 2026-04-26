"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Send, User, UserCog } from "lucide-react";
import { AgentMicButton } from "./AgentMicButton";

type Speaker = "agent" | "customer";

interface AgentComposerProps {
  onSend: (speaker: Speaker, text: string) => void;
  onRunDemo: () => void;
  demoRunning: boolean;
  busy: boolean;
}

export function AgentComposer({ onSend, onRunDemo, demoRunning, busy }: AgentComposerProps) {
  const [speaker, setSpeaker] = useState<Speaker>("agent");
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  }, [text]);

  const submit = useCallback(() => {
    const v = text.trim();
    if (!v) return;
    onSend(speaker, v);
    setText("");
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) ta.style.height = "auto";
    });
  }, [text, speaker, onSend]);

  return (
    <div className="border-t border-white/5 px-3 py-2.5 bg-bg-elevated/40 backdrop-blur">
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        <SpeakerPill
          active={speaker === "agent"}
          icon={<UserCog size={12} />}
          label="Agent"
          color="indigo"
          onClick={() => setSpeaker("agent")}
        />
        <SpeakerPill
          active={speaker === "customer"}
          icon={<User size={12} />}
          label="Customer"
          color="slate"
          onClick={() => setSpeaker("customer")}
        />

        {/* Push-to-talk for the agent (real Uzbek/RU/EN STT via Gemini Live) */}
        <AgentMicButton
          onTranscript={(t) => onSend("agent", t)}
          onPartial={(p) => setText(p)}
          disabled={demoRunning}
        />

        <div className="ml-auto flex items-center gap-2">
          {busy && (
            <div className="text-[10px] uppercase tracking-wider text-amber-300 animate-pulse">
              analyzing…
            </div>
          )}
          <button
            type="button"
            onClick={onRunDemo}
            disabled={demoRunning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-br from-accent-teal/20 to-cyan-600/20 border border-accent-teal/40 text-accent-teal text-[11px] uppercase tracking-wider hover:bg-accent-teal/30 transition disabled:opacity-50"
          >
            <Play size={10} />
            {demoRunning ? "Playing…" : "Run demo"}
          </button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={
            speaker === "agent" ? "Agent says…" : "Customer says…"
          }
          className="flex-1 resize-none px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-accent-teal/60 focus:bg-white/[0.06] text-[13px] text-slate-100 placeholder:text-slate-500 outline-none transition leading-snug max-h-[100px] overflow-y-auto"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className={[
            "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition",
            text.trim()
              ? "bg-gradient-to-br from-accent-teal to-cyan-600 text-white shadow-md hover:scale-105"
              : "bg-white/[0.04] border border-white/10 text-slate-500 cursor-not-allowed",
          ].join(" ")}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function SpeakerPill({
  active, icon, label, color, onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  color: "indigo" | "slate";
  onClick: () => void;
}) {
  const accent =
    active && color === "indigo"
      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
      : active && color === "slate"
        ? "bg-slate-500/20 border-slate-400/40 text-slate-100"
        : "bg-transparent border-white/10 text-slate-400 hover:border-white/20";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] uppercase tracking-wider transition ${accent}`}
    >
      {icon}
      {label}
    </button>
  );
}
