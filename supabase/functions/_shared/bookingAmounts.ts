// Pure helpers for showing a booking's money and event line (unit-tested in src/test).
// Base price, optional card fee (only when > 0) and total all come from the
// stored booking columns, so what we show matches what Stripe charged.

export type AmountLine = { label: string; value: string };

const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

export function bookingAmountLines(
  subtotalPence: number | null | undefined,
  feePence: number | null | undefined,
  totalPence: number | null | undefined,
): AmountLine[] {
  if (totalPence == null) return [];
  const fee = Number(feePence ?? 0);
  if (fee <= 0) return [{ label: "Total", value: gbp(totalPence) }];
  const base = subtotalPence ?? totalPence - fee;
  return [
    { label: "Base price", value: gbp(base) },
    { label: "Card processing fee", value: gbp(fee) },
    { label: "Total", value: gbp(totalPence) },
  ];
}

/** Drop a trailing " — 21 October 2026" style date when a Date line is shown separately. */
export function eventLabelWithoutDate(label: string | null | undefined, hasDateLine: boolean): string {
  const s = String(label ?? "").trim();
  if (!hasDateLine) return s;
  return s.replace(/\s*[—–-]\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*$/, "").trim() || s;
}

/** Bookings the hourly cleanup may consider: unpaid pending, or unpaid waitlisted card bookings. */
export function isExpiryCandidate(b: { payment_status: string; stripe_session_id: string | null; paid_at: string | null }): boolean {
  if (b.payment_status === "pending") return true;
  return b.payment_status === "waitlisted" && !!b.stripe_session_id && !b.paid_at;
}
