import { describe, expect, it } from "vitest";
import {
  allocateReceived, balanceReminderDue, bookingBalanceState, choicesReminderDue, depositAllowed, depositLineName,
  isBalanceToken, isOverdue, planMethods, quoteBalance, quoteBooking, refundSplit, type PaymentRow,
} from "@/lib/eventPricing";
import { eventActuals, eventTieOut } from "@/lib/treasurer/eventTieOut";
import { outstandingBalances } from "@/components/members/treasurer/EventBalancesPanel";

const ev = { payment_mode: "full_or_deposit", deposit_percent: 100 / 3, balance_due_date: "2027-03-01" };
const paid = (kind: PaymentRow["kind"], amount: number, fee = 0, refunded = 0): PaymentRow => ({ kind, amount_pence: amount, fee_pence: fee, refunded_pence: refunded, status: "paid" });

describe("deposit offer", () => {
  it("only on deposit events, before the balance due date", () => {
    expect(depositAllowed(ev, "2027-02-28")).toBe(true);
    expect(depositAllowed(ev, "2027-03-01")).toBe(false);
    expect(depositAllowed({ ...ev, payment_mode: "full" }, "2026-12-01")).toBe(false);
  });
  it("deposits are card / Pay by Bank only", () => {
    expect(planMethods("deposit")).toEqual(["card", "pay_by_bank"]);
    expect(planMethods("full")).toContain("bank_transfer");
  });
  it("one-third on the whole order including drinks, rounded up; fee on the deposit", () => {
    const q = quoteBooking({ orderPence: 10000, plan: "deposit", depositPercent: 100 / 3, method: "card", coverFee: true });
    expect(q.chargePence).toBe(3334);
    expect(q.feePence).toBe(Math.ceil(3334 * 0.02) + 20);
    expect(q.balanceAfterPence).toBe(6666);
    expect(quoteBooking({ orderPence: 9000, plan: "deposit", depositPercent: 100 / 3, method: "pay_by_bank", coverFee: false }).chargePence).toBe(3000);
  });
  it("Stripe deposit line text comes from the event", () => {
    expect(depositLineName(100 / 3, 21300)).toBe("Deposit (33.3% of £213.00)");
    expect(depositLineName(25, 8000)).toBe("Deposit (25% of £80.00)");
  });
  it("balance + fee", () => {
    const q = quoteBalance({ balancePence: 6666, method: "pay_by_bank", coverFee: true });
    expect(q.totalNowPence).toBe(6666 + Math.ceil(6666 * 0.01) + 20);
  });
});

describe("booking state from payments (webhook)", () => {
  it("full payment → paid", () => {
    expect(bookingBalanceState(4000, [paid("full", 4000, 100)])).toMatchObject({ status: "paid", amountPaid: 4000, balanceDue: 0, feesPaid: 100 });
  });
  it("deposit only → deposit_paid with balance open", () => {
    expect(bookingBalanceState(10000, [paid("deposit", 3334, 87)])).toMatchObject({ status: "deposit_paid", amountPaid: 3334, balanceDue: 6666 });
  });
  it("deposit + balance → paid", () => {
    expect(bookingBalanceState(10000, [paid("deposit", 3334), paid("balance", 6666)]).status).toBe("paid");
  });
  it("pending / expired payments do not count", () => {
    const s = bookingBalanceState(10000, [{ ...paid("deposit", 3334), status: "pending" }, { ...paid("balance", 6666), status: "expired" }]);
    expect(s).toMatchObject({ status: "pending", amountPaid: 0, balanceDue: 10000 });
  });
  it("refunding the balance re-opens it", () => {
    expect(bookingBalanceState(10000, [paid("deposit", 3334), paid("balance", 6666, 0, 6666)])).toMatchObject({ status: "deposit_paid", balanceDue: 6666 });
  });
  it("full refund → refunded, never negative", () => {
    expect(bookingBalanceState(10000, [{ ...paid("deposit", 3334, 87, 3421), status: "refunded" }])).toMatchObject({ status: "refunded", amountPaid: 0, feesPaid: 0 });
    expect(bookingBalanceState(10000, [paid("deposit", 3334, 0, 99999)]).amountPaid).toBe(0);
  });
});

describe("refunds come off the order first, fee last", () => {
  it("partial refund is order money", () => expect(refundSplit({ amount_pence: 3334, fee_pence: 87 }, 1000)).toEqual({ orderPence: 1000, feePence: 0 }));
  it("refund beyond the order takes the fee", () => expect(refundSplit({ amount_pence: 3334, fee_pence: 87 }, 3400)).toEqual({ orderPence: 3334, feePence: 66 }));
  it("clamped to what was paid", () => expect(refundSplit({ amount_pence: 100, fee_pence: 10 }, 500)).toEqual({ orderPence: 100, feePence: 10 }));
});

