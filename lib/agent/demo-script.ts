// Preset Uzbek demo dialog. Each turn can carry a `coach` note that
// fires a friendly tooltip explaining what just happened on-screen.

import type { Speaker } from "./types";

export interface DemoTurn {
  speaker: Speaker;
  text: string;
  delayMsAfter: number;
  coach?: { text: string; emoji?: string };
}

export const DEMO_DIALOG: DemoTurn[] = [
  {
    speaker: "agent",
    text: "Assalomu alaykum Aziz aka, men SQBdan Murod. Hozir bemalol gaplasha olamizmi?",
    delayMsAfter: 1800,
    coach: {
      emoji: "👋",
      text: "Greeting recorded. Watch the stage tracker move from Greeting → Discovery as the call evolves.",
    },
  },
  {
    speaker: "customer",
    text: "Va alaykum assalom. Ha, gaplashing.",
    delayMsAfter: 1500,
  },
  {
    speaker: "agent",
    text:
      "Sizning ipoteka kalkulyatorimizdan ikki marta foydalanganingizni ko'rdik. Yangi ipoteka takliflarimiz bo'yicha qisqacha ma'lumot bersam bo'ladimi?",
    delayMsAfter: 2200,
    coach: {
      emoji: "🎯",
      text: "Discovery starting — agent referenced CRM activity (mortgage calculator twice). The AI noticed and the recommended product card is about to appear.",
    },
  },
  {
    speaker: "customer",
    text:
      "Qiziq, lekin hozir foiz stavkalari juda yuqori-ku, men biroz kutib turay deganman.",
    delayMsAfter: 2400,
    coach: {
      emoji: "🛑",
      text: "OBJECTION detected — “rates too high”. Look at the rose Battle Cards in the center — 3 approved Uzbek responses just appeared. Click any to copy.",
    },
  },
  {
    speaker: "agent",
    text:
      "To'g'ri aytasiz. Lekin yangi mahsulotimiz — KAPITAL IPOTEKA — 17 foizda, bu bozor o'rtachasidan past. Sizning daromadingizga ko'ra qo'shimcha imtiyozli stavka ham bor.",
    delayMsAfter: 2400,
    coach: {
      emoji: "💸",
      text: "Agent counter-offered. Watch the deal-value counter and close-probability tick UP. The Health score also climbs — this is good handling.",
    },
  },
  {
    speaker: "customer",
    text: "Qanday hujjatlar kerak bo'lar ekan?",
    delayMsAfter: 1700,
    coach: {
      emoji: "📈",
      text: "Customer is leaning in — asking about NEXT STEPS. Close probability is rising fast. Suggested-questions card shows what to ask next.",
    },
  },
  {
    speaker: "agent",
    text:
      "Pasport, daromad ma'lumotnomasi va ish joyidan ma'lumotnoma. Iltimos, daromadingiz manbasini aniqlashtirib bersangiz — oylik ish haqi yoki tadbirkorlikmi?",
    delayMsAfter: 2200,
    coach: {
      emoji: "📋",
      text: "Agent asked for source of income — that's a KYC item. Watch one compliance row turn green on the right pane.",
    },
  },
  {
    speaker: "customer",
    text: "Oylik ish haqi, IT-Park rezidenti kompaniyada ishlayman.",
    delayMsAfter: 1800,
  },
  {
    speaker: "agent",
    text:
      "Ajoyib, IT-Park rezidentlariga maxsus shartlarimiz bor. Shuni eslatib o'tay — bu taklif kredit qaroriga bog'liq, kafolatli foyda yo'q. Ma'lumotlaringizni qayta ishlashga roziligingizni tasdiqlaysizmi?",
    delayMsAfter: 2400,
    coach: {
      emoji: "✅",
      text: "Agent disclosed “no guarantee” + asked for data-processing consent. Two more compliance items light up green — the bar is filling.",
    },
  },
  {
    speaker: "customer",
    text: "Ha, roziman. Keyingi qadam nima?",
    delayMsAfter: 1700,
    coach: {
      emoji: "🎉",
      text: "Consent obtained. Close probability is now over 70%. Stage advances to Closing.",
    },
  },
  {
    speaker: "agent",
    text:
      "Yunusobod filialida ertaga soat o'n ikkida uchrashuv tayinlasak bo'ladimi? Keyinroq bekor qilish huquqingiz bor.",
    delayMsAfter: 2200,
    coach: {
      emoji: "🏆",
      text: "Closing the call. Agent mentioned cooling-off rights (compliance). Click “End call” when finished to see the auto-summary modal.",
    },
  },
  {
    speaker: "customer",
    text: "Mayli, bo'pti, ertaga uchrashamiz.",
    delayMsAfter: 1800,
  },
  {
    speaker: "agent",
    text:
      "Ajoyib! Tasdiq xabari hozir SMS orqali keladi. Ertaga ko'rishguncha, Aziz aka. Yaxshi kun tilayman.",
    delayMsAfter: 2200,
    coach: {
      emoji: "📋",
      text: "Stage moved to KYC / wrap-up. Agent is closing politely with a confirmation channel.",
    },
  },
  {
    speaker: "customer",
    text: "Sizga ham yaxshi kun. Rahmat, xayr.",
    delayMsAfter: 1500,
    coach: {
      emoji: "🏁",
      text: "WRAP-UP — call ended cleanly. Click 'End call' now to see the auto-summary, quality score, and CRM log.",
    },
  },
];
