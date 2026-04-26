"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}

// Smoothly animates from previous to next value with easeOutCubic.
export function CountUp({
  value,
  durationMs = 600,
  format = (n) => Math.round(n).toString(),
  className,
}: CountUpProps) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef(value);

  useEffect(() => {
    fromRef.current = shown;
    targetRef.current = value;
    startRef.current = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={`tabular-nums ${className ?? ""}`}>{format(shown)}</span>;
}
