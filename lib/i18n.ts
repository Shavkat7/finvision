// Hand-rolled tri-lingual dictionary. Every UI string the user sees in
// each of: uz (default), ru, en. Tool descriptions stay multilingual in
// the system prompt — Gemini handles the rest.

import type { Lang } from "./types";

export const LANG_NAMES: Record<Lang, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
};

export const LANG_FULL_NAMES: Record<Lang, string> = {
  uz: "Uzbek",
  ru: "Russian",
  en: "English",
};

export const LANGUAGE_CODES: Record<Lang, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

type Dict = Record<string, Record<Lang, string>>;

const DICT: Dict = {
  app_subtitle: {
    uz: "Sanoat Qurilish Bank · ovozli yordamchi",
    ru: "Сanoat Qurilish Bank · голосовой помощник",
    en: "Sanoat Qurilish Bank · voice assistant",
  },
  status_idle:        { uz: "Tayyor",       ru: "Готов",         en: "Ready" },
  status_connecting:  { uz: "Ulanmoqda...", ru: "Подключение...", en: "Connecting..." },
  status_listening:   { uz: "Eshityapman",  ru: "Слушаю",        en: "Listening" },
  status_thinking:    { uz: "O'ylayapman",  ru: "Думаю",         en: "Thinking" },
  status_speaking:    { uz: "Gapirayapman", ru: "Говорю",        en: "Speaking" },
  status_interrupted: { uz: "To'xtatildi",  ru: "Прервано",      en: "Interrupted" },
  status_error:       { uz: "Xatolik",      ru: "Ошибка",        en: "Error" },

  start_listening: { uz: "Suhbatni boshlash", ru: "Начать разговор", en: "Start conversation" },
  stop_listening:  { uz: "Suhbatni to'xtatish", ru: "Завершить разговор", en: "End conversation" },
  hold_to_speak:   { uz: "Tutib turib gapiring", ru: "Удерживайте, чтобы говорить", en: "Hold to speak" },
  release_to_send: { uz: "Yuborish uchun qo'yib yuboring", ru: "Отпустите, чтобы отправить", en: "Release to send" },
  end_session:     { uz: "Yakunlash", ru: "Завершить", en: "End" },
  hold_hint:       { uz: "Tugmani bosib turib gapiring · bo'sh joy ham mumkin", ru: "Зажмите кнопку, чтобы говорить · можно пробел", en: "Hold the button to speak · or hold Space" },
  composer_placeholder: {
    uz: "Yozing yoki ovozli gapiring...",
    ru: "Введите сообщение или говорите...",
    en: "Type a message or hold to speak...",
  },
  composer_attach: { uz: "Hujjat yuklash", ru: "Прикрепить документ", en: "Attach document" },
  composer_send:   { uz: "Yuborish", ru: "Отправить", en: "Send" },

  conversation:    { uz: "Suhbat",     ru: "Разговор",  en: "Conversation" },
  messages:        { uz: "xabar",      ru: "сообщений", en: "messages" },
  empty_chat:      { uz: "Suhbat shu yerda paydo bo'ladi", ru: "Беседа появится здесь", en: "Conversation appears here" },

  settings:        { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },
  language:        { uz: "Til",        ru: "Язык",      en: "Language" },
  voice:           { uz: "Ovoz",       ru: "Голос",     en: "Voice" },
  voice_change_note: {
    uz: "O'zgartirish keyingi suhbatda kuchga kiradi",
    ru: "Изменения вступят в силу при следующем разговоре",
    en: "Change applies on next conversation",
  },

  tips:            { uz: "Maslahatlar", ru: "Советы", en: "Tips" },
  tip_headphones: {
    uz: "🎧 Akustik aks-sado uchun naushnik ishlating",
    ru: "🎧 Используйте наушники, чтобы избежать эха",
    en: "🎧 Use headphones to avoid echo",
  },
  tip_natural: {
    uz: "🗣️ Tabiiy gapiring — sun'iy intellekt sizni tinglaydi",
    ru: "🗣️ Говорите естественно — ИИ вас слушает",
    en: "🗣️ Speak naturally — the AI is listening",
  },
  tip_interrupt: {
    uz: "✋ Javobni to'xtatish uchun gapni boshlang",
    ru: "✋ Чтобы прервать ответ — просто начните говорить",
    en: "✋ Interrupt the assistant by starting to speak",
  },

  bank_questions:    { uz: "SQB haqida savollar", ru: "Вопросы о SQB",     en: "About SQB" },
  utility_questions: { uz: "Foydali xizmatlar",   ru: "Полезные функции", en: "Utilities" },

  loc_share_button:  { uz: "Joylashuvni ulashish", ru: "Поделиться местоположением", en: "Share location" },
  loc_shared:        { uz: "Joylashuv ulashildi",  ru: "Местоположение получено",   en: "Location shared" },
  loc_denied:        { uz: "Joylashuvga ruxsat berilmadi", ru: "Доступ к местоположению запрещён", en: "Location permission denied" },
};

export function t(lang: Lang, key: keyof typeof DICT): string {
  const entry = DICT[key];
  return entry ? entry[lang] : key;
}

export const DEMO_PROMPTS: Record<Lang, { bank: string[]; utility: string[] }> = {
  uz: {
    bank: [
      "SQB qanday bank?",
      "Bankning telefon raqami qancha?",
      "Mobil ilovangiz qaysi?",
      "SQB raisi kim?",
      "Qachon tashkil etilgan?",
      "Qaysi mukofotlarni olgan?",
      "Hozir dollar kursi qancha?",
    ],
    utility: [
      "Eng yaqin SQB filiali qayerda?",
      "Chilonzorda bankomat bormi?",
      "100 million so'mlik 15 yillik ipoteka uchun oylik to'lov qancha?",
      "Mening oylik daromadim 8 million so'm, kredit ola olamanmi?",
      "Yosh oila uchun ipoteka taklif qila olasizmi?",
      "Yunusobodda mortgage bo'yicha uchrashuvga yozdirib bering",
    ],
  },
  ru: {
    bank: [
      "Что за банк SQB?",
      "Какой телефон у банка?",
      "Какое у вас мобильное приложение?",
      "Кто председатель SQB?",
      "Когда основан?",
      "Какие награды получили?",
      "Какой сейчас курс доллара?",
    ],
    utility: [
      "Где ближайший филиал SQB?",
      "Есть ли банкомат в Чиланзаре?",
      "Какой ежемесячный платёж по ипотеке 100 млн сум на 15 лет?",
      "Мой доход 8 млн сум в месяц — могу взять кредит?",
      "Можете порекомендовать ипотеку для молодой семьи?",
      "Запишите меня на консультацию по ипотеке в Юнусабаде",
    ],
  },
  en: {
    bank: [
      "What kind of bank is SQB?",
      "What's the bank's phone number?",
      "What's your mobile app?",
      "Who is SQB's chairman?",
      "When was it founded?",
      "What awards has it won?",
      "What's the current USD rate?",
    ],
    utility: [
      "Where's the nearest SQB branch?",
      "Is there an ATM in Chilonzor?",
      "Monthly payment for a 100M UZS, 15-year mortgage?",
      "I earn 8M UZS/month — can I get a loan?",
      "Can you recommend a mortgage for a young family?",
      "Book me a mortgage consultation in Yunusabad",
    ],
  },
};
