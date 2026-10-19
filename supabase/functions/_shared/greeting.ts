/**
 * Greeting first name for booking emails and confirmation pages.
 * Order: details.firstName (trimmed) → first word of contact_name that is not
 * a title (Mrs, W Bro, Rt Wor Bro…) → "there". Pure, shared by edge functions
 * and the web app so every greeting follows one rule.
 */

// Single-word tokens that are titles (compared lowercase, dots stripped).
const TITLE_WORDS = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof", "rev", "revd", "sir", "dame",
  "lord", "lady", "capt", "col", "maj", "lt", "sgt", "bro", "w", "vw", "rw",
  "rt", "wor", "wbro", "vwbro", "rwbro", "worshipful", "right", "very", "brother",
]);

function isTitleWord(word: string): boolean {
  return TITLE_WORDS.has(word.replace(/\./g, "").toLowerCase());
}

/** First word of a full name that is not a title, or "" if none. */
export function firstNameFromContact(contactName: string | null | undefined): string {
  const words = String(contactName ?? "").trim().split(/\s+/).filter(Boolean);
  return words.find((w) => !isTitleWord(w) && /[a-z]/i.test(w)) ?? "";
}

/** Best first name or "" (for templates that have their own fallback). */
export function bookingFirstName(
  details: { firstName?: unknown } | null | undefined,
  contactName: string | null | undefined,
): string {
  const fromDetails = typeof details?.firstName === "string" ? details.firstName.trim() : "";
  if (fromDetails && !isTitleWord(fromDetails)) return fromDetails;
  return firstNameFromContact(contactName);
}

/** Greeting name, finally falling back to "there". */
export function greetingName(
  details: { firstName?: unknown } | null | undefined,
  contactName: string | null | undefined,
): string {
  return bookingFirstName(details, contactName) || "there";
}

/** Trim the name fields of a booking before it is saved. Returns a copy. */
export function trimBookingNames<T extends Record<string, unknown> | undefined>(details: T): T {
  if (!details) return details;
  const out: Record<string, unknown> = { ...details };
  for (const k of ["title", "firstName", "lastName"]) {
    if (typeof out[k] === "string") out[k] = (out[k] as string).trim();
  }
  return out as T;
}
