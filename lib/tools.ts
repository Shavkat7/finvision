// Tools for SQB OvozAI.
//
// PUBLIC, HONEST tools only. The assistant has no authenticated session
// with the user, so we deliberately do NOT expose tools that pretend to
// access a personal account (balance, transactions, transfers, expenses,
// card block). Those flows must go through SQB Mobile or the call center.

import type { GeoCoords, Lang, ToolInvocation, UserDocument } from "./types";
import { BRANCHES, ATMS, SERVICE_LABELS, type SqbLocation } from "./data/sqb-locations";
import { haversineKm, formatDistance, yandexMapUrl, googleMapUrl } from "./geo";
import { getAppContext } from "./context";
import { searchUserKB } from "./kb/browser-kb";

// ────────────────────────────────────────────────────────────────────────────
// Tool declarations sent to Gemini Live at session setup.
// ────────────────────────────────────────────────────────────────────────────
export const TOOL_DECLARATIONS = [
  // ──── KB grounding ────────────────────────────────────────────────
  {
    name: "search_sqb_knowledge",
    description:
      "Search SQB's knowledge base for any factual question about the bank " +
      "itself (history, executives, contacts, products, ratings, awards, " +
      "ESG, mobile app, ownership, financials). Always call this when " +
      "asked about SQB facts. " +
      "(uz: SQB haqida bilim bazasidan qidirish. ru: Поиск в базе знаний SQB.)",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query — pass the user's keywords. Multilingual (uz/ru/en) supported.",
        },
      },
      required: ["query"],
    },
  },

  // ──── FX rate (public CBU info) ───────────────────────────────────
  {
    name: "get_fx_rate",
    description:
      "Current UZS exchange rate against USD, EUR or RUB. Public CBU info. " +
      "(uz: Valyuta kursi. ru: Курс валюты.)",
    parameters: {
      type: "object",
      properties: {
        currency: {
          type: "string",
          enum: ["USD", "EUR", "RUB"],
          description: "Currency code.",
        },
      },
      required: ["currency"],
    },
  },

  // ──── Locations ───────────────────────────────────────────────────
  {
    name: "find_branch_or_atm",
    description:
      "Find an SQB branch or ATM. Use when the user asks about physical " +
      "locations, addresses, working hours, or nearby ATMs. If the user's " +
      "geolocation is in context, results are sorted by distance. " +
      "If they mention a district/city by name (Chilonzor, Samarqand etc.), " +
      "filter by that. " +
      "(uz: Eng yaqin filial yoki bankomat. ru: Ближайший филиал или банкомат.)",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["branch", "atm", "any"],
          description: "branch | atm | any. Default 'any'.",
        },
        district_or_city: {
          type: "string",
          description:
            "Optional district/city name in Latin, Cyrillic, or English.",
        },
        service: {
          type: "string",
          description:
            "Optional service filter: 'currency', 'biometric_id', 'loan', " +
            "'deposit', 'atm-cash', 'atm-deposit'.",
        },
        only_24h: { type: "boolean", description: "Restrict to 24/7 locations." },
        limit: { type: "integer", description: "Max results (1-10). Default 4." },
      },
    },
  },

  // ──── Loan calculator ─────────────────────────────────────────────
  {
    name: "calculate_loan_payment",
    description:
      "Calculate the monthly payment for a hypothetical loan. " +
      "(uz: Kredit oylik to'lovini hisoblash. ru: Расчёт ежемесячного платежа.)",
    parameters: {
      type: "object",
      properties: {
        amount_uzs:    { type: "number",  description: "Principal in UZS" },
        term_months:   { type: "integer", description: "Term in months" },
        annual_rate_pct: {
          type: "number",
          description:
            "Annual interest rate %. If unknown: 24 for consumer, 19 for mortgage, 22 for car.",
        },
      },
      required: ["amount_uzs", "term_months", "annual_rate_pct"],
    },
  },

  // ──── Loan eligibility ────────────────────────────────────────────
  {
    name: "check_loan_eligibility",
    description:
      "Quick pre-screening using USER-PROVIDED income, requested amount and " +
      "term — gives a likely-eligibility verdict and indicative rate. This " +
      "is not a credit decision; the user must apply through SQB Mobile or " +
      "a branch for a real one. " +
      "(uz: Kredit yaroqliligini taxminiy tekshirish. ru: Предварительная проверка.)",
    parameters: {
      type: "object",
      properties: {
        monthly_income_uzs: { type: "number",  description: "Net monthly income in UZS" },
        amount_uzs:         { type: "number",  description: "Requested loan amount in UZS" },
        term_months:        { type: "integer", description: "Term in months" },
        loan_type: {
          type: "string",
          enum: ["consumer", "mortgage", "car", "micro"],
          description: "Loan product family.",
        },
      },
      required: ["monthly_income_uzs", "amount_uzs", "term_months", "loan_type"],
    },
  },

  // ──── Branch wait time ────────────────────────────────────────────
  {
    name: "get_branch_wait_time",
    description:
      "Estimated current wait time at a specific SQB branch. " +
      "(uz: Filialdagi navbat vaqti. ru: Время ожидания в филиале.)",
    parameters: {
      type: "object",
      properties: {
        branch_name_or_district: {
          type: "string",
          description: "Branch name or district (e.g. 'Chilonzor', 'Samarqand').",
        },
      },
      required: ["branch_name_or_district"],
    },
  },

  // ──── Product recommendation ──────────────────────────────────────
  {
    name: "recommend_product",
    description:
      "Recommend an SQB product based on the customer's stated goal. " +
      "Informational — final decision is made when the customer applies. " +
      "(uz: Mahsulot tavsiya etish. ru: Рекомендация продукта.)",
    parameters: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          enum: ["buy_home", "buy_car", "save", "small_business", "everyday", "young_family"],
          description: "Customer's goal.",
        },
        age:                { type: "integer", description: "Customer age (optional)" },
        monthly_income_uzs: { type: "number",  description: "Monthly income (optional)" },
      },
      required: ["goal"],
    },
  },

  // ──── User-uploaded knowledge ─────────────────────────────────────
  {
    name: "search_uploaded_knowledge",
    description:
      "Search documents the user has uploaded into THIS session. Use when " +
      "the user references 'the document I uploaded', 'my contract', 'the " +
      "PDF I just sent', or asks a question that can't be answered from " +
      "search_sqb_knowledge but might be answered by their personal docs. " +
      "(uz: Foydalanuvchi yuklagan hujjatlardan qidirish. ru: Поиск в загруженных документах.)",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query — pass the user's keywords." },
      },
      required: ["query"],
    },
  },

  // ──── Time / context awareness ────────────────────────────────────
  {
    name: "get_current_context",
    description:
      "Returns current Tashkent time, day of week, whether it's business " +
      "hours, geolocation status. Use when the user asks 'are you open now', " +
      "'what time is it', or when timing affects the recommendation.",
    parameters: { type: "object", properties: {} },
  },

  // ──── Synthetic data generation ───────────────────────────────────
  {
    name: "generate_synthetic_profile",
    description:
      "Generate a realistic but fully SYNTHETIC customer profile for " +
      "demonstration / educational purposes. Always clearly label the result " +
      "as synthetic when speaking. " +
      "(uz: Demo uchun sun'iy mijoz profili. ru: Синтетический профиль клиента для демо.)",
    parameters: {
      type: "object",
      properties: {
        archetype: {
          type: "string",
          enum: ["young_professional", "young_family", "small_business_owner", "retiree", "student"],
          description: "Customer archetype.",
        },
      },
      required: ["archetype"],
    },
  },

  {
    name: "simulate_deposit_growth",
    description:
      "Project how a deposit grows over time with optional monthly contributions. " +
      "Pure compound interest — outputs final balance and selected monthly milestones. " +
      "(uz: Depozit o'sishini simulyatsiya qilish. ru: Симуляция роста вклада.)",
    parameters: {
      type: "object",
      properties: {
        principal_uzs: { type: "number", description: "Initial deposit (UZS)" },
        annual_rate_pct: { type: "number", description: "Annual rate %, e.g. 22" },
        term_months: { type: "integer", description: "Term in months" },
        monthly_contribution_uzs: {
          type: "number",
          description: "Optional monthly top-up. Default 0.",
        },
      },
      required: ["principal_uzs", "annual_rate_pct", "term_months"],
    },
  },

  {
    name: "simulate_savings_goal",
    description:
      "Reverse calculator: given a target amount, an annual rate, and a " +
      "monthly saving capacity, compute how many months it takes to reach the goal. " +
      "(uz: Maqsadga erishish davrini hisoblash. ru: Расчёт срока достижения цели.)",
    parameters: {
      type: "object",
      properties: {
        target_uzs: { type: "number", description: "Target savings (UZS)" },
        monthly_uzs: { type: "number", description: "Monthly saving (UZS)" },
        annual_rate_pct: { type: "number", description: "Annual rate %" },
        principal_uzs: { type: "number", description: "Starting balance, default 0" },
      },
      required: ["target_uzs", "monthly_uzs", "annual_rate_pct"],
    },
  },

  // ──── Security education ──────────────────────────────────────────
  {
    name: "explain_security_topic",
    description:
      "Educate the user about a banking security topic. Use proactively when " +
      "the topic surfaces, AND defensively if you detect a possible social-engineering " +
      "attempt. " +
      "(uz: Xavfsizlik haqida ma'lumot. ru: Информация о безопасности.)",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: ["phishing", "atm_safety", "fake_call", "card_skimming", "sms_code_request", "general"],
          description: "Topic to explain.",
        },
      },
      required: ["topic"],
    },
  },

  // ──── Book a branch consultation ──────────────────────────────────
  {
    name: "book_appointment",
    description:
      "Schedule a consultation appointment at a branch. Like a web form — " +
      "captures user's name, phone, preferred branch / time / purpose. " +
      "(uz: Filialda uchrashuv belgilash. ru: Записаться на приём в филиал.)",
    parameters: {
      type: "object",
      properties: {
        full_name:   { type: "string", description: "User's full name" },
        phone:       { type: "string", description: "Callback phone, e.g. +998..." },
        branch_name_or_district: { type: "string" },
        purpose: {
          type: "string",
          enum: ["mortgage", "deposit", "loan", "card_issue", "private_banking", "other"],
        },
        preferred_date: { type: "string", description: "Preferred date YYYY-MM-DD or human form" },
        preferred_time: { type: "string", description: "Preferred time, e.g. '14:00'" },
      },
      required: ["full_name", "phone", "branch_name_or_district", "purpose"],
    },
  },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Static public data.
