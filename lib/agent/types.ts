// Types for the SQB Operator Copilot (Cluely-style real-time sales assistant).

export type Speaker = "agent" | "customer" | "system";

export interface Turn {
  id: string;
  speaker: Speaker;
  text: string;
  ts: number;
}

export type SalesStage =
  | "greeting"
  | "discovery"
  | "presentation"
  | "objection_handling"
  | "closing"
  | "kyc"
  | "wrap_up";

export type Objection =
  | "price_high"
  | "thinking"
  | "comparison"
  | "no_need"
  | "trust"
  | "wrong_time"
  | "other";

export type SentimentLabel = "negative" | "neutral" | "positive";

export interface ComplianceState {
  full_name_confirmed: boolean;
  callback_phone_verified: boolean;
  purpose_of_call_explained: boolean;
  source_of_income_asked: boolean;
  interest_rate_disclosed: boolean;
  no_guaranteed_promises: boolean;
  data_processing_consent: boolean;
  cooling_off_period_mentioned: boolean;
}

export const COMPLIANCE_LABELS: Record<keyof ComplianceState, string> = {
  full_name_confirmed:        "Customer's full name confirmed",
  callback_phone_verified:    "Callback phone verified",
  purpose_of_call_explained:  "Purpose of the call clearly explained",
  source_of_income_asked:     "Source of income asked",
  interest_rate_disclosed:    "Interest rate disclosed (annual %)",
  no_guaranteed_promises:     "No 'guaranteed profit' / illegal promises",
  data_processing_consent:    "Data-processing consent obtained",
  cooling_off_period_mentioned: "Cooling-off period / right to refuse",
};

export interface NextBestOffer {
  product: string;
  rationale: string;
  indicative_rate_pct?: number;
  indicative_amount_uzs?: number;
  monthly_payment_uzs?: number;
  confidence?: number;          // 0-1
}

export type EntityType =
  | "product"
  | "amount_uzs"
  | "rate_pct"
  | "duration"
  | "location"
  | "date"
  | "person"
  | "occupation"
  | "company"
  | "competitor";

export interface KeyEntity {
  type: EntityType;
  value: string;
}

export interface SuggestedQuestion {
  text: string;          // the question, in the customer's language
  reason: string;        // ≤15 words; why this question right now
}

export interface Analysis {
  // Conversation state
  stage: SalesStage;
  customer_intent: string;
  sentiment: number;            // -1..1
  sentiment_label: SentimentLabel;

  // Objection
  detected_objection: Objection | null;
  objection_response_suggestion?: string;
  alternative_objection_responses: string[];   // up to 3 approved phrasings

  // Recommendations
  next_best_offer: NextBestOffer | null;
  whisper_suggestion: string;
  suggested_questions: SuggestedQuestion[];    // up to 3

  // Compliance / safety
  compliance: ComplianceState;
  warnings: string[];

  // High-level metrics  (NEW)
  close_probability_pct: number;       // 0-100
  customer_health_score: number;       // 0-100
  ai_confidence: number;               // 0-1
  estimated_deal_value_uzs: number;    // 0 if no offer

  // Extracted entities for transcript chips
  key_entities: KeyEntity[];

  // Outcome
  call_outcome_so_far: string;
}

export interface CustomerProfile {
  customer_id: string;
  full_name: string;
  age: number;
  occupation: string;
  city: string;
  district: string;
  monthly_income_uzs: number;
  customer_since: string;
  credit_score: number;
  existing_products: string[];
  recent_activity: string[];
  last_call: string | null;
  preferred_language: "uz" | "ru" | "en";
}
