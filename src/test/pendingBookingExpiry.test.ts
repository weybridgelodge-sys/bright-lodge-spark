import { describe, it, expect } from "vitest";
import { decidePendingBooking, bookingCreatesRegisterRow, isSessionExpiredForReturn, holdExpiresAtUnix } from "../../supabase/functions/_shared/pendingBookingExpiry";
import { classifyReturn, EXPIRED_SESSION_MESSAGE } from "@/lib/checkoutReturnState";

const t0 = new Date("2026-10-19T10:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const exp = Math.floor(at(60).getTime() / 1000);

describe("pending card booking expiry", () => {
  it("holds the Stripe session for exactly 60 minutes", () => {
    expect(holdExpiresAtUnix(t0)).toBe(Math.floor(t0.getTime() / 1000) + 3600);
  });
  it("keeps a booking still within the hour", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: { status: "open", payment_status: "unpaid", expires_at: exp }, now: at(30) }).action).toBe("keep");
  });
  it("marks paid when Stripe shows paid inside the grace period", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: { status: "complete", payment_status: "paid", expires_at: exp }, now: at(70) }).action).toBe("mark_paid");
  });
  it("keeps an expired session until 15 minutes of grace have passed", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: { status: "expired", payment_status: "unpaid", expires_at: exp }, now: at(74) }).action).toBe("keep");
  });
  it("deletes once Stripe confirms expired and grace has passed", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: { status: "expired", payment_status: "unpaid", expires_at: exp }, now: at(76) }).action).toBe("delete");
  });
  it("closes an old 24-hour session still open after the hour", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: { status: "open", payment_status: "unpaid", expires_at: exp + 23 * 3600 }, now: at(61) }).action).toBe("expire_session");
  });
  it("deletes a booking with no session only after hold plus grace", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: false, session: null, now: at(74) }).action).toBe("keep");
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: false, session: null, now: at(76) }).action).toBe("delete");
  });
  it("never deletes when Stripe cannot be read", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: null, now: at(500) }).action).toBe("keep");
  });
  it("keeps a completed session whose payment is still settling", () => {
    expect(decidePendingBooking({ createdAt: t0, hasSessionId: true, session: { status: "complete", payment_status: "unpaid", expires_at: exp }, now: at(500) }).action).toBe("keep");
  });
});

describe("register only when paid or confirmed", () => {
  it("pending and failed card bookings create no register row", () => {
    expect(bookingCreatesRegisterRow("pending")).toBe(false);
    expect(bookingCreatesRegisterRow("failed")).toBe(false);
  });
  it("paid, confirmed, waitlisted and apologies still do", () => {
    for (const s of ["paid", "confirmed", "waitlisted", "apologies"]) expect(bookingCreatesRegisterRow(s)).toBe(true);
  });
});

describe("expired-session message on the return page", () => {
  it("uses the agreed wording", () => {
    expect(EXPIRED_SESSION_MESSAGE).toBe("We're sorry, your booking session has expired. Please start again.");
  });
  it("shows expired when the server says the session expired", () => {
    expect(classifyReturn({ booking: null, session_expired: true })).toBe("expired");
    expect(classifyReturn({ booking: { payment_status: "paid" } })).toBe("paid");
  });
  it("treats a paid session as not expired even after expiry time", () => {
    expect(isSessionExpiredForReturn("pending", { status: "expired", payment_status: "paid", expires_at: exp }, at(90))).toBe(false);
    expect(isSessionExpiredForReturn(null, { status: "expired", payment_status: "unpaid", expires_at: exp }, at(90))).toBe(true);
    expect(isSessionExpiredForReturn("paid", { status: "expired", payment_status: "unpaid", expires_at: exp }, at(90))).toBe(false);
  });
});
