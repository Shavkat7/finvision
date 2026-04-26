// Types for Post-Call QA Review.
// Shared between the /api/agent/qa-review endpoint and the /agent/qa UI.

export type CallOutcome =
  | "sale_closed"
  | "appointment_scheduled"
  | "follow_up_needed"
  | "no_sale"
  | "complaint"
  | "unclear";

export type Severity = "low" | "medium" | "high";

export interface SentimentMoment {
  moment: string;          // brief label, e.g. "After rate disclosure"
  sentiment: number;       // -1..1
  note?: string;
}

export interface EthicsViolation {
  severity: Severity;
  type: string;            // e.g. "guaranteed_promise", "pressure_tactic"
  quote: string;           // exact agent quote
  explanation: string;
  regulation_violated?: string;
}

export interface CallStrength {
  type: string;            // e.g. "empathy", "clear_disclosure"
  quote: string;
  explanation: string;
}

export interface ComplianceFlags {
  full_name_confirmed: boolean;
  purpose_explained: boolean;
  rate_disclosed: boolean;
  consent_obtained: boolean;
  cooling_off_mentioned: boolean;
  no_guaranteed_promises: boolean;
}

export interface QualityScores {
  overall: number;             // 0-100 each
  empathy: number;
  script_adherence: number;
  objection_handling: number;
  compliance: number;
  closing: number;
}

export interface TranscriptLine {
  speaker: "agent" | "customer" | "system";
  text: string;
  timestamp?: string;          // "00:42" if known
}

export interface QAReview {
  summary: string;
  call_outcome: CallOutcome;
  duration_estimate_minutes: number;
  language_detected: "uz" | "ru" | "en" | "mixed";

  sentiment_arc: SentimentMoment[];
  ethics_violations: EthicsViolation[];
  strengths: CallStrength[];
  compliance: ComplianceFlags;
  coaching_recommendations: string[];
  scores: QualityScores;
  transcript: TranscriptLine[];
}
