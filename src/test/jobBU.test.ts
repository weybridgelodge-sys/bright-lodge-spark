import { describe, it, expect } from "vitest";
import { countsForHeadcount, countedGuests } from "@/lib/treasurer/eventBookingReport";

const NOW = Date.parse("2026-10-25T20:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const b = (o: object) => ({ id: "x", deposit_paid: false, balance_paid: false, deposit_pence: 0, balance_pence: 3590, total_pence: 3590, amount_paid_pence: 0, ticket_count: 1, payment_method: "card", payment_status: "pending", created_at: ago(5 * MIN), ...o });

describe("headcount excludes lapsed bookings", () => {
  it("card hold at 29:59 and exactly 30:00 counts; 30:01 does not", () => {
    expect(countsForHeadcount(b({ created_at: ago(30 * MIN - 1000) }), NOW)).toBe(true);
    expect(countsForHeadcount(b({ created_at: ago(30 * MIN) }), NOW)).toBe(true);
    expect(countsForHeadcount(b({ created_at: ago(30 * MIN + 1000) }), NOW)).toBe(false);
  });
  it("missing or unknown status with no money counts", () => {
    expect(countsForHeadcount(b({ payment_status: null }), NOW)).toBe(true);
    expect(countsForHeadcount(b({ payment_status: "weird" }), NOW)).toBe(true);
  });
  it("expired or cancelled with money received counts; without money does not", () => {
    expect(countsForHeadcount(b({ payment_status: "expired", amount_paid_pence: 1000 }), NOW)).toBe(true);
    expect(countsForHeadcount(b({ payment_status: "cancelled", deposit_paid: true }), NOW)).toBe(true);
    expect(countsForHeadcount(b({ payment_status: "expired" }), NOW)).toBe(false);
    expect(countsForHeadcount(b({ payment_status: "cancelled" }), NOW)).toBe(false);
  });
  it("refunded with money recorded does not count (JOB BV)", () => {
    expect(countsForHeadcount(b({ payment_status: "refunded", balance_paid: true, amount_paid_pence: 3590 }), NOW)).toBe(false);
  });
  it("refunded written with odd case or trailing space does not count", () => {
    expect(countsForHeadcount(b({ payment_status: "Refunded ", balance_paid: true, amount_paid_pence: 3590 }), NOW)).toBe(false);
    expect(countsForHeadcount(b({ payment_status: "  REFUNDED" }), NOW)).toBe(false);
  });
  it("refunded after a partial refund (money still recorded) does not count", () => {
    expect(countsForHeadcount(b({ payment_status: "refunded", deposit_paid: true, amount_paid_pence: 1200 }), NOW)).toBe(false);
  });
  it("bank transfer pending never lapses", () => {
    expect(countsForHeadcount(b({ payment_method: "bank_transfer", created_at: ago(30 * 24 * 60 * MIN) }), NOW)).toBe(true);
  });
  it("Christmas case: 4 guests, one expired booking leaves 3", () => {
    const bookings = [b({ id: "1", payment_status: "paid", balance_paid: true, amount_paid_pence: 3590 }), b({ id: "2", payment_status: "paid", balance_paid: true, amount_paid_pence: 3590 }), b({ id: "3", payment_method: "bank_transfer" }), b({ id: "4", created_at: ago(60 * MIN) })];
    const guests = ["1", "2", "3", "4"].map((id) => ({ booking_id: id, name: "G" + id }));
    expect(countedGuests(guests, bookings, NOW).map((g) => g.booking_id)).toEqual(["1", "2", "3"]);
  });
  it("Christmas case: 4 guests, one refunded booking leaves 3", () => {
    const bookings = [b({ id: "1", payment_status: "paid", balance_paid: true, amount_paid_pence: 3590 }), b({ id: "2", payment_status: "paid", balance_paid: true, amount_paid_pence: 3590 }), b({ id: "3", payment_method: "bank_transfer" }), b({ id: "4", payment_status: "refunded", balance_paid: true, amount_paid_pence: 3590 })];
    const guests = ["1", "2", "3", "4"].map((id) => ({ booking_id: id, name: "G" + id }));
    expect(countedGuests(guests, bookings, NOW).map((g) => g.booking_id)).toEqual(["1", "2", "3"]);
  });
});