describe("actuals: pro rata ticket / pre-order split", () => {
  it("full payment gives exact figures", () => expect(allocateReceived(12500, 12500, 5000)).toEqual({ tickets: 7500, items: 5000 }));
  it("deposit splits pro rata", () => expect(allocateReceived(3334, 10000, 2500)).toEqual({ tickets: 2500, items: 834 }));
  it("simple paid booking actuals unchanged", () => {
    const card = { payment_method: "card", payment_status: "paid", subtotal_pence: 4000, fee_pence: 100, total_pence: 4100, stripe_payment_intent_id: "pi_1", stripe_fee_pence: 82 };
    expect(eventActuals([card])).toEqual({ ticketSales: 4000, preOrders: 0, feeContributions: 100, stripeFees: 82 });
    expect(eventTieOut([card], [], 0).onlineReceived).toBe(4100);
  });
  it("deposit booking counts money received", () => {
    const dep = { payment_method: "card", payment_status: "deposit_paid", payment_plan: "deposit", subtotal_pence: 10000, items_subtotal_pence: 2500, amount_paid_pence: 3334, fees_paid_pence: 87, stripe_fee_pence: 70 };
    expect(eventActuals([dep])).toEqual({ ticketSales: 2500, preOrders: 834, feeContributions: 87, stripeFees: 70 });
    expect(eventTieOut([dep], [], 0).onlineReceived).toBe(3421);
  });
  it("a pending deposit booking counts nothing", () => {
    expect(eventActuals([{ payment_method: "card", payment_status: "pending", payment_plan: "deposit", subtotal_pence: 10000 }]).ticketSales).toBe(0);
  });
});

describe("reminders send once, 14 and 3 days before", () => {
  const none = new Set<string>();
  it("nothing more than 14 days out", () => expect(balanceReminderDue("2027-03-01", "2027-02-14", none)).toBeNull());
  it("14-day reminder in the window", () => expect(balanceReminderDue("2027-03-01", "2027-02-15", none)).toBe("balance_14d"));
  it("not twice", () => expect(balanceReminderDue("2027-03-01", "2027-02-16", new Set(["balance_14d"]))).toBeNull());
  it("3-day reminder", () => expect(balanceReminderDue("2027-03-01", "2027-02-26", new Set(["balance_14d"]))).toBe("balance_3d"));
  it("missed 14-day run catches up with only the 3-day one", () => expect(balanceReminderDue("2027-03-01", "2027-02-27", none)).toBe("balance_3d"));
  it("never after the due date (overdue is flagged only)", () => {
    expect(balanceReminderDue("2027-03-01", "2027-03-02", none)).toBeNull();
    expect(isOverdue("2027-03-01", "2027-03-02", 100)).toBe(true);
    expect(isOverdue("2027-03-01", "2027-03-01", 100)).toBe(false);
    expect(isOverdue("2027-03-01", "2027-03-05", 0)).toBe(false);
  });
  it("choices reminder once within 14 days", () => {
    expect(choicesReminderDue("2027-03-01", "2027-02-20", none)).toBe(true);
    expect(choicesReminderDue("2027-03-01", "2027-02-20", new Set(["choices"]))).toBe(false);
    expect(choicesReminderDue("2027-03-01", "2027-01-01", none)).toBe(false);
  });
});

describe("balance link tokens", () => {
  it("accepts only 43-char base64url tokens", () => {
    expect(isBalanceToken("A".repeat(43))).toBe(true);
    expect(isBalanceToken("A".repeat(42))).toBe(false);
    expect(isBalanceToken("A".repeat(42) + "/")).toBe(false);
    expect(isBalanceToken("00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isBalanceToken(undefined)).toBe(false);
  });
});

describe("Balances outstanding list", () => {
  it("lists only deposit bookings with money still owed", () => {
    const rows = [
      { id: "a", payer_name: "A", payment_plan: "deposit", payment_status: "deposit_paid", balance_due_pence: 500 },
      { id: "b", payer_name: "B", payment_plan: "deposit", payment_status: "paid", balance_due_pence: 0 },
      { id: "c", payer_name: "C", payment_plan: "full", payment_status: "pending", balance_due_pence: 7160 },
      { id: "d", payer_name: "D", payment_plan: "deposit", payment_status: "pending", balance_due_pence: 9000 },
    ];
    expect(outstandingBalances(rows).map((r) => r.id)).toEqual(["a"]);
  });
});
