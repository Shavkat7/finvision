"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, X, Loader2 } from "lucide-react";
import type { Lang, UserDocument } from "@/lib/types";
import { uploadDocument } from "@/lib/upload";

interface KnowledgeUploadProps {
  docs: UserDocument[];
  onAdd: (doc: UserDocument) => void;
  onRemove: (id: string) => void;
  lang: Lang;
}

const LABELS = {
  uz: {
    add: "Bilim qo'shish",
    drop: "Hujjat tashlang yoki tanlang",
    formats: "PDF, DOCX, TXT, MD · 5 MB gacha",
    uploading: "Yuklanmoqda...",
    parse_error: "Hujjatni o'qib bo'lmadi",
    empty: "Hozircha hujjat yo'q",
  },
  ru: {
    add: "Добавить знание",
    drop: "Перетащите документ или выберите",
    formats: "PDF, DOCX, TXT, MD · до 5 МБ",
    uploading: "Загрузка...",
    parse_error: "Не удалось прочитать документ",
    empty: "Пока документов нет",
  },
  en: {
    add: "Add knowledge",
    drop: "Drop a document here, or click",
    formats: "PDF, DOCX, TXT, MD · up to 5 MB",
    uploading: "Uploading...",
    parse_error: "Could not read the document",
    empty: "No documents yet",
  },
} as const;

export function KnowledgeUpload({ docs, onAdd, onRemove, lang }: KnowledgeUploadProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = LABELS[lang];

  const handleFile = useCallback(
    async (file: File) => {
      setErr(null);
      setBusy(true);
      try {
        const doc = await uploadDocument(file);
        onAdd(doc);
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.parse_error);
      } finally {
        setBusy(false);
      }
    },
    [onAdd, t.parse_error],
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.08] transition text-xs"
        aria-label={t.add}
      >
        {docs.length > 0 ? (
          <>
            <FileText size={12} />
            <span>{docs.length}</span>
          </>
        ) : (
          <>
            <Plus size={12} />
            <span className="hidden sm:inline">{t.add}</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl bg-bg-elevated border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer p-5 m-3 rounded-xl border-2 border-dashed transition ${
                  dragOver
                    ? "border-accent-teal bg-accent-teal/10"
                    : "border-white/15 hover:border-white/30 bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-1">
                  {busy ? (
                    <Loader2 size={20} className="text-accent-teal animate-spin" />
                  ) : (
                    <FileText size={20} className="text-slate-300" />
                  )}
                  <div className="text-sm text-slate-200">
                    {busy ? t.uploading : t.drop}
                  </div>
                  <div className="text-[11px] text-slate-500">{t.formats}</div>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.markdown"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {err && (
                <div className="mx-3 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {err}
                </div>
              )}

              <div className="px-3 pb-3 space-y-1.5 max-h-64 overflow-y-auto">
                {docs.length === 0 ? (
                  <div className="text-[12px] text-slate-500 text-center py-2">
                    {t.empty}
                  </div>
                ) : (
                  docs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-slate-200"
                    >
                      <FileText size={13} className="text-accent-teal shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[13px]">{d.filename}</div>
                        <div className="text-[10px] text-slate-500">
                          {d.chunks.length} chunks · {Math.round(d.characters / 1024)}KB
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(d.id)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-300"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