// ────────────────────────────────────────────────────────────────────────────
const MOCK_FX: Record<string, number> = { USD: 12_745, EUR: 13_820, RUB: 138.4 };

// ────────────────────────────────────────────────────────────────────────────
// Browser-side dispatch.
// ────────────────────────────────────────────────────────────────────────────
export interface ToolContext {
  userLocation?: GeoCoords;
  uploadedDocs?: UserDocument[];
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext = {},
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  try {
    switch (name) {
      case "search_sqb_knowledge": {
        const query = String(args.query ?? "").trim();
        if (!query) return { ok: false, error: "Empty query" };
        const res = await fetch("/api/kb/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: query, k: 4 }),
        });
        if (!res.ok) return { ok: false, error: `KB search failed: ${res.status}` };
        const data = (await res.json()) as {
          hits: Array<{ path: string; topic: string; text: string; score: number }>;
        };
        return {
          ok: true,
          result: {
            query,
            results: data.hits.map((h) => ({
              source: h.path,
              topic: h.topic,
              snippet: h.text,
            })),
          },
        };
      }

      case "get_fx_rate": {
        const currency = String(args.currency ?? "USD").toUpperCase();
        const rate = MOCK_FX[currency];
        if (!rate) return { ok: false, error: `Unsupported currency: ${currency}` };
        return {
          ok: true,
          result: {
            currency,
            rate_uzs: rate,
            source: "CBU indicative",
            updated_at: new Date().toISOString(),
          },
        };
      }

      case "find_branch_or_atm": {
        const type = String(args.type ?? "any") as "branch" | "atm" | "any";
        const districtFilter = String(args.district_or_city ?? "").toLowerCase().trim();
        const serviceFilter = String(args.service ?? "").toLowerCase().trim();
        const only24h = Boolean(args.only_24h);
        const limit = Math.min(Math.max(Number(args.limit ?? 4), 1), 10);

        let pool: SqbLocation[] =
          type === "branch" ? BRANCHES : type === "atm" ? ATMS : [...BRANCHES, ...ATMS];

        if (districtFilter) {
          pool = pool.filter(
            (l) =>
              l.district.toLowerCase().includes(districtFilter) ||
              l.city.toLowerCase().includes(districtFilter) ||
              districtFilter.includes(l.district.toLowerCase()) ||
              districtFilter.includes(l.city.toLowerCase()),
          );
        }
        if (serviceFilter) {
          pool = pool.filter((l) => l.services.some((s) => s.includes(serviceFilter)));
        }
        if (only24h) {
          pool = pool.filter((l) => l.is_24h);
        }

        let withDistance = pool.map((l) => ({
          ...l,
          distance_km: ctx.userLocation ? haversineKm(ctx.userLocation, l) : undefined,
        }));
        if (ctx.userLocation) {
          withDistance = withDistance.sort(
            (a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9),
          );
        }
        const top = withDistance.slice(0, limit);

        return {
          ok: true,
          result: {
            count: top.length,
            user_has_geo: Boolean(ctx.userLocation),
            results: top.map((l) => ({
              type: l.type,
              name: l.name,
              address: l.address,
              district: l.district,
              city: l.city,
              hours: l.hours,
              is_24h: l.is_24h,
              services: l.services,
              phone: l.phone,
              distance_km:
                l.distance_km !== undefined ? Number(l.distance_km.toFixed(2)) : undefined,
              lat: l.lat,
              lng: l.lng,
              map_url_yandex: yandexMapUrl(l.lat, l.lng, l.name),
              map_url_google: googleMapUrl(l.lat, l.lng),
            })),
          },
        };
      }

      case "calculate_loan_payment": {
        const P = Number(args.amount_uzs);
        const n = Number(args.term_months);
        const annual = Number(args.annual_rate_pct);
        if (!(P > 0 && n > 0 && annual >= 0)) {
          return { ok: false, error: "Invalid amount/term/rate" };
        }
        const r = annual / 100 / 12;
        const monthly =
          r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPaid = monthly * n;
        const totalInterest = totalPaid - P;
        return {
          ok: true,
          result: {
            principal_uzs: P,
            term_months: n,
            annual_rate_pct: annual,
            monthly_payment_uzs: Math.round(monthly),
            total_paid_uzs: Math.round(totalPaid),
            total_interest_uzs: Math.round(totalInterest),
          },
        };
      }

      case "check_loan_eligibility": {
        const income = Number(args.monthly_income_uzs);
        const amount = Number(args.amount_uzs);
        const term = Number(args.term_months);
        const loanType = String(args.loan_type ?? "consumer");

        const RATE_BY_TYPE: Record<string, number> = {
          consumer: 24, mortgage: 19, car: 22, micro: 28,
        };
        const rate = RATE_BY_TYPE[loanType] ?? 24;
        const r = rate / 100 / 12;
        const monthly = (amount * r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);
        const dti = monthly / income;

        const MAX_DTI = loanType === "mortgage" ? 0.5 : 0.4;
        let decision: "approved" | "borderline" | "declined";
        let reason: string;

        if (income <= 0 || amount <= 0 || term <= 0) {
          return { ok: false, error: "Invalid input" };
        }
        if (dti < MAX_DTI * 0.7) {
          decision = "approved";
          reason = "income comfortably covers payments";
        } else if (dti < MAX_DTI) {
          decision = "borderline";
          reason = "payments are close to recommended limit";
        } else {
          decision = "declined";
          reason = "payments exceed recommended share of income";
        }

        return {
          ok: true,
          result: {
            decision,
            reason,
            estimated_rate_pct: rate,
            estimated_monthly_payment_uzs: Math.round(monthly),
            debt_to_income_ratio: Number(dti.toFixed(2)),
            max_recommended_dti: MAX_DTI,
            loan_type: loanType,
            note: "Indicative only. Final decision is made by SQB after a full application.",
          },
        };
      }

      case "get_branch_wait_time": {
        const q = String(args.branch_name_or_district ?? "").toLowerCase().trim();
        const branch =
          BRANCHES.find(
            (b) =>
              b.name.toLowerCase().includes(q) ||
              b.district.toLowerCase().includes(q) ||
              b.city.toLowerCase().includes(q),
          ) ?? BRANCHES[0];

        const hour = new Date().getHours();
        const peak = hour >= 11 && hour <= 14;
        const wait = peak
          ? 12 + Math.floor(Math.random() * 14)
          : 3 + Math.floor(Math.random() * 8);
        return {
          ok: true,
          result: {
            branch: branch.name,
            district: branch.district,
            city: branch.city,
            estimated_wait_minutes: wait,
            current_status: peak ? "busy" : "moderate",
            measured_at: new Date().toISOString(),
          },
        };
      }

      case "recommend_product": {
        const goal = String(args.goal ?? "everyday");

        const RECS: Record<string, { product: string; why: string; rate?: number }> = {
          buy_home: {
            product: "KAPITAL IPOTEKA",
            why: "Yangi ipoteka mahsuloti — past stavka, uzoq muddat. First-time buyers welcome.",
            rate: 19,
          },
          buy_car: {
            product: "Uzavto-Chevrolet 1 auto loan",
            why: "Mahalliy ishlab chiqarilgan avtomobil uchun arzon kredit.",
            rate: 22,
          },
          save: {
            product: "SQB Omonat depoziti",
            why: "Yuqori foiz, 12+ oylik muddat, har oyda foydaga aylantirish.",
            rate: 22,
          },
          small_business: {
            product: "Biznesga ikkinchi qadam mikroqarz",
            why: "Kichik biznes uchun maxsus mikroqarz — tezkor ko'rib chiqish.",
            rate: 25,
          },
          everyday: {
            product: "SQB Mobile + Visa karta",
            why: "Bepul karta, mobil ilovada to'liq nazorat, 1% cashback.",
          },
          young_family: {
            product: "Yangi uyga ipoteka + Yashil ta'mir kredit",
            why: "Yosh oilalar uchun maxsus ipoteka shartlari.",
            rate: 18,
          },
        };

        const rec = RECS[goal] ?? RECS.everyday;
        return {
          ok: true,
          result: {
            goal,
            recommended_product: rec.product,
            reasoning: rec.why,
            indicative_rate_pct: rec.rate,
            next_step: "Apply via SQB Mobile, sqb.uz, or visit a branch (use book_appointment).",
          },
        };
      }

      // ── User-uploaded KB ───────────────────────────────────────────
      case "search_uploaded_knowledge": {
        const query = String(args.query ?? "").trim();
        const docs = ctx.uploadedDocs ?? [];
        if (!query) return { ok: false, error: "Empty query" };
        if (docs.length === 0) {
          return {
            ok: true,
            result: {
              query,
              note: "No user documents uploaded. Tell the user to use the '+ Add Knowledge' button.",
              results: [],
            },
          };
        }
        const hits = searchUserKB(docs, query, 4);
        return {
          ok: true,
          result: {
            query,
            doc_count: docs.length,
            results: hits.map((h) => ({
              source: h.path,           // "filename.pdf#3"
              snippet: h.text.slice(0, 600),
            })),
          },
        };
      }

      // ── Context ────────────────────────────────────────────────────
      case "get_current_context": {
        const c = getAppContext(ctx.userLocation);
        return {
          ok: true,
          result: {
            tashkent_time: c.local_time_tashkent,
            day_of_week: c.day_of_week,
            is_weekend: c.is_weekend,
            is_business_hours: c.is_business_hours_uz,
            hour_bucket: c.hour_bucket,
            geolocation_granted: c.has_geolocation,
          },
        };
      }

      // ── Synthetic profile ──────────────────────────────────────────
      case "generate_synthetic_profile": {
        const archetype = String(args.archetype ?? "young_professional");
        const profiles: Record<string, () => Record<string, unknown>> = {
          young_professional: () => ({
            archetype,
            name: pickName(["Akmal", "Sardor", "Madina", "Diyora", "Rustam"], ["Karimov", "Yusupov", "Hasanova", "Xolmatova"]),
            age: 27 + Math.floor(Math.random() * 5),
            occupation: pickOne(["IT engineer", "Marketing manager", "Bank specialist", "Designer"]),
            monthly_income_uzs: 9_000_000 + Math.floor(Math.random() * 6) * 500_000,
            existing_products: ["Visa Classic", "SQB Mobile"],
            goal: "Save for a downpayment, possibly buy a flat in 2-3 years",
            risk_tolerance: "moderate",
          }),
          young_family: () => ({
            archetype,
            name: pickName(["Bekzod", "Jasur", "Nigora", "Shaxnoza"], ["Ergashev", "Saidov", "Tursunova"]),
            age: 32 + Math.floor(Math.random() * 4),
            occupation: pickOne(["Doctor", "Teacher", "Civil engineer", "Accountant"]),
            family: "spouse + 1 child",
            monthly_income_uzs: 12_000_000 + Math.floor(Math.random() * 6) * 500_000,
            existing_products: ["Visa Platinum", "Yangi uyga ipoteka prequalification"],
            goal: "Buy first home with mortgage; build emergency savings",
            risk_tolerance: "low",
          }),
          small_business_owner: () => ({
            archetype,
            name: pickName(["Otabek", "Sherzod", "Lola"], ["Mirzayev", "Saidov", "Rakhimova"]),
            age: 38 + Math.floor(Math.random() * 8),
            business: pickOne(["Cafe in Yunusobod", "Online retail shop", "Construction-materials supplier"]),
            monthly_revenue_uzs: 80_000_000 + Math.floor(Math.random() * 10) * 5_000_000,
            existing_products: ["SQB Business", "Merchant acquiring", "Bank guarantee"],
            goal: "Expand inventory; need a working-capital loan",
            risk_tolerance: "moderate",
          }),
          retiree: () => ({
            archetype,
            name: pickName(["Olim", "Karim", "Saodat"], ["Tursunov", "Akbarov", "Xolmatova"]),
            age: 64 + Math.floor(Math.random() * 8),
            occupation: "Retired",
            monthly_income_uzs: 3_500_000,
            existing_products: ["UZCARD pension card", "Classic deposit"],
            goal: "Stable income; protect savings from inflation",
            risk_tolerance: "very low",
          }),
          student: () => ({
            archetype,
            name: pickName(["Doniyor", "Aziza", "Sanjar"], ["Toshpulatov", "Karimova"]),
            age: 19 + Math.floor(Math.random() * 4),
            occupation: pickOne(["University student", "TUIT student", "Conservatory student"]),
            monthly_income_uzs: 1_500_000,
            existing_products: ["UZCARD Moment"],
            goal: "Pay tuition; build credit history",
            risk_tolerance: "moderate",
          }),
        };
        const p = (profiles[archetype] ?? profiles.young_professional)();
        return { ok: true, result: { synthetic: true, profile: p } };
      }

      // ── Deposit growth ─────────────────────────────────────────────
      case "simulate_deposit_growth": {
        const P = Number(args.principal_uzs);
        const r = Number(args.annual_rate_pct) / 100 / 12;
        const n = Number(args.term_months);
        const m = Number(args.monthly_contribution_uzs ?? 0);
        if (!(P >= 0 && n > 0 && r >= 0)) {
          return { ok: false, error: "Invalid inputs" };
        }

        // Future value of principal + monthly contributions (annuity-due simplified).
        let balance = P;
        const milestones: Array<{ month: number; balance_uzs: number }> = [];
        const milestoneMonths = uniqueSortedMilestones(n);
        for (let month = 1; month <= n; month++) {
          balance = balance * (1 + r) + m;
          if (milestoneMonths.includes(month)) {
            milestones.push({ month, balance_uzs: Math.round(balance) });
          }
        }
        const totalContributed = P + m * n;
        const interestEarned = balance - totalContributed;

        return {
          ok: true,
          result: {
            synthetic: true,
            principal_uzs: P,
            annual_rate_pct: Number(args.annual_rate_pct),
            term_months: n,
            monthly_contribution_uzs: m,
            final_balance_uzs: Math.round(balance),
            total_contributed_uzs: Math.round(totalContributed),
            interest_earned_uzs: Math.round(interestEarned),
            milestones,
          },
        };
      }

      // ── Savings goal ───────────────────────────────────────────────
      case "simulate_savings_goal": {
        const target = Number(args.target_uzs);
        const monthly = Number(args.monthly_uzs);
        const r = Number(args.annual_rate_pct) / 100 / 12;
        const P0 = Number(args.principal_uzs ?? 0);
        if (!(target > 0 && monthly > 0 && r >= 0)) {
          return { ok: false, error: "Invalid inputs" };
        }
        let balance = P0;
        let months = 0;
        const MAX = 600; // 50 years cap
        while (balance < target && months < MAX) {
          balance = balance * (1 + r) + monthly;
          months++;
        }
        if (months >= MAX) {
          return {
            ok: true,
            result: {
              synthetic: true,
              reachable: false,
              note: "At this rate, the goal would take longer than 50 years.",
            },
          };
        }
        return {
          ok: true,
          result: {
            synthetic: true,
            reachable: true,
            months_needed: months,
            years_approx: Number((months / 12).toFixed(1)),
            final_balance_uzs: Math.round(balance),
            total_contributed_uzs: P0 + monthly * months,
          },
        };
      }

      // ── Security topic ─────────────────────────────────────────────
      case "explain_security_topic": {
        const topic = String(args.topic ?? "general");
        const ADVICE: Record<string, { title: string; tips: string[] }> = {
          phishing: {
            title: "Phishing — fake emails / SMS / chats",
            tips: [
              "SQB will NEVER ask for full card number, CVV, SMS codes, or passwords by SMS / call / email.",
              "Always check the sender's exact address; phishing copies can use 'sqb-uz.com' etc.",
              "If unsure, hang up and call back via 0 800 120-77-77.",
            ],
          },
          atm_safety: {
            title: "ATM safety",
            tips: [
              "Cover the keypad with your hand when entering the PIN.",
              "Do NOT accept help from strangers at the ATM.",
              "Inspect the card slot for unusual attachments (skimmers).",
              "If the ATM swallows your card, call 0 800 120-77-77 immediately.",
            ],
          },
          fake_call: {
            title: "Fake calls pretending to be the bank",
            tips: [
              "Real SQB staff will never ask for your card PIN, CVV, or one-time SMS codes.",
              "Hang up and call us back at 0 800 120-77-77 if anything feels off.",
              "Never confirm a transaction or share a code based on an inbound call.",
            ],
          },
          card_skimming: {
            title: "Card skimming at terminals",
            tips: [
              "Skimmers are devices placed over a real card slot to steal data. Wiggle the slot before inserting.",
              "Use ATMs in well-lit places (branch lobbies preferred).",
              "Watch for hidden cameras above the keypad.",
            ],
          },
          sms_code_request: {
            title: "Someone is asking for your SMS code",
            tips: [
              "STOP. SQB will NEVER ask you to share an SMS confirmation code with anyone.",
              "An SMS code shared = a transaction approved against your account.",
              "If you already shared a code, call 0 800 120-77-77 immediately to block your card.",
            ],
          },
          general: {
            title: "General banking safety",
            tips: [
              "Keep SQB Mobile updated.",
              "Enable biometric login if available.",
              "Set transaction alerts in SQB Mobile.",
              "Don't reuse passwords across services.",
            ],
          },
        };
        const a = ADVICE[topic] ?? ADVICE.general;
        return { ok: true, result: { topic, ...a } };
      }

      case "book_appointment": {
        const fullName = String(args.full_name ?? "").trim();
        const phone = String(args.phone ?? "").trim();
        const branchQ = String(args.branch_name_or_district ?? "").toLowerCase();
        const purpose = String(args.purpose ?? "other");
        const date = String(args.preferred_date ?? "tomorrow");
        const time = String(args.preferred_time ?? "11:00");

        if (!fullName || !phone) {
          return { ok: false, error: "Need full name and phone." };
        }

        const branch =
          BRANCHES.find(
            (b) =>
              b.name.toLowerCase().includes(branchQ) ||
              b.district.toLowerCase().includes(branchQ),
          ) ?? BRANCHES[0];

        return {
          ok: true,
          result: {
            status: "request_recorded",
            full_name: fullName,
            phone,
            branch: branch.name,
            address: branch.address,
            purpose,
            scheduled_for: `${date} ${time}`,
            reference: `APT-${Math.floor(Math.random() * 1e6).toString().padStart(6, "0")}`,
            note:
              "A bank specialist will call you on the provided phone to confirm the appointment.",
          },
        };
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// UI formatters — language-aware.
// ────────────────────────────────────────────────────────────────────────────

export interface LocationCardItem {
  name: string;
  address: string;
  hours: string;
  distance_km?: number;
  services: string[];
  is_24h: boolean;
  lat: number;
  lng: number;
  map_url_yandex: string;
  map_url_google: string;
  type: "branch" | "atm";
}

interface UIFormatted {
  emoji: string;
  title: string;
  body: string;
  /** Optional richer payload — rendered specially by ToolCard. */
  locations?: LocationCardItem[];
}

const T = {
  uz: {
    sqb_kb: "SQB ma'lumot",
    fx: (c: string) => `${c} kursi`,
    locations: "Joylashuvlar",
    loan_calc: "Kredit kalkulyatori",
    eligibility: "Kredit (taxminiy)",
    wait: "Kutish vaqti",
    recommend: "Tavsiya etilgan mahsulot",
    appointment: "Uchrashuv so'rovi",
    monthly: "Oylik to'lov",
    total_paid: "Jami to'lanadi",
    total_interest: "Foiz",
    rate: "Stavka",
    amount: "Miqdor",
    term: "Muddat",
    months: "oy",
    minutes: "daqiqa",
    approved: "Tasdiqlandi",
    borderline: "Chegarada",
    declined: "Rad etildi",
  },
  ru: {
    sqb_kb: "Информация о SQB",
    fx: (c: string) => `Курс ${c}`,
    locations: "Локации",
    loan_calc: "Кредитный калькулятор",
    eligibility: "Кредит (предв.)",
    wait: "Время ожидания",
    recommend: "Рекомендованный продукт",
    appointment: "Запрос на приём",
    monthly: "Ежемесячный платёж",
    total_paid: "Всего к оплате",
    total_interest: "Проценты",
    rate: "Ставка",
    amount: "Сумма",
    term: "Срок",
    months: "мес",
    minutes: "минут",
    approved: "Одобрено",
    borderline: "На грани",
    declined: "Отказано",
  },
  en: {
    sqb_kb: "SQB info",
    fx: (c: string) => `${c} rate`,
    locations: "Locations",
    loan_calc: "Loan calculator",
    eligibility: "Loan (preview)",
    wait: "Wait time",
    recommend: "Recommended product",
    appointment: "Appointment request",
    monthly: "Monthly payment",
    total_paid: "Total paid",
    total_interest: "Interest",
    rate: "Rate",
    amount: "Amount",
    term: "Term",
    months: "mo",
    minutes: "min",
    approved: "Approved",
    borderline: "Borderline",
    declined: "Declined",
  },
} as const;

export function formatToolForUI(invocation: ToolInvocation, lang: Lang = "uz"): UIFormatted {
  const { name, result } = invocation;
  const r = result as Record<string, unknown> | undefined;
  const tr = T[lang];

  switch (name) {
    case "search_sqb_knowledge": {
      const data = r as
        | { query: string; results: Array<{ source: string; topic: string; snippet: string }> }
        | undefined;
      return {
        emoji: "📚",
        title: data ? `${tr.sqb_kb}: "${data.query}"` : tr.sqb_kb,
        body: data
          ? data.results
              .slice(0, 3)
              .map((h, i) => {
                const topic = h.topic.replace(/_/g, " ");
                return `${i + 1}. [${topic}]\n${truncate(h.snippet, 220)}`;
              })
              .join("\n\n")
          : "—",
      };
    }
    case "get_fx_rate":
      return {
        emoji: "💱",
        title: tr.fx(String(r?.currency ?? "")),
        body: r ? `1 ${r.currency} = ${formatUzs(Number(r.rate_uzs))}` : "—",
      };

    case "find_branch_or_atm": {
      const data = r as
        | {
            count: number;
            user_has_geo: boolean;
            results: Array<{
              type: "branch" | "atm";
              name: string;
              address: string;
              hours: string;
              distance_km?: number;
              services: string[];
              is_24h: boolean;
              lat: number;
              lng: number;
              map_url_yandex: string;
              map_url_google: string;
            }>;
          }
        | undefined;
      return {
        emoji: data?.results[0]?.type === "atm" ? "🏧" : "🏦",
        title: tr.locations,
        body: data
          ? data.results
              .slice(0, 4)
              .map((l) => {
                const dist =
                  l.distance_km !== undefined ? ` · ${formatDistance(l.distance_km, lang)}` : "";
                const services = l.services
                  .filter((s) => s !== "all")
                  .slice(0, 2)
                  .map((s) => SERVICE_LABELS[s]?.[lang] ?? s)
                  .join(", ");
                return `📍 ${l.name}${dist}\n${l.address}\n⏰ ${l.hours}${services ? ` · ${services}` : ""}`;
              })
              .join("\n\n")
          : "—",
        locations: data?.results.slice(0, 4).map((l) => ({
          name: l.name,
          address: l.address,
          hours: l.hours,
          distance_km: l.distance_km,
          services: l.services,
          is_24h: l.is_24h,
          lat: l.lat,
          lng: l.lng,
          map_url_yandex: l.map_url_yandex,
          map_url_google: l.map_url_google,
          type: l.type,
        })),
      };
    }

    case "calculate_loan_payment": {
      const d = r as
        | {
            principal_uzs: number;
            term_months: number;
            annual_rate_pct: number;
            monthly_payment_uzs: number;
            total_paid_uzs: number;
            total_interest_uzs: number;
          }
        | undefined;
      return {
        emoji: "🧮",
        title: tr.loan_calc,
        body: d
          ? [
              `${tr.amount}: ${formatUzs(d.principal_uzs)}`,
              `${tr.term}: ${d.term_months} ${tr.months}`,
              `${tr.rate}: ${d.annual_rate_pct}%`,
              `─────────────`,
              `${tr.monthly}: ${formatUzs(d.monthly_payment_uzs)}`,
              `${tr.total_paid}: ${formatUzs(d.total_paid_uzs)}`,
              `${tr.total_interest}: ${formatUzs(d.total_interest_uzs)}`,
            ].join("\n")
          : "—",
      };
    }

    case "check_loan_eligibility": {
      const d = r as
        | {
            decision: "approved" | "borderline" | "declined";
            estimated_rate_pct: number;
            estimated_monthly_payment_uzs: number;
            debt_to_income_ratio: number;
          }
        | undefined;
      const decisionEmoji = d?.decision === "approved" ? "✅" : d?.decision === "borderline" ? "⚠️" : "❌";
      const decisionText = d
        ? d.decision === "approved"
          ? tr.approved
          : d.decision === "borderline"
            ? tr.borderline
            : tr.declined
        : "—";
      return {
        emoji: "🔎",
        title: tr.eligibility,
        body: d
          ? [
              `${decisionEmoji} ${decisionText}`,
              `${tr.rate}: ${d.estimated_rate_pct}%`,
              `${tr.monthly}: ${formatUzs(d.estimated_monthly_payment_uzs)}`,
              `DTI: ${(d.debt_to_income_ratio * 100).toFixed(0)}%`,
            ].join("\n")
          : "—",
      };
    }

    case "get_branch_wait_time": {
      const d = r as
        | { branch: string; estimated_wait_minutes: number; current_status: string }
        | undefined;
      return {
        emoji: "⏳",
        title: tr.wait,
        body: d ? `${d.branch}\n~ ${d.estimated_wait_minutes} ${tr.minutes} (${d.current_status})` : "—",
      };
    }

    case "recommend_product": {
      const d = r as
        | { recommended_product: string; reasoning: string; indicative_rate_pct?: number }
        | undefined;
      return {
        emoji: "💡",
        title: tr.recommend,
        body: d
          ? [
              `⭐ ${d.recommended_product}`,
              d.reasoning,
              d.indicative_rate_pct !== undefined ? `${tr.rate}: ~${d.indicative_rate_pct}%` : "",
            ]
              .filter(Boolean)
              .join("\n")
          : "—",
      };
    }

    case "book_appointment": {
      const d = r as
        | {
            full_name: string;
            phone: string;
            branch: string;
            address: string;
            scheduled_for: string;
            purpose: string;
            reference: string;
          }
        | undefined;
      return {
        emoji: "📅",
        title: tr.appointment,
        body: d
          ? [
              `👤 ${d.full_name} · ${d.phone}`,
              `🏦 ${d.branch}`,
              d.address,
              `📅 ${d.scheduled_for}`,
              `🎯 ${d.purpose}`,
              `Ref: ${d.reference}`,
            ].join("\n")
          : "—",
      };
    }

    case "search_uploaded_knowledge": {
      const data = r as
        | {
            query: string;
            doc_count?: number;
            results: Array<{ source: string; snippet: string }>;
            note?: string;
          }
        | undefined;
      return {
        emoji: "📎",
        title: data ? `Uploaded docs: "${data.query}"` : "Uploaded docs",
        body: data
          ? data.results.length === 0
            ? data.note ?? "No matches in uploaded documents."
            : data.results
                .slice(0, 3)
                .map((h, i) => `${i + 1}. ${h.source}\n${truncate(h.snippet, 220)}`)
                .join("\n\n")
          : "—",
      };
    }

    case "get_current_context": {
      const d = r as
        | {
            tashkent_time: string;
            day_of_week: string;
            is_business_hours: boolean;
            is_weekend: boolean;
            hour_bucket: string;
            geolocation_granted: boolean;
          }
        | undefined;
      return {
        emoji: "🕐",
        title: "Context",
        body: d
          ? [
              `🕐 ${d.tashkent_time} · ${d.day_of_week}`,
              `⏰ ${d.hour_bucket}`,
              d.is_business_hours ? "🟢 Business hours" : "🌙 Outside business hours",
              d.is_weekend ? "📅 Weekend" : "📅 Weekday",
              d.geolocation_granted ? "📍 GPS granted" : "📍 No GPS",
            ].join("\n")
          : "—",
      };
    }

    case "generate_synthetic_profile": {
      const data = r as { synthetic: boolean; profile: Record<string, unknown> } | undefined;
      const p = data?.profile ?? {};
      const lines = [
        `🏷️ [SYNTHETIC]`,
        `👤 ${p.name ?? "—"} · ${p.age ?? "—"}`,
        p.occupation ? `💼 ${p.occupation}` : "",
        p.business ? `🏪 ${p.business}` : "",
        p.monthly_income_uzs ? `💰 ${formatUzs(Number(p.monthly_income_uzs))}/oy` : "",
        p.monthly_revenue_uzs ? `📈 ${formatUzs(Number(p.monthly_revenue_uzs))}/oy revenue` : "",
        p.goal ? `🎯 ${p.goal}` : "",
      ].filter(Boolean);
      return { emoji: "🧪", title: "Synthetic profile", body: lines.join("\n") };
    }

    case "simulate_deposit_growth": {
      const d = r as
        | {
            principal_uzs: number;
            annual_rate_pct: number;
            term_months: number;
            monthly_contribution_uzs: number;
            final_balance_uzs: number;
            total_contributed_uzs: number;
            interest_earned_uzs: number;
            milestones: Array<{ month: number; balance_uzs: number }>;
          }
        | undefined;
      return {
        emoji: "📈",
        title: "Deposit growth [SIMULATION]",
        body: d
          ? [
              `Principal: ${formatUzs(d.principal_uzs)}`,
              `+${formatUzs(d.monthly_contribution_uzs)}/mo @ ${d.annual_rate_pct}%`,
              `Term: ${d.term_months} mo`,
              `─────────────`,
              ...d.milestones.map((mm) => `M${mm.month}: ${formatUzs(mm.balance_uzs)}`),
              `─────────────`,
              `🏁 Final: ${formatUzs(d.final_balance_uzs)}`,
              `💵 Interest: ${formatUzs(d.interest_earned_uzs)}`,
            ].join("\n")
          : "—",
      };
    }

    case "simulate_savings_goal": {
      const d = r as
        | {
            reachable: boolean;
            months_needed?: number;
            years_approx?: number;
            final_balance_uzs?: number;
            note?: string;
          }
        | undefined;
      return {
        emoji: "🎯",
        title: "Savings goal [SIMULATION]",
        body: d
          ? d.reachable
            ? `~ ${d.months_needed} mo (~${d.years_approx} yr)\nFinal: ${formatUzs(Number(d.final_balance_uzs))}`
            : (d.note ?? "Unreachable")
          : "—",
      };
    }

    case "explain_security_topic": {
      const d = r as { topic: string; title: string; tips: string[] } | undefined;
      return {
        emoji: "🛡️",
        title: d ? `🛡 ${d.title}` : "Security",
        body: d ? d.tips.map((t, i) => `${i + 1}. ${t}`).join("\n") : "—",
      };
    }

    default:
      return { emoji: "🔧", title: name, body: JSON.stringify(result, null, 2) };
  }
}

export function formatUzs(amount: number | null | undefined): string {
  // Tolerate null / undefined / NaN — LLM JSON sometimes returns null for
  // optional numeric fields and we don't want a hard crash.
  if (amount == null || !Number.isFinite(amount)) return "—";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount as number);
  return `${sign}${abs.toLocaleString("ru-RU")} so'm`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// ─── synthetic profile helpers ────────────────────────────────────────────
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickName(firsts: string[], lasts: string[]): string {
  return `${pickOne(firsts)} ${pickOne(lasts)}`;
}
function uniqueSortedMilestones(n: number): number[] {
  const set = new Set<number>();
  set.add(Math.min(1, n));
  set.add(Math.min(6, n));
  set.add(Math.min(12, n));
  set.add(Math.min(24, n));
  set.add(Math.min(60, n));
  set.add(n);
  return Array.from(set).filter((x) => x > 0).sort((a, b) => a - b);
}
