"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MapPin, Settings, Sparkles, X } from "lucide-react";

import { VoiceOrb } from "@/components/VoiceOrb";
import { Transcript } from "@/components/Transcript";
import { ToolCard } from "@/components/ToolCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { KnowledgeUpload } from "@/components/KnowledgeUpload";
import { QuickActions } from "@/components/QuickActions";
import { LanguagePills } from "@/components/LanguagePills";
import { Composer } from "@/components/Composer";

import { GeminiLiveClient } from "@/lib/gemini-client";
import { AudioCapture } from "@/lib/audio-capture";
import { AudioPlayer } from "@/lib/audio-player";
import { runTool } from "@/lib/tools";
import { getSystemPrompt } from "@/lib/prompts";
import { getAppContext, type AppContext } from "@/lib/context";
import { t } from "@/lib/i18n";
import { uid } from "@/lib/utils";
import type {
  EphemeralTokenResponse,
  GeminiVoice,
  GeoCoords,
  Lang,
  SessionState,
  ToolInvocation,
  TranscriptEntry,
  UserDocument,
} from "@/lib/types";

async function fetchTokenWithRetry(): Promise<EphemeralTokenResponse> {
  let lastDetail = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch("/api/token", { method: "POST" });
    if (res.ok) return (await res.json()) as EphemeralTokenResponse;
    let body: { error?: string; detail?: string; upstreamStatus?: number } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    lastDetail = body.detail || body.error || res.statusText;
    if (res.status >= 400 && res.status < 500) break;
    if (attempt === 1) await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Token error: ${lastDetail}`);
}

const LANG_KEY = "ovozai.lang";
const VOICE_KEY = "ovozai.voice";
const DOCS_KEY = "ovozai.docs.v1";

export default function Page() {
  const [state, setState] = useState<SessionState>("idle");
  const [voice, setVoice] = useState<GeminiVoice>("Aoede");
  const [language, setLanguage] = useState<Lang>("uz");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [tools, setTools] = useState<ToolInvocation[]>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<GeoCoords | null>(null);
  const [locStatus, setLocStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [uploadedDocs, setUploadedDocs] = useState<UserDocument[]>([]);
  const [holding, setHolding] = useState(false);

  // Persisted preferences.
  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY) as Lang | null;
      if (l && (l === "uz" || l === "ru" || l === "en")) setLanguage(l);
      const v = localStorage.getItem(VOICE_KEY) as GeminiVoice | null;
      if (v) setVoice(v);
      const docsRaw = localStorage.getItem(DOCS_KEY);
      if (docsRaw) {
        const parsed = JSON.parse(docsRaw) as UserDocument[];
        if (Array.isArray(parsed)) setUploadedDocs(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { try { localStorage.setItem(LANG_KEY, language); } catch { /* */ } }, [language]);
  useEffect(() => { try { localStorage.setItem(VOICE_KEY, voice); } catch { /* */ } }, [voice]);
  useEffect(() => {
    try {
      const total = JSON.stringify(uploadedDocs).length;
      if (total < 1_000_000) {
        localStorage.setItem(DOCS_KEY, JSON.stringify(uploadedDocs));
      }
    } catch { /* ignore */ }
  }, [uploadedDocs]);

  // Refs.
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const userPartialIdRef = useRef<string | null>(null);
  const aiPartialIdRef = useRef<string | null>(null);
  const locRef = useRef<GeoCoords | null>(null);
  const docsRef = useRef<UserDocument[]>([]);
  const holdingRef = useRef(false);
  // Text queued when the user typed before connecting; flushed on setupComplete.
  const pendingTextRef = useRef<string | null>(null);
  // Speech-gating refs — see startCapture/handleHoldStart/handleHoldEnd.
  const activityStartedRef = useRef(false);
  const speechRunRef = useRef(0);            // consecutive loud-chunk count
  const preBufferRef = useRef<ArrayBuffer[]>([]);
  useEffect(() => { locRef.current = userLocation; }, [userLocation]);
  useEffect(() => { docsRef.current = uploadedDocs; }, [uploadedDocs]);
  useEffect(() => { holdingRef.current = holding; }, [holding]);

  // ──────────────────── Geolocation ────────────────────
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy,
          });
          setLocStatus("granted");
          resolve();
        },
        () => { setLocStatus("denied"); resolve(); },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
      );
    });
  }, []);

  // ──────────────────── connect ────────────────────
  const connect = useCallback(async () => {
    if (clientRef.current) return;
    setErrorMsg(null);
    setState("connecting");

    try {
      void requestLocation();

      const tok = await fetchTokenWithRetry();
      const appContext = getAppContext(locRef.current);

      const player = new AudioPlayer();
      await player.init({ onAmplitude: (rms) => setAmplitude(rms) });
      playerRef.current = player;

      const client = new GeminiLiveClient({
        token: tok.token,
        model: tok.model,
        voice,
        language,
        context: appContext,
        uploadedDocs: docsRef.current.map((d) => ({ filename: d.filename })),
        pushToTalk: true,
        systemPrompt: getSystemPrompt({
          language,
          context: appContext,
          uploadedDocCount: docsRef.current.length,
          uploadedDocNames: docsRef.current.map((d) => d.filename),
        }),
        callbacks: {
          onOpen: () => setState("listening"),
          onClose: () => { setState("idle"); cleanup(); },
          onError: (m) => { setErrorMsg(m); setState("error"); },
          onSetupComplete: async () => {
            await startCapture();
            setState("listening");
            // Flush any text the user typed before we were connected.
            if (pendingTextRef.current && clientRef.current?.isConnected()) {
              clientRef.current.sendText(pendingTextRef.current);
              pendingTextRef.current = null;
            }
          },
          onAudio: (b64) => { playerRef.current?.playBase64(b64); setState("speaking"); },
          onUserTranscript: (text, finished) => {
            applyPartialTranscript("user", text, finished);
            if (!finished) setState("listening");
          },
          onAssistantTranscript: (text, finished) => {
            applyPartialTranscript("assistant", text, finished);
          },
          onToolCall: async (calls) => {
            setState("thinking");
            const responses: Array<{ id: string; name: string; response: unknown }> = [];
            for (const call of calls) {
              const inv: ToolInvocation = {
                id: call.id, name: call.name, args: call.args,
                status: "pending", timestamp: Date.now(),
              };
              setTools((t) => [...t, inv]);
              const out = await runTool(call.name, call.args, {
                userLocation: locRef.current ?? undefined,
                uploadedDocs: docsRef.current,
              });
              const settled: ToolInvocation = out.ok
                ? { ...inv, status: "ok", result: out.result }
                : { ...inv, status: "error", result: { error: out.error } };
              setTools((t) => t.map((x) => (x.id === inv.id ? settled : x)));
              responses.push({
                id: call.id, name: call.name,
                response: out.ok ? out.result : { error: out.error },
              });
            }
            client.sendToolResponse(responses);
          },
          onInterrupted: () => {
            playerRef.current?.interrupt();
            setState("interrupted");
            setTimeout(() => setState("listening"), 250);
          },
          onTurnComplete: () => {
            aiPartialIdRef.current = null;
            userPartialIdRef.current = null;
            setState("listening");
          },
        },
      });
      clientRef.current = client;
      client.connect();
    } catch (e) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setState("error");
      cleanup();
    }
  }, [voice, language, requestLocation]);

  const disconnect = useCallback(() => {
    handleHoldEnd();
    cleanup();
    setState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    playerRef.current?.destroy();
    playerRef.current = null;
    setAmplitude(0);
    setHolding(false);
    holdingRef.current = false;
  }, []);

  const startCapture = useCallback(async () => {
    if (captureRef.current) return;
    const cap = new AudioCapture();
    await cap.start({
      onChunk: (pcm, rms) => {
        // ─── Speech-gated push-to-talk ───
        // We don't call activityStart() on press anymore. Instead we wait
        // until we see real speech (≥ 2 chunks above the RMS threshold).
        // Until then we BUFFER chunks. Once speech is detected we fire
        // activityStart and flush the pre-buffer so we don't drop the first
        // syllable. If the user releases without ever speaking → no
        // activityStart → no AI response on silence.
        if (!holdingRef.current) return;
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
              // Flush pre-buffer so we don't lose the leading speech.
              for (const buf of preBufferRef.current) c.sendAudio(buf);
              preBufferRef.current = [];
            }
          } else {
            // Quiet chunk — decay the speech counter so isolated noise
            // doesn't gradually accumulate to the threshold.
            speechRunRef.current = Math.max(0, speechRunRef.current - 1);
            preBufferRef.current.push(pcm);
            if (preBufferRef.current.length > 12) preBufferRef.current.shift();
          }
        } else {
          c.sendAudio(pcm);
        }
      },
      onAmplitude: (rms) => {
        if (holdingRef.current) setAmplitude(rms);
      },
    });
    captureRef.current = cap;
  }, []);

  const applyPartialTranscript = useCallback(
    (role: "user" | "assistant", chunk: string, finished: boolean) => {
      if (!chunk) return;
      const ref = role === "user" ? userPartialIdRef : aiPartialIdRef;
      setTranscript((cur) => {
        if (ref.current) {
          const idx = cur.findIndex((e) => e.id === ref.current);
          if (idx >= 0) {
            const updated = [...cur];
            updated[idx] = {
              ...updated[idx], text: updated[idx].text + chunk, partial: !finished,
            };
            if (finished) ref.current = null;
            return updated;
          }
        }
        const id = uid();
        ref.current = finished ? null : id;
        return [
          ...cur,
          { id, role, text: chunk, partial: !finished, timestamp: Date.now() },
        ];
      });
    }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ──────────────────── Push-to-talk (speech-gated) ────────────────────
  const handleHoldStart = useCallback(() => {
    const c = clientRef.current;
    if (!c?.isConnected()) return;
    if (holdingRef.current) return;
    setHolding(true);
    holdingRef.current = true;
    // Reset speech-gate state — activityStart is now fired by the
    // onChunk handler when actual speech is detected.
    activityStartedRef.current = false;
    speechRunRef.current = 0;
    preBufferRef.current = [];
    // Cut any AI playback immediately so the user can take over cleanly.
    playerRef.current?.interrupt();
  }, []);

  const handleHoldEnd = useCallback(() => {
    const c = clientRef.current;
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    setAmplitude(0);
    // Only call activityEnd() if we actually committed an activityStart
    // (i.e. the user really spoke). Silent holds → no turn → no AI reply.
    if (activityStartedRef.current && c?.isConnected()) {
      c.activityEnd();
    }
    activityStartedRef.current = false;
    speechRunRef.current = 0;
    preBufferRef.current = [];
  }, []);

  // Spacebar hold (desktop convenience). Skip if focus is in an input.
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      if (!clientRef.current?.isConnected()) return;
      e.preventDefault();
      handleHoldStart();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      handleHoldEnd();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleHoldStart, handleHoldEnd]);

  // Append a user bubble locally (since text input doesn't echo back as inputTranscription).
  const appendUserBubble = useCallback((text: string) => {
    const id = uid();
    setTranscript((cur) => [
      ...cur,
      { id, role: "user", text, partial: false, timestamp: Date.now() },
    ]);
  }, []);

  // Send text — auto-connect if necessary, queue text until setupComplete.
  const sendTextOrConnect = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // Cut any ongoing AI playback for a clean handoff.
      playerRef.current?.interrupt();
      appendUserBubble(trimmed);
      const c = clientRef.current;
      if (c?.isConnected()) {
        c.sendText(trimmed);
      } else {
        pendingTextRef.current = trimmed;
        void connect();
      }
    },
    [appendUserBubble, connect],
  );

  // Quick-action chip click → reuse the same path.
  const handleChip = useCallback(
    (text: string) => sendTextOrConnect(text),
    [sendTextOrConnect],
  );

  // Document upload handlers.
  const addDocument = useCallback((doc: UserDocument) => {
    setUploadedDocs((cur) => [...cur, doc]);
  }, []);
  const removeDocument = useCallback((id: string) => {
    setUploadedDocs((cur) => cur.filter((d) => d.id !== id));
  }, []);

  const isActive = state !== "idle" && state !== "error";

  // Keep context (and therefore time + business-hours) fresh.
  // Note: we defer the FIRST computation to a useEffect so that it doesn't
  // run during SSR — otherwise the server clock and the client clock can
  // disagree by a minute, causing a hydration mismatch.
  const [context, setContext] = useState<AppContext | null>(null);
  useEffect(() => {
    setContext(getAppContext(userLocation));
    const id = setInterval(
      () => setContext(getAppContext(userLocation)),
      30_000,
    );
    return () => clearInterval(id);
  }, [userLocation]);

  const STATUS_LABELS: Record<SessionState, string> = {
    idle: t(language, "status_idle"),
    connecting: t(language, "status_connecting"),
    listening: t(language, "status_listening"),
    thinking: t(language, "status_thinking"),
    speaking: t(language, "status_speaking"),
    interrupted: t(language, "status_interrupted"),
    error: t(language, "status_error"),
  };

  return (
    <main className="relative min-h-screen flex flex-col z-10">
      <header className="flex items-center justify-between px-5 pt-5 pb-2 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-teal to-cyan-600 flex items-center justify-center shadow-lg shadow-accent-teal/30 shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-tight truncate">
              SQB <span className="text-accent-teal">OvozAI</span>
            </div>
            <div
              className="text-[11px] text-slate-400 leading-tight truncate"
              suppressHydrationWarning
            >
              {context?.local_time_tashkent ?? "—"} · GMT+5
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="/agent"
            title="Open Operator Copilot"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-[11px] hover:bg-indigo-500/20 transition"
          >
            <Sparkles size={11} />
            Copilot
          </a>

          <KnowledgeUpload
            docs={uploadedDocs}
            onAdd={addDocument}
            onRemove={removeDocument}
            lang={language}
          />

          <LanguagePills value={language} onChange={setLanguage} size="sm" />

          {locStatus === "granted" && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px]">
              <MapPin size={10} />
              GPS
            </div>
          )}

          {isActive && (
            <button
              onClick={disconnect}
              className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-200 text-xs hover:bg-red-500/20 transition flex items-center gap-1"
              aria-label={t(language, "end_session")}
            >
              <X size={12} />
              <span className="hidden sm:inline">{t(language, "end_session")}</span>
            </button>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-full hover:bg-white/10 text-slate-300 transition"
            aria-label={t(language, "settings")}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-5">
        <VoiceOrb state={holding ? "listening" : state} amplitude={amplitude} size={280} />

        <div className="flex flex-col items-center gap-2">
          <StatusBadge state={state} holding={holding} />
          <AnimatePresence mode="wait">
            <motion.div
              key={`${holding ? "h" : "i"}-${state}-${language}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-3xl font-display font-semibold tracking-tight"
            >
              {holding ? t(language, "release_to_send") : STATUS_LABELS[state]}
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm text-red-400 max-w-xs text-center"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <QuickActions
          context={context ?? getAppContext(userLocation)}
          hasUploadedDocs={uploadedDocs.length > 0}
          isConnected={isActive}
          lang={language}
          onChip={handleChip}
        />

        {tools.length > 0 && (
          <div className="w-full max-w-3xl overflow-x-auto pb-2 no-scrollbar">
            <div className="flex gap-3 px-2">
              <AnimatePresence>
                {tools.slice(-4).map((tool) => (
                  <ToolCard key={tool.id} invocation={tool} lang={language} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </section>

      <section className="px-4 pb-32">
        <div className="max-w-3xl mx-auto glass rounded-3xl overflow-hidden flex flex-col h-[320px] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              {t(language, "conversation")}
            </div>
            <div className="text-[11px] text-slate-500">
              {transcript.length} {t(language, "messages")}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Transcript entries={transcript} emptyText={t(language, "empty_chat")} />
          </div>
          <Composer
            lang={language}
            onSend={sendTextOrConnect}
            onUploadDocument={addDocument}
            disabled={holding}
          />
        </div>
      </section>

      {/* Bottom dock — connect button OR push-to-talk */}
      <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
        {!isActive ? (
          <button
            onClick={connect}
            className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-accent-teal to-cyan-600 shadow-2xl shadow-accent-teal/40 text-white flex items-center justify-center transition transform hover:scale-105 active:scale-95"
            aria-label={t(language, "start_listening")}
          >
            <Mic size={28} />
          </button>
        ) : (
          <>
            <PushToTalkButton holding={holding} onStart={handleHoldStart} onEnd={handleHoldEnd} />
            <div className="text-[11px] text-slate-400 px-3 py-1 rounded-full bg-black/40 backdrop-blur border border-white/5">
              {t(language, "hold_hint")}
            </div>
          </>
        )}
      </div>

      <SettingsPanel
        open={settingsOpen}
        voice={voice}
        language={language}
        locationGranted={locStatus === "granted"}
        onVoiceChange={setVoice}
        onLanguageChange={setLanguage}
        onRequestLocation={requestLocation}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}

function StatusBadge({ state, holding }: { state: SessionState; holding: boolean }) {
  const color: Record<SessionState, string> = {
    idle: "bg-slate-500", connecting: "bg-violet-400", listening: "bg-emerald-400",
    thinking: "bg-amber-400", speaking: "bg-blue-400", interrupted: "bg-red-400", error: "bg-red-500",
  };
  const dotColor = holding ? "bg-emerald-400" : color[state];
  const label = holding ? "REC" : state;
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} dot-pulse`} />
      <span className="text-[11px] uppercase tracking-wider text-slate-300">{label}</span>
    </div>
  );
}

function PushToTalkButton({
  holding,
  onStart,
  onEnd,
}: {
  holding: boolean;
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        // Make sure we receive pointerup even if the user drags off.
        e.currentTarget.setPointerCapture(e.pointerId);
        onStart();
      }}
      onPointerUp={() => onEnd()}
      onPointerCancel={() => onEnd()}
      onPointerLeave={(e) => {
        // On mouse, leaving the button shouldn't release if the pointer
        // is still captured. setPointerCapture handles that, so leave nothing here.
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) onEnd();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={[
        "relative w-[80px] h-[80px] rounded-full text-white",
        "flex items-center justify-center shadow-2xl transition",
        "active:scale-95 select-none touch-none",
        holding
          ? "bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-emerald-500/60 scale-105"
          : "bg-gradient-to-br from-accent-teal to-cyan-600 shadow-accent-teal/40 hover:scale-105",
      ].join(" ")}
      aria-label="Push to talk"
    >
      {holding && (
        <>
          <span className="absolute inset-0 rounded-full ripple opacity-50 text-emerald-300" />
          <span className="absolute -inset-2 rounded-full border-2 border-emerald-300/40 animate-pulse" />
        </>
      )}
      <Mic size={32} />
    </button>
  );
}
