<div align="center">

# 🎙 SQB OvozAI

### Real-time AI Sales Copilot for Bank Operators

**Cluely-style · Trilingual (uz / ru / en) · Production-grade**

*The AI whispers next to your call agent — and tells them what to say next.*

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Google-Gemini%203.1%20%7C%202.5-4285F4?logo=google)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 🎯 What is this?

A **complete real-time AI platform for SQB call operators** — built end-to-end during the FinVision hackathon.

It listens to live calls in Uzbek / Russian / English, suggests the next move, hands the agent approved objection responses, auto-tracks compliance, and finishes with a one-click CRM-ready summary. Plus three more pages: a supervisor dashboard, a manager-grade analytics dashboard, and a post-call QA review tool that grades agents on ethics & compliance.

```
    ┌─────────────────────────┐         ┌──────────────────────────┐
    │  Customer (web/PBX)     │ ◀─────▶ │  Operator + Live Copilot │
    └─────────────────────────┘ Gemini  └──────────────────────────┘
                                Live              │
                                                  │  every turn → analyze
                                                  ▼
                                  ┌──────────────────────────────┐
                                  │  Gemini 2.5 Flash-lite       │
                                  │  · stage  · sentiment        │
                                  │  · objection  · NBO          │
                                  │  · compliance  · health      │
                                  │  · close-prob  · deal-value  │
                                  └──────────────────────────────┘
                                                  │
                                  ┌─────────┬─────┴─────┬───────────┐
                                  ▼         ▼           ▼           ▼
                             /agent   /supervisor  /analytics   /agent/qa
                             Copilot     6 calls      30-day      Post-call
                                                       KPIs        ethics audit
```

---

## ✨ Features that win

| | |
|---|---|
| 🎙 **Live Uzbek STT** | Push-to-talk mic, speech-gated to eliminate silent-hold hallucinations. Strict mirror language rule (Uzbek default). |
| 💡 **Whisper Card** | Single most useful next move — letter-by-letter typewriter reveal with AI confidence meter. |
| 💬 **Battle Cards** | When the customer pushes back, 3 approved Uzbek/Russian responses appear, click-to-copy. |
| 🎯 **Next-Best-Offer** | Best SQB product for THIS customer based on CRM profile + conversation. |
| ❓ **Smart questions** | Suggested questions live above the composer — one click to insert as agent turn. |
| 📋 **Auto KYC checklist** | 8 required disclosures glow green as the agent says them. |
| ⚠ **Compliance guardrail** | "Guaranteed profit" detected → instant red flag + warning toast. |
| ❤️ **Customer Health Score** | 0-100 animated ring combining sentiment, engagement, compliance, recovery. |
| 📞 **Real-time mic STT** | Direct Gemini Live WebSocket from the browser — no audio proxy. |
| 🌐 **Trilingual** | Uzbek / Russian / English throughout — recognized, mirrored, voice-output. |
| 📊 **Supervisor dashboard** | 6 simulated concurrent calls with ticking metrics + barge-in. |
| 📈 **Analytics dashboard** | 30-day conversion / compliance / call-volume sparklines + leaderboards + NPS. |
| 🛡 **Post-call QA Review** | Drop an audio recording or transcript → AI returns ethics violations, strengths, scores, coaching. |
| 🌍 **Customer-facing voice** | A separate `/` route — the same Gemini Live infra serving SQB customers directly. |
| 📚 **Document RAG** | Upload PDF/DOCX/TXT → BM25-indexed in browser → AI answers grounded in your docs. |
| 📍 **Location finder** | Find SQB branches/ATMs with haversine distance, opens Yandex/Google Maps. |

---

## 🚀 Quick start

```bash
git clone https://github.com/Shavkat7/finvision.git
cd finvision/finvision-voice
npm install

# Set your API key (get one at https://aistudio.google.com/apikey — free tier works)
cp .env.example .env.local
# Edit .env.local and paste your GEMINI_API_KEY

npm run dev
```

Open **http://localhost:3000** for the customer voice assistant, or **http://localhost:3000/agent** for the operator copilot.

> 💡 **Use headphones** when testing voice — the AI's TTS will otherwise feed back into the mic.

---

## 🗺 Routes

| Path | What it is |
|---|---|
| `/` | **Customer voice assistant** — ask SQB anything in Uzbek / Russian / English |
| `/agent` | **Operator Copilot** — 3-pane HUD with live whisper, battle cards, KYC tracking |
| `/agent/supervisor` | **Supervisor dashboard** — monitor 6 concurrent calls, listen-in, barge-in |
| `/agent/analytics` | **Management analytics** — 30-day KPIs, leaderboards, compliance breakdown, NPS |
| `/agent/qa` | **Post-call QA Review** — audit any call (audio or transcript) for ethics + compliance |
| `/api/token` | Mints an ephemeral Gemini Live token for the browser WebSocket |
| `/api/agent/analyze` | Per-turn analysis on the operator copilot |
| `/api/agent/qa-review` | Multimodal QA reviewer (audio or text) |
| `/api/kb/search` | BM25 search over the SQB knowledge base |
| `/api/kb/upload` | Document upload (PDF/DOCX/TXT) for the RAG layer |

