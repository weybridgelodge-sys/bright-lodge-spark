// Pure guards for save-meeting-response (unit-tested in src/test).

export const SEAT_CHECK_UNAVAILABLE_MESSAGE =
  "We could not check seat availability just now. Please try again in a few minutes or contact the Assistant Secretary.";

/** Honeypot field ("website") must be empty; anything else is a bot. */
export function isHoneypotTripped(website: unknown): boolean {
  return typeof website === "string" && website.trim().length > 0;
}

/**
 * Fail-closed seat check: an RPC error means we cannot confirm a seat,
 * so the caller must not insert and should answer 503.
 */
export function seatCheckOutcome(
  result: unknown,
  error: unknown,
): { ok: true; status: string } | { ok: false; httpStatus: 503; message: string } {
  if (error) return { ok: false, httpStatus: 503, message: SEAT_CHECK_UNAVAILABLE_MESSAGE };
  return { ok: true, status: typeof result === "string" && result ? result : "confirmed" };
}
