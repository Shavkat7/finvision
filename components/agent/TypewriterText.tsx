"use client";

import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  className?: string;
}

// Reveals text letter-by-letter when `text` changes. Skips animation
// for very short strings (<3 chars).
export function TypewriterText({ text, speedMs = 18, className }: TypewriterTextProps) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!text || text.length < 3) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  return (
    <span className={className}>
      {shown}
      {shown.length < text.length && (
        <span className="inline-block w-0.5 h-3.5 -mb-0.5 ml-0.5 bg-current opacity-60 animate-pulse" />
      )}
    </span>
  );
}
