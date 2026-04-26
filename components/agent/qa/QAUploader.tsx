"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileAudio, FileText, Sparkles, Loader2 } from "lucide-react";
import { SAMPLE_TRANSCRIPT_UZ } from "@/lib/agent/qa-samples";

interface QAUploaderProps {
  busy: boolean;
  onAnalyzeAudio: (file: File) => void;
  onAnalyzeText: (transcript: string) => void;
}

const MAX_BYTES = 20 * 1024 * 1024;

export function QAUploader({ busy, onAnalyzeAudio, onAnalyzeText }: QAUploaderProps) {
  const [text, setText] = useState("");
  const [audioName, setAudioName] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((file: File) => {
    setErr(null);
    if (!file.type.startsWith("audio/")) {
      setErr("Please upload an audio file (mp3 / wav / m4a).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 20 MB.`);
      return;
    }
    setAudioFile(file);
    setAudioName(file.name);
  }, []);

  const handleSubmit = useCallback(() => {
    if (audioFile) {
      onAnalyzeAudio(audioFile);
    } else if (text.trim().length >= 30) {
      onAnalyzeText(text.trim());
    } else {
      setErr("Paste at least a few sentences of transcript, or attach an audio file.");
    }
  }, [audioFile, text, onAnalyzeAudio, onAnalyzeText]);

  const loadSample = useCallback(() => {
    setAudioFile(null);
    setAudioName(null);
    setText(SAMPLE_TRANSCRIPT_UZ);
    setErr(null);
  }, []);

  return (
    <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 max-w-3xl mx-auto">
      <div className="text-[12px] uppercase tracking-hud text-slate-400 mb-2">
        Step 1 · Provide a recording or transcript
      </div>

      {/* Drop zone for audio */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) acceptFile(f);
        }}
        className={[
          "cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition mb-4",
          dragOver
            ? "border-accent-teal/60 bg-accent-teal/5"
            : audioFile
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-white/15 bg-white/[0.02] hover:border-white/30",
        ].join(" ")}
      >
        {audioFile ? (
          <div className="flex items-center justify-center gap-3 text-emerald-200">
            <FileAudio size={20} />
            <div className="text-left">
              <div className="text-sm font-medium">{audioName}</div>
              <div className="text-[11px] opacity-70">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAudioFile(null); setAudioName(null); }}
              className="ml-3 text-[10px] uppercase tracking-hud text-slate-400 hover:text-rose-300"
            >
              remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <Upload size={24} className="text-slate-400" />
            <div className="text-sm">
              Drop an <span className="text-accent-teal">audio recording</span> here, or click to choose
            </div>
            <div className="text-[11px] text-slate-500">
              MP3 · WAV · M4A · up to 20 MB
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) acceptFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Or paste transcript */}
      <div className="text-[11px] uppercase tracking-hud text-slate-500 mb-1.5 flex items-center gap-2">
        <span className="flex-1 h-px bg-white/10" />
        <span>or paste a transcript</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); if (audioFile) { setAudioFile(null); setAudioName(null); } }}
        placeholder={`Example:\nAGENT: Assalomu alaykum, men SQBdan...\nCUSTOMER: ...`}
        rows={6}
        className="w-full resize-y px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 focus:border-accent-teal/60 focus:bg-white/[0.06] text-[13px] text-slate-100 placeholder:text-slate-600 outline-none transition leading-relaxed font-mono"
      />

      {err && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
          ⚠ {err}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={busy}
          className={[
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition",
            busy
              ? "bg-amber-500/15 border border-amber-500/40 text-amber-200 cursor-wait"
              : "bg-gradient-to-br from-accent-teal to-cyan-600 text-white shadow-lg shadow-accent-teal/30 hover:scale-[1.02]",
          ].join(" ")}
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Reviewing the call…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Run QA review
            </>
          )}
        </motion.button>

        <button
          onClick={loadSample}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.08] text-xs disabled:opacity-50"
        >
          <FileText size={13} />
          Try sample (Uzbek call)
        </button>

        <div className="ml-auto text-[10px] text-slate-500">
          Powered by Gemini 2.5 Pro · ~10–25 s
        </div>
      </div>
    </div>
  );
}
