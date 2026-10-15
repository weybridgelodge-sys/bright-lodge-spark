// Single pure pricing rule for public event bookings: order items, deposit, balance and fee.
// Plain TypeScript with no runtime imports beyond cardFee so browser and backend functions share it.
// Simple events use payment plan "full" and produce exactly subtotal + optional processing fee.
import { eventFeePence, type EventPayMethod } from "./cardFee.ts";

export type PaymentPlan = "full" | "deposit";
export type PaymentKind = "full" | "deposit" | "balance";

/** One-third deposit preset, expressed as a percentage. */
export const ONE_THIRD_PERCENT = 100 / 3;

export type OrderLine = { unitPence: number; qty: number };

/** Whole-order value: tickets plus any extra lines (e.g. drinks). Negative quantities count as zero. */
export function orderTotalPence(
  adults: number, children: number, adultPence: number | null, childPence: number | null, extras: OrderLine[] = [],
): number {
  const tickets = Math.max(0, adults) * (adultPence ?? 0) + Math.max(0, children) * (childPence ?? 0);
  return tickets + extras.reduce((s, l) => s + Math.max(0, l.qty) * Math.max(0, l.unitPence), 0);
}

/** Deposit on the whole order, rounded up to the next penny; never more than the order. */
export function depositPence(orderPence: number, percent: number): number {
  if (orderPence <= 0 || !(percent > 0)) return 0;
  if (percent >= 100) return orderPence;
  // Round to 6dp first so float noise (e.g. 9000 x 33.333%) never adds an extra penny.
  return Math.min(orderPence, Math.ceil(Number((orderPence * percent / 100).toFixed(6))));
}

export type PaymentQuote = {
  kind: PaymentKind;
  orderPence: number;
  /** Amount of the order being paid now, before any fee. */
  chargePence: number;
  feePence: number;
  /** What the booker pays now: chargePence + feePence. */
  totalNowPence: number;
  /** Order still owed after this payment (excluding future fees). */
  balanceAfterPence: number;
};

/** Quote for the first payment at booking time. */
export function quoteBooking(opts: {
  orderPence: number; plan: PaymentPlan; depositPercent?: number | null;
  method: EventPayMethod; coverFee: boolean;
}): PaymentQuote {
  const order = Math.max(0, opts.orderPence);
  const charge = opts.plan === "deposit" ? depositPence(order, opts.depositPercent ?? 0) : order;
  const fee = eventFeePence(charge, opts.method, opts.coverFee);
  return {
    kind: opts.plan === "deposit" && charge < order ? "deposit" : "full",
    orderPence: order, chargePence: charge, feePence: fee, totalNowPence: charge + fee, balanceAfterPence: order - charge,
  };
}

/** Quote for paying an outstanding balance. Balances are card / Pay by Bank only. */
export function quoteBalance(opts: { balancePence: number; method: Exclude<EventPayMethod, "bank_transfer">; coverFee: boolean }): PaymentQuote {
  const charge = Math.max(0, opts.balancePence);
  const fee = eventFeePence(charge, opts.method, opts.coverFee);
  return { kind: "balance", orderPence: charge, chargePence: charge, feePence: fee, totalNowPence: charge + fee, balanceAfterPence: 0 };
}

/** Booking state after a payment: paid only when nothing remains. */
export function bookingPaidState(orderPence: number, paidPence: number): { balancePence: number; fullyPaid: boolean } {
  const balance = Math.max(0, orderPence - Math.max(0, paidPence));
  return { balancePence: balance, fullyPaid: balance === 0 };
}

// ---------- Stage 4: deposits, balances, refunds ----------

/** Deposit is offered only on deposit-enabled events, strictly before the balance due date (YYYY-MM-DD). */
export function depositAllowed(ev: { payment_mode?: string | null; deposit_percent?: number | null; balance_due_date?: string | null }, todayIso: string): boolean {
  return ev.payment_mode === "full_or_deposit" && Number(ev.deposit_percent) > 0 && !!ev.balance_due_date && todayIso < ev.balance_due_date;
}

