import { describe, expect, it } from "vitest";
import { bookingAmountLines, eventLabelWithoutDate, isExpiryCandidate } from "../../supabase/functions/_shared/bookingAmounts";

describe("booking amount lines", () => {
  it("shows base, fee and total when the card fee was taken", () => {
    expect(bookingAmountLines(3500, 90, 3590)).toEqual([
      { label: "Base price", value: "£35.00" },
      { label: "Card processing fee", value: "£0.90" },
      { label: "Total", value: "£35.90" },
    ]);
  });
  it("shows no fee line when the fee was declined", () => {
    expect(bookingAmountLines(3500, 0, 3500)).toEqual([{ label: "Total", value: "£35.00" }]);
  });
});

describe("event line date", () => {
  it("drops the trailing date when a Date line follows", () => {
    expect(eventLabelWithoutDate("Installation Meeting — 21 October 2026", true)).toBe("Installation Meeting");
  });
  it("keeps the date when there is no Date line", () => {
    expect(eventLabelWithoutDate("Installation Meeting — 21 October 2026", false)).toBe("Installation Meeting — 21 October 2026");
  });
});

describe("waitlist cleanup candidates", () => {
  it("includes an unpaid waitlisted card booking", () => {
    expect(isExpiryCandidate({ payment_status: "waitlisted", stripe_session_id: "cs_test_a", paid_at: null })).toBe(true);
  });
  it("never includes a waitlisted booking that has paid", () => {
    expect(isExpiryCandidate({ payment_status: "waitlisted", stripe_session_id: "cs_test_a", paid_at: "2026-10-19T10:00:00Z" })).toBe(false);
  });
  it("ignores a waitlisted booking with no card session", () => {
    expect(isExpiryCandidate({ payment_status: "waitlisted", stripe_session_id: null, paid_at: null })).toBe(false);
  });
});
