// Guest "seating requests or anything we should know" box on the public event form
// (browser re-exports this file). Plain text only; never logged or sent to Stripe.

export const GUEST_REQUESTS_MAX = 300;
export const GUEST_REQUESTS_TOO_LONG = `Please keep your requests to ${GUEST_REQUESTS_MAX} characters or fewer.`;

/** Strip control characters (keeping line breaks), collapse runs of blank lines, trim. */
export function cleanGuestRequests(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    // C0 (except \n), DEL, C1, and zero-width / bidi controls.
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .split("\n").map((l) => l.replace(/\s+$/, "")).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** null = nothing to store; error = reject with this message. */
export function parseGuestRequests(raw: unknown): { value: string | null; error?: string } {
  if (raw == null) return { value: null };
  if (typeof raw !== "string") return { value: null, error: "Requests must be text." };
  const v = cleanGuestRequests(raw);
  if (v.length > GUEST_REQUESTS_MAX) return { value: null, error: GUEST_REQUESTS_TOO_LONG };
  return { value: v || null };
}

/** PDF only: short single-line preview. */
export function guestRequestsPreview(v: string | null | undefined, max = 120): string {
  const s = (v ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 3).trimEnd()}...` : s;
}
