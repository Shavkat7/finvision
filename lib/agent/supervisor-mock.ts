// Synthetic concurrent-call data for the supervisor dashboard.
// Plausible randomized variation across 6 ongoing calls.

import type { SalesStage } from "./types";

export interface ConcurrentCall {
  id: string;
  customer_name: string;
  customer_id: string;
  agent_name: string;
  product_in_discussion: string;
  stage: SalesStage;
  sentiment: number;          // -1..1
  compliance_done: number;    // 0..8
  close_prob_pct: number;     // 0..100
  duration_sec: number;
  health: number;             // 0..100
  warnings: number;
  language: "uz" | "ru" | "en";
}

const CUSTOMERS = [
  ["Aziz Karimov",        "C-2026-04857"],
  ["Madina Hasanova",     "C-2026-04901"],
  ["Bekzod Ergashev",     "C-2025-19880"],
  ["Diyora Saidova",      "C-2026-04714"],
  ["Otabek Mirzayev",     "C-2024-77231"],
  ["Sherzod Yusupov",     "C-2026-04912"],
];
const AGENTS = ["Murod T.", "Zilola K.", "Sardor R.", "Nigora M.", "Jasur F.", "Aziza B."];
const PRODUCTS = [
  "KAPITAL IPOTEKA",
  "Sarmoya deposit",
  "Visa Platinum + insurance",
  "Auto loan (Chevrolet)",
  "Yangi uyga ipoteka",
  "Biznesga ikkinchi qadam",
];
const STAGES: SalesStage[] = [
  "greeting", "discovery", "presentation",
  "objection_handling", "closing", "kyc",
];

export function buildInitialCalls(): ConcurrentCall[] {
  return CUSTOMERS.map((c, i) => {
    const stage = STAGES[i % STAGES.length];
    const compliance = 1 + Math.floor(Math.random() * 6);
    const sentiment = +(Math.random() * 1.4 - 0.4).toFixed(2);
    const closeProb = 25 + Math.floor(Math.random() * 60);
    return {
      id: `call-${i + 1}`,
      customer_name: c[0],
      customer_id: c[1],
      agent_name: AGENTS[i % AGENTS.length],
      product_in_discussion: PRODUCTS[i % PRODUCTS.length],
      stage,
      sentiment,
      compliance_done: compliance,
      close_prob_pct: closeProb,
      duration_sec: 30 + Math.floor(Math.random() * 540),
      health: 30 + Math.floor(Math.random() * 60),
      warnings: Math.random() > 0.85 ? 1 : 0,
      language: i % 3 === 1 ? "ru" : "uz",
    };
  });
}

// One step of plausible state evolution. Called every ~2 seconds.
export function tickCall(c: ConcurrentCall): ConcurrentCall {
  const nudge = (v: number, by: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v + by));

  const sentDelta = (Math.random() - 0.5) * 0.15;
  const closeDelta = Math.round((Math.random() - 0.4) * 4);
  const healthDelta = Math.round((Math.random() - 0.4) * 4);
  const advanceCompliance = Math.random() < 0.18 ? 1 : 0;
  const advanceStage = Math.random() < 0.06;

  const stageIdx = STAGES.indexOf(c.stage);
  const nextStage = advanceStage && stageIdx < STAGES.length - 1
    ? STAGES[stageIdx + 1]
    : c.stage;

  return {
    ...c,
    sentiment: +nudge(c.sentiment, sentDelta, -1, 1).toFixed(2),
    close_prob_pct: nudge(c.close_prob_pct, closeDelta, 5, 99),
    health: nudge(c.health, healthDelta, 5, 99),
    compliance_done: Math.min(8, c.compliance_done + advanceCompliance),
    duration_sec: c.duration_sec + 2,
    stage: nextStage,
    warnings: c.warnings + (Math.random() < 0.005 ? 1 : 0),
  };
}

export function summaryKpis(calls: ConcurrentCall[]) {
  const total = calls.length;
  const avgSentiment = calls.reduce((s, c) => s + c.sentiment, 0) / total;
  const avgCloseProb = calls.reduce((s, c) => s + c.close_prob_pct, 0) / total;
  const compliancePct =
    calls.reduce((s, c) => s + c.compliance_done, 0) / (total * 8) * 100;
  const totalWarnings = calls.reduce((s, c) => s + c.warnings, 0);
  return {
    active_calls: total,
    avg_sentiment: +avgSentiment.toFixed(2),
    avg_close_prob_pct: Math.round(avgCloseProb),
    avg_compliance_pct: Math.round(compliancePct),
    total_warnings: totalWarnings,
  };
}
