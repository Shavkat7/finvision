"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GeminiLiveClient } from "@/lib/gemini-client";
import { AudioCapture } from "@/lib/audio-capture";
import type { EphemeralTokenResponse } from "@/lib/types";

interface AgentMicButtonProps {
  /** Called once with the FINAL transcript on each release. */
  onTranscript: (text: string) => void;
  /** Called continuously with the in-progress partial transcript while held. */
  onPartial?: (partial: string) => void;
  disabled?: boolean;
  language?: "uz" | "ru" | "en";
}

const SYSTEM_PROMPT_FOR_STT =
  "You are a transcription helper. Do not respond with anything. Output a single dot if forced.";

export function AgentMicButton({
  onTranscript, onPartial, disabled, language = "uz",
}: AgentMicButtonProps) {
  const [phase, setPhase] = useState<
    "idle" | "connecting" | "ready" | "holding" | "error"
  >("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const partialRef = useRef("");
  const phaseRef = useRef(phase);
  // Speech-gating state — same idea as the customer page push-to-talk:
  // don't fire activityStart() until we've actually heard speech.
  const activityStartedRef = useRef(false);
  const speechRunRef = useRef(0);
  const preBufferRef = useRef<ArrayBuffer[]>([]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Lazy connect. Triggered on first hold attempt.
  const ensureConnected = useCallback(async (): Promise<boolean> => {
    if (clientRef.current?.isConnected()) return true;
    setPhase("connecting");
    setErrMsg(null);
    try {
      const tokRes = await fetch("/api/token", { method: "POST" });
      if (!tokRes.ok) throw new Error(`Token: ${tokRes.statusText}`);
      const tok = (await tokRes.json()) as EphemeralTokenResponse;

      const client = new GeminiLiveClient({
        token: tok.token,
        model: tok.model,
        voice: "Aoede",            // unused — TEXT mode
        language,
        pushToTalk: true,
        responseModalities: ["TEXT"],
        noTools: true,
        systemPrompt: SYSTEM_PROMPT_FOR_STT,
        callbacks: {
          onOpen: () => { /* setupComplete fires next */ },
          onSetupComplete: () => {
            setPhase("ready");
          },
          onClose: () => {
            clientRef.current = null;
            setPhase("idle");
          },
          onError: (m) => { setErrMsg(m); setPhase("error"); },
          onUserTranscript: (text, finished) => {
            if (!text) return;
            partialRef.current += text;
            onPartial?.(partialRef.current);
            if (finished) {
              const full = partialRef.current.trim();
              if (full) onTranscript(full);
              partialRef.current = "";
              onPartial?.("");
            }
          },
          // Ignore the model's own output entirely — we only want STT.
        },
      });
      clientRef.current = client;
      client.connect();

      // Wait for setupComplete (max ~6s).
      const t0 = Date.now();
      while (phaseRef.current !== "ready" && Date.now() - t0 < 6000) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return phaseRef.current === "ready";
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setPhase("error");
      return false;
    }
  }, [language, onPartial, onTranscript]);

  const ensureCapture = useCallback(async (): Promise<boolean> => {
    if (captureRef.current) return true;
    try {
      const cap = new AudioCapture();
      await cap.start({
        onChunk: (pcm, rms) => {
          if (phaseRef.current !== "holding") return;
          const c = clientRef.current;
          if (!c?.isConnected()) return;

          if (!activityStartedRef.current) {
            if (rms > 0.02) {
              speechRunRef.current++;
              preBufferRef.current.push(pcm);
              if (preBufferRef.current.length > 12) preBufferRef.current.shift();
              if (speechRunRef.current >= 2) {
                c.activityStart();
                activityStartedRef.current = true;
                for (const buf of preBufferRef.current) c.sendAudio(buf);
                preBufferRef.current = [];
              }
            } else {
              speechRunRef.current = Math.max(0, speechRunRef.current - 1);
              preBufferRef.current.push(pcm);
              if (preBufferRef.current.length > 12) preBufferRef.current.shift();
            }
          } else {
            c.sendAudio(pcm);
          }
        },
      });
      captureRef.current = cap;
      return true;
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Mic permission denied");
      setPhase("error");
      return false;
    }
  }, []);

  const handleStart = useCallback(async () => {
    if (disabled) return;
    const ok = await ensureConnected();
    if (!ok) return;
    const okMic = await ensureCapture();
    if (!okMic) return;
    partialRef.current = "";
    onPartial?.("");
    activityStartedRef.current = false;
    speechRunRef.current = 0;
    preBufferRef.current = [];
    setPhase("holding");
    // NOTE: activityStart() is now fired by the onChunk handler when speech
    // is actually detected. Silent holds commit nothing → no garbage turns.
  }, [disabled, ensureConnected, ensureCapture, onPartial]);

  const handleEnd = useCallback(() => {
    if (phaseRef.current !== "holding") return;
    if (activityStartedRef.current) {
      clientRef.current?.activityEnd();
    }
    activityStartedRef.current = false;
    speechRunRef.current = 0;
    preBufferRef.current = [];
    setPhase("ready");
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      try { captureRef.current?.stop(); } catch { /* noop */ }
      captureRef.current = null;
      try { clientRef.current?.disconnect(); } catch { /* noop */ }
      clientRef.current = null;
    };
  }, []);

  const busy = phase === "connecting";
  const isHolding = phase === "holding";

  return (
    <div className="relative">
      <motion.button
        type="button"
        disabled={disabled || busy}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          void handleStart();
        }}
        onPointerUp={() => handleEnd()}
        onPointerCancel={() => handleEnd()}
        onPointerLeave={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) handleEnd();
        }}
        onContextMenu={(e) => e.preventDefault()}
        title={
          phase === "error" ? errMsg ?? "Mic unavailable" :
          isHolding ? "Listening — release to send" :
          "Hold to record agent voice (Uzbek/Russian/English)"
        }
        animate={isHolding ? { scale: 1.06 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={[
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition select-none touch-none",
          "text-[11px] uppercase tracking-wider",
          isHolding
            ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.5)]"
            : phase === "error"
              ? "bg-rose-500/15 border-rose-400/40 text-rose-200"
              : phase === "connecting"
                ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                : "bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:border-white/20",
          (disabled || busy) && "opacity-60 cursor-not-allowed",
        ].filter(Boolean).join(" ")}
      >
        {isHolding && (
          <span className="absolute inset-0 rounded-full ripple opacity-50 text-emerald-300" />
        )}
        {busy ? (
          <Loader2 size={11} className="animate-spin" />
        ) : phase === "error" ? (
          <MicOff size={11} />
        ) : (
          <Mic size={11} className={isHolding ? "fill-current" : ""} />
        )}
        <span>
          {busy ? "Connecting…" :
           isHolding ? "Listening…" :
           phase === "error" ? "Mic error" :
           "Hold to talk"}
        </span>
      </motion.button>

      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 whitespace-nowrap"
          >
            REC · agent
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