/** Methods allowed for a plan: deposits and balances are card / Pay by Bank only. */
export function planMethods(plan: PaymentPlan): EventPayMethod[] {
  return plan === "deposit" ? ["card", "pay_by_bank"] : ["card", "pay_by_bank", "bank_transfer"];
}

const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;
/** Percent as entered by officers, e.g. 33.333 → "33.3%", 25 → "25%". */
export const percentLabel = (percent: number) => `${Number(percent.toFixed(1))}%`;
export const depositLineName = (percent: number, orderPence: number) => `Deposit (${percentLabel(percent)} of ${gbp(orderPence)})`;

export type PaymentRow = { kind: PaymentKind; amount_pence: number; fee_pence: number; refunded_pence?: number | null; status: string };

/** Refunds come off the order amount first and the fee contribution last. */
export function refundSplit(p: Pick<PaymentRow, "amount_pence" | "fee_pence">, refundedPence: number) {
  const r = Math.max(0, Math.min(refundedPence, p.amount_pence + p.fee_pence));
  const order = Math.min(r, p.amount_pence);
  return { orderPence: order, feePence: r - order };
}

export type BalanceStatus = "pending" | "deposit_paid" | "paid" | "refunded";

/** Booking money state from its payments. Only paid (incl. later-refunded) payments count. */
export function bookingBalanceState(orderPence: number, payments: PaymentRow[]) {
  let amountPaid = 0, feesPaid = 0, refunded = 0;
  for (const p of payments) {
    if (p.status !== "paid" && p.status !== "refunded") continue;
    const s = refundSplit(p, p.refunded_pence ?? 0);
    amountPaid += p.amount_pence - s.orderPence;
    feesPaid += p.fee_pence - s.feePence;
    refunded += s.orderPence + s.feePence;
  }
  const balanceDue = Math.max(0, orderPence - amountPaid);
  const status: BalanceStatus = amountPaid > 0 && balanceDue === 0 ? "paid"
    : amountPaid > 0 ? "deposit_paid" : refunded > 0 ? "refunded" : "pending";
  return { amountPaid, feesPaid, refundedPence: refunded, balanceDue, status, overpaid: Math.max(0, amountPaid - orderPence) };
}

/** Split order money received pro rata between tickets and pre-orders (full payments give exact figures). */
export function allocateReceived(receivedPence: number, orderPence: number, itemsPence: number) {
  if (orderPence <= 0 || receivedPence <= 0) return { tickets: 0, items: 0 };
  const items = Math.round(receivedPence * Math.max(0, itemsPence) / orderPence);
  return { tickets: receivedPence - items, items };
}

const dayMs = 86400000;
export const daysUntil = (dueIso: string, todayIso: string) => Math.round((Date.parse(`${dueIso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / dayMs);
export const isOverdue = (dueIso: string | null | undefined, todayIso: string, balancePence: number) => !!dueIso && balancePence > 0 && todayIso > dueIso;

export type ReminderKind = "balance_14d" | "balance_3d" | "choices";
/** Which balance reminder (if any) is due today. At 3 days or fewer only the 3-day one is sent. Never after the due date. */
export function balanceReminderDue(dueIso: string, todayIso: string, sent: ReadonlySet<string>): ReminderKind | null {
  const d = daysUntil(dueIso, todayIso);
  if (d < 0) return null;
  if (d <= 3) return sent.has("balance_3d") ? null : "balance_3d";
  if (d <= 14) return sent.has("balance_14d") || sent.has("balance_3d") ? null : "balance_14d";
  return null;
}
/** Course-choice reminder window: from 14 days before the deadline (balance due date, else event date). */
export function choicesReminderDue(deadlineIso: string, todayIso: string, sent: ReadonlySet<string>): boolean {
  const d = daysUntil(deadlineIso, todayIso);
  return d >= 0 && d <= 14 && !sent.has("choices");
}

/** Balance link token format: 43-char base64url (32 random bytes). */
export const isBalanceToken = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
