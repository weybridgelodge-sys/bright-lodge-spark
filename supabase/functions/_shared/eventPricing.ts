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
