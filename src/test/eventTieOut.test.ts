import { describe, it, expect } from "vitest";
import { eventActuals, eventTieOut, defaultTicketPlan } from "@/lib/treasurer/eventTieOut";

const card = { payment_method: "card", payment_status: "paid", subtotal_pence: 4000, fee_pence: 100, total_pence: 4100, stripe_payment_intent_id: "pi_1", stripe_fee_pence: 82 };

describe("event subledger", () => {
  it("income actuals come from paid bookings, not ledger lines", () => {
    const a = eventActuals([card, { ...card, payment_status: "pending" }]);
    expect(a).toEqual({ ticketSales: 4000, feeContributions: 100, stripeFees: 82 });
  });

  it("old rows without subtotal fall back to total minus fee", () => {
    expect(eventActuals([{ payment_method: "bank_transfer", payment_status: "paid", total_pence: 4000, fee_pence: 0 }]).ticketSales).toBe(4000);
  });

  it("includes refund and dispute fees in Stripe fees", () => {
    expect(eventActuals([{ ...card, stripe_other_fees_pence: 1500 }]).stripeFees).toBe(1582);
  });

  it("ties out to zero when everything is paid out and banked", () => {
    const t = eventTieOut([card], [{ account_code: "1000", debit_pence: 4018, credit_pence: 0 }], 4018);
    expect(t.stillInStripe).toBe(0);
    expect(t.unexplained).toBe(0);
  });

  it("money still in Stripe is explained, not a gap", () => {
    const t = eventTieOut([card], [], 0);
    expect(t.stillInStripe).toBe(4018);
    expect(t.unexplained).toBe(0);
  });

  it("allocated payout not yet tagged in Lloyds is explained", () => {
    const t = eventTieOut([card], [], 4018);
    expect(t.payoutsNotYetInBank).toBe(4018);
    expect(t.unexplained).toBe(0);
  });

  it("cash marked paid but not banked is awaiting banking; never shown as in the bank", () => {
    const cash = { payment_method: "manual", payment_status: "paid", subtotal_pence: 3000, fee_pence: 0, total_pence: 3000 };
    const t = eventTieOut([cash], [], 0);
    expect(t.bankReceipts).toBe(0);
    expect(t.cashAwaitingBanking).toBe(3000);
    expect(t.unexplained).toBe(0);
    const banked = eventTieOut([cash], [{ account_code: "1000", debit_pence: 3000, credit_pence: 0 }], 0);
    expect(banked.cashAwaitingBanking).toBe(0);
    expect(banked.unexplained).toBe(0);
  });

  it("vendor payments out of Lloyds don't reduce receipts", () => {
    const t = eventTieOut([card], [{ account_code: "1000", debit_pence: 4018, credit_pence: 0 }, { account_code: "1000", debit_pence: 0, credit_pence: 2000 }], 4018);
    expect(t.bankReceipts).toBe(4018);
    expect(t.unexplained).toBe(0);
  });

  it("extra unexplained bank money shows as a negative gap", () => {
    expect(eventTieOut([], [{ account_code: "1000", debit_pence: 500, credit_pence: 0 }], 0).unexplained).toBe(-500);
  });

  it("missing Stripe fees are counted", () => {
    expect(eventTieOut([{ ...card, stripe_fee_pence: null }], [], 0).feesMissing).toBe(1);
  });

  it("default ticket plan is adult price × capacity", () => {
    expect(defaultTicketPlan(4000, 100)).toBe(400000);
    expect(defaultTicketPlan(null, 100)).toBe(0);
  });
});
