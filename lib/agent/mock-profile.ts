// Synthetic CRM profile for the Operator Copilot demo.
// Clearly mocked — no real PII.

import type { CustomerProfile, ComplianceState } from "./types";

export const DEMO_CUSTOMER: CustomerProfile = {
  customer_id: "C-2026-04857",
  full_name: "Aziz Karimov",
  age: 34,
  occupation: "Software engineer · IT-Park resident company",
  city: "Tashkent",
  district: "Yunusobod",
  monthly_income_uzs: 14_500_000,
  customer_since: "2019-03-15",
  credit_score: 720,
  existing_products: [
    "SQB Visa Classic (active since 2019)",
    "Sarmoya deposit · 8 M UZS · matures 2026-08",
    "SQB Mobile (last login: yesterday)",
  ],
  recent_activity: [
    "Used mortgage calculator on sqb.uz · 2 times in last 7 days",
    "Visited 'KAPITAL IPOTEKA' product page",
    "Did not complete online application",
  ],
  last_call: "2026-02-12 — interested in mortgage, said 'I'll think about it'",
  preferred_language: "uz",
};

export const INITIAL_COMPLIANCE: ComplianceState = {
  full_name_confirmed: false,
  callback_phone_verified: false,
  purpose_of_call_explained: false,
  source_of_income_asked: false,
  interest_rate_disclosed: false,
  no_guaranteed_promises: true,    // starts true; flipped if violation detected
  data_processing_consent: false,
  cooling_off_period_mentioned: false,
};