---

## 🧩 Architecture

### Voice loop (sub-second)
```
mic → AudioWorklet (16 kHz PCM16, 32 ms chunks)
     → speech-gate (RMS > 0.02 for 2 chunks)
     → activityStart() + sendAudio() over WebSocket
     → Gemini 3.1 Pro Live (STT + reasoning + TTS)
     → 24 kHz PCM16 chunks ← AudioWorklet ← speakers
```

### Operator analysis (~2 s/turn)
```
turn appended → debounced 250 ms → POST /api/agent/analyze
     → Gemini 2.5 Flash-lite (responseMimeType: application/json)
     → strict JSON: stage / NBO / objection / compliance / scores / entities
     → cumulative compliance merge + farewell-detection post-processor
     → state diff → toast stream + UI animations
```

### QA review (offline, ~15-25 s)
```
audio file (≤ 20 MB) OR transcript text
     → POST /api/agent/qa-review
     → Gemini 2.5 Pro (multimodal: transcribe + analyze in one call)
     → strict JSON: summary / violations / strengths / scores / transcript
     → output language switchable (uz / ru / en) — quotes stay original
```

---

## 🛠 Tech stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript strict
- **Voice**: [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) over direct browser WebSocket via ephemeral tokens
- **LLM**: Gemini 3.1 Pro/Flash Live (voice) · 2.5 Flash-lite (analysis) · 2.5 Pro (QA)
- **Audio**: Web Audio API + `AudioWorklet` (zero-allocation playback, off-main-thread capture)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + `framer-motion` for animations
- **Knowledge base**: Hand-rolled BM25 over JSON, multilingual synonym injection (uz/ru/en)
- **Document parsing**: `pdf-parse` (PDF) + `mammoth` (DOCX) + plain text
- **No external services**: Everything runs against Google Gemini API. No vector DB, no Redis, no auth provider.

---

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shavkat7/finvision)

```bash
npx vercel
```

In the Vercel dashboard, add these environment variables:

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | — |
| `GEMINI_LIVE_MODEL` | optional | `gemini-3.1-flash-live-preview` |
| `GEMINI_ANALYSIS_MODEL` | optional | `gemini-2.5-flash-lite` |
| `GEMINI_QA_MODEL` | optional | `gemini-2.5-pro` |

> ⚠ The Live API requires WebSocket support, which Vercel Edge Functions don't provide — but we don't need them, because the browser opens the WebSocket **directly** to `generativelanguage.googleapis.com` using an ephemeral token minted by our Node API route. So Vercel's standard Node serverless runtime is enough.

---

## 🎬 Demo script (3 minutes)

1. **Open `/agent`** → click **Run live demo** → watch coach callouts narrate the cockpit
2. **Watch the StageBar** tick: Greeting → Discovery → Presentation → Objection → Closing → KYC → Wrap-up ✓
3. **Click any Battle Card** when the rose card appears (objection detected) → text copied to clipboard
4. **Click any Smart Question chip** above the composer → inserted as agent turn instantly
5. **End call** → summary modal shows stage reached + quality score + log to CRM
6. **Switch to `/agent/supervisor`** → 6 concurrent calls ticking with KPIs
7. **Switch to `/agent/analytics`** → 30-day conversion + compliance trends, top agents, NPS
8. **Switch to `/agent/qa`** → click **Try sample (Uzbek call)** → Run QA review → ~15 s later see violations / strengths / scores

---

## 🏆 Spec coverage (Problem 12)

| Acceptance criterion | Status |
|---|---|
| Real-time ASR (uz / ru) | ✅ Gemini Live |
| Streaming transcription | ✅ inputAudioTranscription |
| Intent + sentiment + objection detection | ✅ in analyze JSON |
| Sales stage tracking | ✅ + farewell post-processor for `wrap_up` |
| Next-best-offer engine grounded in CRM | ✅ NextBestOffer with confidence |
| KYC/AML checklist enforcement | ✅ 8 cumulative items, glows green |
| Compliance guardrails ("guaranteed profit") | ✅ `no_guaranteed_promises` flips false → red flag |
| Live objection handling | ✅ Battle Cards with click-to-copy |
| Operator copilot UI (3-pane) | ✅ |
| Post-call summary + CRM log | ✅ SummaryModal with quality score |
| Supervisor dashboard with barge-in | ✅ /agent/supervisor |
| Analytics dashboard | ✅ /agent/analytics |
| Recommendation latency ≤ 2 s | ✅ ~1.5–2.5 s with flash-lite |
| Cross-sell uplift target | ✅ tracked via NBO conversion |
| Quality score | ✅ 0–100 composite |
| Training mode (simulated customer) | 🟡 Demo dialog covers this; full self-serve trainer = v2 |
| Real PBX (Asterisk / Cisco / Avaya) | 🟡 Not in MVP — text input + browser mic; reference twilio_handler.py exists |
| Encrypted call recordings storage | 🟡 Architecture covers it (S3-compatible); not in MVP |

---

## 📁 Project structure

