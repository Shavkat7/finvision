"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Send, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Lang, UserDocument } from "@/lib/types";
import { t } from "@/lib/i18n";
import { uploadDocument } from "@/lib/upload";

interface ComposerProps {
  lang: Lang;
  /** Send text. The page is responsible for auto-connecting if needed. */
  onSend: (text: string) => void;
  /** Add a freshly uploaded document to the session. */
  onUploadDocument: (doc: UserDocument) => void;
  /** True when push-to-talk button is currently held — disable composer focus jumps then. */
  disabled?: boolean;
}

export function Composer({ lang, onSend, onUploadDocument, disabled }: ComposerProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea up to ~100px.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  }, [text]);

  const submit = useCallback(() => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
    // Reset textarea height after clear.
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) ta.style.height = "auto";
    });
  }, [text, onSend]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
      // Stop spacebar from triggering the global push-to-talk handler
      // while the user is typing.
      if (e.code === "Space") e.stopPropagation();
    },
    [submit],
  );

  const onPickFile = useCallback(async (file: File) => {
    setUploadErr(null);
    setUploadOk(null);
    setUploading(true);
    try {
      const doc = await uploadDocument(file);
      onUploadDocument(doc);
      setUploadOk(doc.filename);
      // Auto-clear the success badge after a moment.
      setTimeout(() => setUploadOk(null), 2200);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
      setTimeout(() => setUploadErr(null), 3500);
    } finally {
      setUploading(false);
    }
  }, [onUploadDocument]);

  return (
    <div className="border-t border-white/5 px-3 py-2.5">
      {/* Status row: appears only when uploading or after upload result */}
      <AnimatePresence>
        {(uploading || uploadOk || uploadErr) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="px-1 pb-1.5 text-[11px]"
          >
            {uploading && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <Loader2 size={11} className="animate-spin" />
                {lang === "uz" ? "Yuklanmoqda..." : lang === "ru" ? "Загрузка..." : "Uploading..."}
              </span>
            )}
            {uploadOk && !uploading && (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Check size={11} />
                {uploadOk}
              </span>
            )}
            {uploadErr && !uploading && (
              <span className="text-red-300">⚠ {uploadErr}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label={t(lang, "composer_attach")}
          title={t(lang, "composer_attach")}
          className="shrink-0 w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.10] hover:border-accent-teal/40 transition flex items-center justify-center text-slate-300 disabled:opacity-50"
        >
          <Paperclip size={16} />
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
        </button>

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t(lang, "composer_placeholder")}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 focus:border-accent-teal/60 focus:bg-white/[0.06] text-[14px] text-slate-100 placeholder:text-slate-500 outline-none transition leading-snug max-h-[100px] overflow-y-auto"
        />

        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label={t(lang, "composer_send")}
          title={t(lang, "composer_send")}
          className={[
            "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition",
            text.trim()
              ? "bg-gradient-to-br from-accent-teal to-cyan-600 text-white shadow-md shadow-accent-teal/30 hover:scale-105"
              : "bg-white/[0.04] border border-white/10 text-slate-500 cursor-not-allowed",
          ].join(" ")}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
