"use client";

import { useEffect, useRef } from "react";
import type { SessionState } from "@/lib/types";

interface VoiceOrbProps {
  state: SessionState;
  amplitude: number; // 0..1
  size?: number;
}

const PALETTES: Record<SessionState, [string, string, string]> = {
  idle:        ["#2dd4bf", "#0e7490", "#02060a"],
  connecting:  ["#a78bfa", "#5b21b6", "#02060a"],
  listening:   ["#34d399", "#047857", "#02060a"],
  thinking:    ["#fbbf24", "#b45309", "#02060a"],
  speaking:    ["#60a5fa", "#1e40af", "#02060a"],
  interrupted: ["#f87171", "#991b1b", "#02060a"],
  error:       ["#ef4444", "#7f1d1d", "#02060a"],
};

export function VoiceOrb({ state, amplitude, size = 320 }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const ampRef = useRef(amplitude);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    ampRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;
    let smoothAmp = 0;
    let raf = 0;

    const draw = () => {
      const s = stateRef.current;
      const palette = PALETTES[s];
      const cx = size / 2;
      const cy = size / 2;
      const baseR = size * 0.22;

      // Smooth amplitude.
      smoothAmp = smoothAmp * 0.82 + ampRef.current * 0.18;

      ctx.clearRect(0, 0, size, size);

      // Outer halo.
      const haloR = baseR + 80 + smoothAmp * 70;
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, haloR);
      halo.addColorStop(0, hexA(palette[0], 0.55));
      halo.addColorStop(0.6, hexA(palette[1], 0.18));
      halo.addColorStop(1, hexA(palette[2], 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Spinning shimmer ring (more visible when "thinking").
      const ringIntensity =
        s === "thinking" ? 0.9 : s === "speaking" ? 0.45 : 0.25;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const r = baseR + 14 + i * 8 + Math.sin(t / 30 + i) * 4;
        ctx.strokeStyle = hexA(palette[0], ringIntensity * (1 - i * 0.25));
        ctx.beginPath();
        ctx.arc(cx, cy, r, (t / 60 + i) % (Math.PI * 2), Math.PI * 1.4);
        ctx.stroke();
      }

      // Wobbly orb edge driven by amplitude.
      const segments = 96;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2;
        const wobble =
          Math.sin(ang * 4 + t / 20) * 4 +
          Math.sin(ang * 7 - t / 30) * 2 +
          smoothAmp * 22 * Math.sin(ang * 3 + t / 12);
        const r = baseR + wobble;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Orb fill — radial.
      const fill = ctx.createRadialGradient(
        cx - baseR * 0.3,
        cy - baseR * 0.3,
        baseR * 0.1,
        cx,
        cy,
        baseR * 1.4,
      );
      fill.addColorStop(0, lighten(palette[0], 0.4));
      fill.addColorStop(0.5, palette[0]);
      fill.addColorStop(1, palette[1]);
      ctx.fillStyle = fill;
      ctx.fill();

      // Inner glossy highlight.
      ctx.beginPath();
      ctx.ellipse(
        cx - baseR * 0.3,
        cy - baseR * 0.45,
        baseR * 0.5,
        baseR * 0.22,
        -0.6,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();

      t++;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="select-none drop-shadow-[0_0_60px_rgba(45,212,191,0.25)]"
    />
  );
}

// ─── color helpers ──────────────────────────────────────────────────────────
function hexA(hex: string, a: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function lighten(hex: string, by: number): string {
  const c = hex.replace("#", "");
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) + Math.round(255 * by));
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) + Math.round(255 * by));
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) + Math.round(255 * by));
  return `rgb(${r},${g},${b})`;
}
