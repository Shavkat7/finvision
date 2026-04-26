// Uzbek/Russian/English-aware tokenizer for the SQB knowledge base.
// Normalizes the four common apostrophe variants and strips punctuation
// while preserving Cyrillic and Latin letters via Unicode property classes.
//
// Includes light stemming for plurals so "phone" matches "phones",
// "filial" matches "filiallar", "награда" matches "награды".

const APOSTROPHE_VARIANTS = /[‘’ʻʼ`´]/g;

const STOPWORDS = new Set([
  // English
  "the", "a", "an", "is", "are", "was", "were", "be", "of", "to", "and", "or",
  "in", "on", "at", "by", "for", "with", "this", "that", "it", "as", "from",
  // Uzbek
  "va", "yoki", "ham", "lekin", "u", "bu", "shu", "men", "siz", "biz",
  "uchun", "haqida",
  // Russian
  "и", "или", "в", "на", "с", "по", "для", "это", "тот", "что", "как",
]);

// Light stemmer — handles common plural/case/possessive suffixes across uz/ru/en.
// Order matters: longest suffixes first.
function stem(token: string): string {
  if (token.length <= 4) return token;

  // English plurals
  if (token.endsWith("ies") && token.length > 5) return token.slice(0, -3) + "y";
  if (token.endsWith("es") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("s")) return token.slice(0, -1);

  // Uzbek plural + possessive + case (try longer first)
  if (token.endsWith("imiz")) return token.slice(0, -4);
  if (token.endsWith("ingiz")) return token.slice(0, -5);
  if (token.endsWith("lari") && token.length > 5) return token.slice(0, -4);
  if (token.endsWith("lar") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("ning") && token.length > 6) return token.slice(0, -4);
  if (token.endsWith("dan") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("ga") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("da") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("im") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  // 3rd-person possessive 'i' after a consonant
  // (e.g. "manzili" → "manzil", "raqami" → "raqam", "vaqti" → "vaqt")
  if (token.endsWith("i") && /[bcdfghjklmnpqrstvxz]i$/.test(token)) {
    return token.slice(0, -1);
  }

  // Russian: drop trailing vowel (rough)
  if (/[ыиаяуюоеэё]$/.test(token) && token.length > 5) return token.slice(0, -1);
  return token;
}

export function tokenize(input: string): string[] {
  if (!input) return [];
  const normalized = input
    .toLowerCase()
    .replace(APOSTROPHE_VARIANTS, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];

  const out: string[] = [];
  for (const raw of normalized.split(" ")) {
    const t = raw.replace(/^['-]+|['-]+$/g, "");
    if (t.length < 2 || STOPWORDS.has(t)) continue;
    out.push(t);
    const s = stem(t);
    if (s !== t && s.length >= 2) out.push(s);
  }
  return out;
}

export function pathToReadable(path: string[]): string {
  return path
    .filter((p) => !p.startsWith("["))
    .map((p) => p.replace(/_/g, " "))
    .join(" ");
}
