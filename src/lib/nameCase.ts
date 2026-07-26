/**
 * Shared capitalisation normalisation for user-entered name / lodge / title fields.
 * Applied at data-entry submission time so records are stored clean.
 */

const LOWER_PARTICLES = new Set([
  "de", "da", "di", "du", "del", "della", "dello", "van", "von", "der", "den",
  "of", "the", "and", "y", "le", "la", "el", "bin", "ibn", "al", "st",
]);

// Words that should stay fully uppercase inside a lodge / group / name field.
const UPPER_TOKENS = new Set([
  "UK", "USA", "GB", "GBR", "EU", "NHS", "BBC", "GMC", "RAF", "RN", "SAS",
  "PGL", "UGLE", "RA", "MM", "IPM", "WM", "SW", "JW", "DC", "GP", "MW",
]);

const ROMAN_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

function capWord(word: string): string {
  if (!word) return word;
  // Preserve pure numeric tokens (lodge numbers etc.)
  if (/^\d[\w\d]*$/.test(word)) return word;
  // Alphanumeric with digits (e.g. "6787A", "No.6787") — uppercase letters, keep digits/punct
  if (/\d/.test(word)) return word.toUpperCase();
  const upper = word.toUpperCase();
  if (UPPER_TOKENS.has(upper)) return upper;
  if (ROMAN_RE.test(word) && word.length > 1) return upper;

  // Handle apostrophes: O'Brien, D'Angelo — capitalise first char of each apostrophe segment,
  // except lowercase Irish/Scots "Mc"/"Mac" continuations handled below.
  const lower = word.toLowerCase();

  // Mc / Mac prefixes: McDonald, MacLeod
  if (/^mc[a-z]/.test(lower)) {
    return "Mc" + lower.charAt(2).toUpperCase() + lower.slice(3);
  }
  if (/^mac[a-z]{2,}/.test(lower) && !["macedonia", "mackenzie"].includes(lower)) {
    // Conservative: only apply Mac→Mac[Upper] when word starts with mac + a consonant-ish
    return "Mac" + lower.charAt(3).toUpperCase() + lower.slice(4);
  }

  // Apostrophes and hyphens: split, capitalise each segment
  return lower
    .split(/(['\-])/)
    .map((seg, i) => {
      if (seg === "'" || seg === "-") return seg;
      if (!seg) return seg;
      return seg.charAt(0).toUpperCase() + seg.slice(1);
    })
    .join("");
}

/**
 * Proper-case a first/last/lodge name string.
 * - Handles apostrophes: o'brien → O'Brien
 * - Handles hyphens: smith-jones → Smith-Jones
 * - Preserves numbers (lodge numbers) and roman numerals
 * - Lowercases particles (de, van, of) unless first word
 */
export function normaliseName(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = String(raw).replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const tokens = trimmed.split(" ");
  return tokens
    .map((tok, i) => {
      const lower = tok.toLowerCase();
      if (i > 0 && LOWER_PARTICLES.has(lower)) return lower;
      return capWord(tok);
    })
    .join(" ");
}

/**
 * Normalise a Masonic / civil title string.
 * "w bro" → "W Bro", "rw bro" → "RW Bro", "vw bro" → "VW Bro",
 * "mr" → "Mr", "dr" → "Dr", etc.
 */
export function normaliseTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = String(raw).replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (!s) return "";

  // Masonic titles first
  const masonic = s.match(/^(r\s*w|v\s*w|w|rt\s*wor)\s*bro$/i);
  if (masonic) {
    const prefix = masonic[1].replace(/\s+/g, "").toUpperCase();
    if (prefix === "W") return "W Bro";
    if (prefix === "RW") return "RW Bro";
    if (prefix === "VW") return "VW Bro";
    if (prefix === "RTWOR") return "Rt Wor Bro";
  }
  if (/^bro$/i.test(s)) return "Bro";

  // Civil titles
  const civil: Record<string, string> = {
    mr: "Mr", mrs: "Mrs", ms: "Ms", miss: "Miss",
    dr: "Dr", prof: "Prof", rev: "Rev", revd: "Revd",
    sir: "Sir", dame: "Dame", lord: "Lord", lady: "Lady",
    capt: "Capt", col: "Col", maj: "Maj", lt: "Lt", sgt: "Sgt",
  };
  const key = s.toLowerCase();
  if (civil[key]) return civil[key];

  // Fallback: title-case each token
  return normaliseName(s);
}
