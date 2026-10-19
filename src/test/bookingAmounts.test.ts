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

import { expectedDiningPence, isStripeBooking } from "../../supabase/functions/_shared/bookingAmounts";

describe("expected amount for non-card dining bookings", () => {
  it("one diner by bank transfer is 3500", () => expect(expectedDiningPence("meeting-and-festive-board", "bank-transfer", 0, 3500)).toBe(3500));
  it("member plus one guest by bank transfer is 7000", () => expect(expectedDiningPence("meeting-and-festive-board", "bank-transfer", 1, 3500)).toBe(7000));
  it("member plus one guest paying on the night is 7000", () => expect(expectedDiningPence("meeting-and-festive-board", "cash-cheque", "1", 3500)).toBe(7000));
  it("meeting only is 0", () => expect(expectedDiningPence("meeting-only", "bank-transfer", 0, 3500)).toBe(0));
  it("apologies is 0", () => expect(expectedDiningPence("apologies", "", 0, 3500)).toBe(0));
  it("card is left to checkout", () => expect(expectedDiningPence("meeting-and-festive-board", "card", 0, 3500)).toBe(0));
});

describe("amount lines only for Stripe bookings", () => {
  it("a bank or pay-on-the-night booking is not a Stripe booking", () => expect(isStripeBooking({ stripe_payment_intent_id: null, stripe_session_id: null })).toBe(false));
  it("a booking with a payment intent is a Stripe booking", () => expect(isStripeBooking({ stripe_payment_intent_id: "pi_1" })).toBe(true));
  it("a booking with only a session is a Stripe booking", () => expect(isStripeBooking({ stripe_session_id: "cs_1" })).toBe(true));
});
