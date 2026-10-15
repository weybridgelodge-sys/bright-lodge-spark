import { describe, expect, it } from "vitest";
import { bookingPaidState, depositPence, ONE_THIRD_PERCENT, orderTotalPence, quoteBalance, quoteBooking } from "@/lib/eventPricing";
import { calcEventTotalPence } from "@/lib/publicEvents";
import { eventFeePence, type EventPayMethod } from "@/lib/cardFee";

const methods: EventPayMethod[] = ["card", "pay_by_bank", "bank_transfer"];

describe("order total", () => {
  it("tickets only matches the existing simple-event total", () => {
    expect(orderTotalPence(2, 3, 4000, 1500)).toBe(calcEventTotalPence(2, 3, 4000, 1500));
  });
  it("includes drinks lines (deposit is on the whole order)", () => {
    expect(orderTotalPence(2, 0, 7500, 0, [{ unitPence: 2500, qty: 2 }, { unitPence: 1000, qty: 3 }])).toBe(23000);
  });
  it("ignores negative quantities", () => expect(orderTotalPence(-1, 0, 7500, 0, [{ unitPence: 1000, qty: -2 }])).toBe(0));
});

describe("deposit", () => {
  it("one third of £150 is £50", () => expect(depositPence(15000, ONE_THIRD_PERCENT)).toBe(5000));
  it("one third rounds up to the next penny", () => expect(depositPence(10000, ONE_THIRD_PERCENT)).toBe(3334));
  it("25% of £230", () => expect(depositPence(23000, 25)).toBe(5750));
  it("zero percent = no deposit", () => expect(depositPence(15000, 0)).toBe(0));
  it("100% or more = whole order", () => expect(depositPence(15000, 120)).toBe(15000));
});

describe("simple events (pay in full) are unchanged", () => {
  for (const m of methods) for (const cover of [true, false]) {
    it(`${m}, cover=${cover}: total = subtotal + existing fee`, () => {
      const q = quoteBooking({ orderPence: 4000, plan: "full", method: m, coverFee: cover });
      expect(q.chargePence).toBe(4000);
      expect(q.feePence).toBe(eventFeePence(4000, m, cover));
      expect(q.totalNowPence).toBe(4000 + eventFeePence(4000, m, cover));
      expect(q.balanceAfterPence).toBe(0);
      expect(q.kind).toBe("full");
    });
  }
  it("card £40 with fee = £41.00", () => expect(quoteBooking({ orderPence: 4000, plan: "full", method: "card", coverFee: true }).totalNowPence).toBe(4100));
});

describe("deposit booking", () => {
  it("card fee is charged on the deposit only", () => {
    const q = quoteBooking({ orderPence: 15000, plan: "deposit", depositPercent: ONE_THIRD_PERCENT, method: "card", coverFee: true });
    expect(q.chargePence).toBe(5000);
    expect(q.feePence).toBe(120); // 2% of £50 = 100p + 20p
    expect(q.totalNowPence).toBe(5120);
    expect(q.balanceAfterPence).toBe(10000);
    expect(q.kind).toBe("deposit");
  });
  it("bank transfer deposit fee is 1% rounded up", () => {
    expect(quoteBooking({ orderPence: 10000, plan: "deposit", depositPercent: ONE_THIRD_PERCENT, method: "bank_transfer", coverFee: true }).feePence).toBe(34);
  });
  it("a 100% deposit is treated as full payment", () => {
    expect(quoteBooking({ orderPence: 10000, plan: "deposit", depositPercent: 100, method: "card", coverFee: false }).kind).toBe("full");
  });
});

describe("balance", () => {
  it("Pay by Bank balance £100 with fee = £101.20", () => {
    const q = quoteBalance({ balancePence: 10000, method: "pay_by_bank", coverFee: true });
    expect(q.feePence).toBe(120);
    expect(q.totalNowPence).toBe(10120);
    expect(q.balanceAfterPence).toBe(0);
  });
  it("paid only when nothing remains", () => {
    expect(bookingPaidState(15000, 5000)).toEqual({ balancePence: 10000, fullyPaid: false });
    expect(bookingPaidState(15000, 15000)).toEqual({ balancePence: 0, fullyPaid: true });
  });
  it("a refund lowering paid re-opens the balance", () => expect(bookingPaidState(15000, 15000 - 2000).fullyPaid).toBe(false));
});
