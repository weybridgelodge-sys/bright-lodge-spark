export const EXPIRED_SESSION_MESSAGE = "We're sorry, your booking session has expired. Please start again.";

export type ReturnStatus = "paid" | "waitlisted" | "expired" | "pending" | "missing";

/** Classify one get-booking-by-session response. */
export function classifyReturn(resp: { booking?: { payment_status?: string } | null; session_expired?: boolean } | null): ReturnStatus {
  if (resp?.session_expired) return "expired";
  const s = resp?.booking?.payment_status;
  if (s === "paid") return "paid";
  if (s === "waitlisted") return "waitlisted";
  if (resp?.booking) return "pending";
  return "missing";
}
