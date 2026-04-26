// Multilingual synonym map for cross-language KB search.
// The KB is in English; users ask in Uzbek/Russian. We inject synonyms
// at TOKEN level (not text level) so each occurrence of "chairman" produces
// an additional "rais" token — preserving term frequency for BM25.

import { tokenize } from "./tokenize";

const SYNONYM_GROUPS: string[][] = [
  ["phone", "phones", "telephone", "telefon", "телефон", "raqam"],
  ["address", "manzil", "адрес", "headquarters", "office", "ofis"],
  ["email", "pochta", "почта", "elektron"],
  ["website", "sayt", "сайт", "veb"],
  ["mobile", "app", "ilova", "mobil", "приложение"],
  ["chairman", "rais", "председатель", "ceo"],
  ["board", "boshqaruv", "правление", "rahbariyat"],
  ["bank", "банк"],
  ["branch", "branches", "filial", "filiallar", "филиал"],
  ["atm", "atms", "bankomat", "банкомат"],
  ["credit", "kredit", "кредит", "loan", "qarz"],
  ["deposit", "depozit", "депозит", "omonat"],
  ["mortgage", "ipoteka", "ипотека"],
  ["card", "karta", "карта"],
  ["award", "awards", "mukofot", "mukofotlar", "награда"],
  ["founded", "established", "tashkil", "основан"],
  ["employee", "employees", "xodim", "xodimlar", "сотрудник"],
  ["history", "tarix", "история"],
  ["product", "products", "mahsulot", "mahsulotlar", "продукт"],
  ["service", "services", "xizmat", "xizmatlar", "услуга"],
  ["hour", "hours", "vaqt", "часы"],
  ["business", "biznes", "бизнес", "company", "korxona"],
  ["rating", "ratings", "reyting", "рейтинг"],
  ["asset", "assets", "aktiv", "aktivlar"],
  ["fund", "funds", "fond", "фонд"],
  ["green", "esg", "yashil", "sustainability", "barqaror"],
  ["customer", "customers", "mijoz", "mijozlar", "клиент"],
  ["online", "internet", "raqamli", "цифровой", "digital"],
  ["call", "qo'ng'iroq", "звонок", "center", "markaz"],
  ["currency", "valyuta", "валюта"],
  ["transfer", "o'tkazma", "перевод"],
  ["balance", "balans", "баланс"],
  ["account", "hisob", "счет"],
];

// term (already tokenized form) → list of synonym tokens
const SYNONYM_TOKENS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  // Tokenize each group entry once so we always work in token-space.
  const tokenized = group.map((g) => tokenize(g));
  for (let i = 0; i < group.length; i++) {
    const ownTokens = tokenized[i];
    if (ownTokens.length === 0) continue;
    // Synonyms = flat list of every other group entry's tokens.
    const others: string[] = [];
    for (let j = 0; j < tokenized.length; j++) {
      if (i !== j) others.push(...tokenized[j]);
    }
    // Map each of own tokens to others (so plural/stem variants both hit).
    for (const t of ownTokens) {
      const cur = SYNONYM_TOKENS.get(t) ?? [];
      cur.push(...others);
      SYNONYM_TOKENS.set(t, cur);
    }
  }
}

/**
 * Expand a tokenized document with cross-language synonyms.
 * For each token in the input, if it has synonyms, append them.
 * This preserves term frequency: 3 "chairman" → 3 sets of "rais" synonyms.
 */
export function expandTokensWithSynonyms(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    out.push(t);
    const syns = SYNONYM_TOKENS.get(t);
    if (syns) out.push(...syns);
  }
  return out;
}