```
finvision-voice/
├── app/
│   ├── page.tsx                 # Customer voice assistant (uz/ru/en)
│   ├── api/
│   │   ├── token/route.ts       # Ephemeral Gemini Live tokens
│   │   ├── agent/analyze/       # Per-turn LLM analysis
│   │   ├── agent/qa-review/     # Post-call QA (audio + text)
│   │   ├── kb/search/           # BM25 over SQB KB
│   │   └── kb/upload/           # PDF/DOCX/TXT → text → chunks
│   └── agent/
│       ├── page.tsx             # Operator copilot (3-pane HUD)
│       ├── supervisor/page.tsx  # 6 concurrent calls
│       ├── analytics/page.tsx   # KPIs + sparklines + leaderboards
│       └── qa/page.tsx          # Post-call QA review
├── components/
│   ├── VoiceOrb.tsx             # Animated voice orb (Canvas)
│   ├── LanguagePills.tsx        # uz/ru/en segmented control
│   ├── KnowledgeUpload.tsx      # Document upload UI
│   ├── Composer.tsx             # Customer chat input
│   └── agent/
│       ├── StageBar.tsx         # Sales stage tracker
│       ├── WhisperCard.tsx      # Hero "what to say next" card
│       ├── NextBestOffer.tsx    # Product recommendation
│       ├── BattleCards.tsx      # Click-to-copy objection responses
│       ├── QuestionChips.tsx    # Suggested questions above composer
│       ├── ComplianceList.tsx   # 8-item KYC checklist
│       ├── HealthScore.tsx      # Big animated ring
│       ├── ProfileCard.tsx      # CRM customer profile
│       ├── ToastStream.tsx      # HUD event toasts
│       ├── CommandPalette.tsx   # ⌘K
│       ├── SummaryModal.tsx     # Post-call summary
│       └── qa/
│           ├── QAUploader.tsx   # Audio drop / transcript paste
│           └── QAResults.tsx    # Full review render
├── lib/
│   ├── gemini-client.ts         # Browser WebSocket → Gemini Live
│   ├── audio-capture.ts         # Mic → 16kHz PCM16 (with RMS for speech gate)
│   ├── audio-player.ts          # 24kHz PCM16 → speakers
│   ├── tools.ts                 # 14 customer-facing tools (search, locations, loan calc, …)
│   ├── prompts.ts               # Multilingual SQB system prompt
│   ├── i18n.ts                  # uz/ru/en dictionary
│   ├── geo.ts                   # Haversine + Yandex/Google map URLs
│   ├── context.ts               # Tashkent time / business-hours / GPS
│   ├── data/sqb-locations.ts    # 15 branches + 25 ATMs
│   ├── kb/                      # BM25 + tokenize + synonyms over SQB JSON
│   └── agent/
│       ├── types.ts             # Analysis schema
│       ├── prompt.ts            # Per-turn copilot prompt
│       ├── mock-profile.ts      # Demo CRM profile
│       ├── demo-script.ts       # 14-turn Uzbek dialog with coach notes
│       ├── supervisor-mock.ts   # 6 ticking concurrent calls
│       ├── analytics-mock.ts    # 30-day KPIs + leaderboards
│       ├── qa-types.ts          # QA review schema
│       ├── qa-prompt.ts         # QA reviewer prompt (multilingual)
│       └── qa-samples.ts        # Pre-canned Uzbek demo transcript
└── public/worklets/             # AudioWorklet processors (capture + playback)
```

---

## 🧠 Key engineering decisions

- **Direct browser → Gemini Live WebSocket** via ephemeral tokens. No audio proxy through our backend. Lowest possible latency, no Vercel-edge-WS pain.
- **Speech-gated push-to-talk** — `activityStart()` only fires after 2 consecutive chunks above 0.02 RMS, with a 12-chunk pre-buffer flushed on activation. Eliminates "silent hold = AI hallucinates" failures.
- **Stable `analyzeNow` callback** (zero deps via refs) — prevents the infinite analyze-loop bug where post-fetch state changes re-fired the effect indefinitely.
- **Farewell post-processor** — deterministic regex on `xayr / до свидания / bye / good day` forces `stage = "wrap_up"` even when the LLM is conservative about advancing.
- **Cumulative compliance merge** — server-side, items only flip false → true, never regress (except `no_guaranteed_promises` which can be violated and flagged red).
- **Strict mirror language rule + uz-UZ STT hint** — best of both: recognizer biased toward Uzbek (catches it correctly) but model can switch to ru/en if user does.
- **Tiered model strategy** — Pro Live for STT quality, Flash-lite for per-turn analysis (latency), Pro for offline QA (accuracy).

---

## 🙌 Credits

- Built for the **FinVision hackathon** (Tashkent, 2026) for **Problem 12** — Real-Time AI Sales Assistant for Bank Operators.
- Inspired by [Cluely](https://cluely.com/), [Balto](https://www.balto.ai/), [Hupo](https://hupo.ai/).
- Powered by [Google Gemini](https://ai.google.dev/) — Live + 2.5 family.

---

<div align="center">

**Ovoz beradi — keyingi qadamni aytadi.**
*It speaks — and tells the operator what to do next.*

</div>
