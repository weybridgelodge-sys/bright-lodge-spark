// Pure decision rules for unpaid ("pending") card bookings.
// A card booking is held for HOLD_MINUTES. After the Stripe session has
// expired, we wait GRACE_MINUTES more (webhooks have lagged ~1.5 min)
// before the row may be removed. Stripe is always asked first: a paid
// session is never deleted, it is marked paid instead.
// No I/O here so the rules can be unit-tested.

export const HOLD_MINUTES = 60;
export const GRACE_MINUTES = 15;

export type StripeSessionInfo = {
  status: "open" | "complete" | "expired" | string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required" | string | null;
  /** Unix seconds */
  expires_at: number | null;
};

export type ExpiryAction = "keep" | "mark_paid" | "delete" | "expire_session";

export interface ExpiryInput {
  createdAt: string | Date;
  hasSessionId: boolean;
  /** null when the booking has a session id but Stripe could not be read. */
  session: StripeSessionInfo | null;
  now: Date;
}

export interface ExpiryDecision {
  action: ExpiryAction;
  reason: string;
}

const MIN = 60_000;

export function holdExpiresAtUnix(now: Date): number {
  return Math.floor(now.getTime() / 1000) + HOLD_MINUTES * 60;
}

export function decidePendingBooking(i: ExpiryInput): ExpiryDecision {
  const created = new Date(i.createdAt).getTime();
  const now = i.now.getTime();

  if (!i.hasSessionId) {
    return now > created + (HOLD_MINUTES + GRACE_MINUTES) * MIN
      ? { action: "delete", reason: "no Stripe session; older than hold + grace" }
      : { action: "keep", reason: "no Stripe session yet; within hold + grace" };
  }

  const s = i.session;
  if (!s) return { action: "keep", reason: "Stripe session could not be read" };

  if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
    return { action: "mark_paid", reason: "Stripe shows the session paid" };
  }

  if (s.status === "complete") {
    // Delayed payment methods settle later; never remove.
    return { action: "keep", reason: "session complete, payment still settling" };
  }

  if (s.status === "expired") {
    const expiredAt = (s.expires_at ?? 0) * 1000;
    // An early-closed session's expires_at may be in the future; use the
    // later of expires_at and the booking's own hold end.
    const base = Math.max(Math.min(expiredAt, now), created + HOLD_MINUTES * MIN);
    return now > base + GRACE_MINUTES * MIN
      ? { action: "delete", reason: "Stripe confirms expired and unpaid; grace passed" }
      : { action: "keep", reason: "expired but still inside the grace period" };
  }

  if (s.status === "open") {
    // Sessions created before the 60-minute hold existed run for 24 h.
    if (now > created + HOLD_MINUTES * MIN) {
      return { action: "expire_session", reason: "hold of 60 minutes passed; close the session" };
    }
    return { action: "keep", reason: "still within the 60-minute hold" };
  }

  return { action: "keep", reason: `unknown session status ${s.status}` };
}

/** Infer the Stripe environment from a Checkout Session id. */
export function envFromSessionId(id: string): "sandbox" | "live" | null {
  if (/^cs_test_[A-Za-z0-9]+$/.test(id)) return "sandbox";
  if (/^cs_live_[A-Za-z0-9]+$/.test(id)) return "live";
  return null;
}

/** Return-page view: has the hold lapsed with no payment? */
export function isSessionExpiredForReturn(
  bookingStatus: string | null,
  session: StripeSessionInfo | null,
  now: Date,
): boolean {
  if (bookingStatus && bookingStatus !== "pending") return false;
  if (!session) return false;
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") return false;
  if (session.status === "expired") return true;
  return session.status === "open" && !!session.expires_at && session.expires_at * 1000 < now.getTime();
}

/** Statuses that never put anyone on the Festive Board register (mirrored
 * in the trg_sync_attendance_from_booking WHEN clause). */
export const NON_REGISTER_STATUSES = ["pending", "failed"] as const;
export function bookingCreatesRegisterRow(status: string | null | undefined): boolean {
  return !(NON_REGISTER_STATUSES as readonly string[]).includes(String(status ?? ""));
}
