// Event Accounts subledger: income actuals come from paid bookings, Stripe fees from
// the events-account balance transactions, and the bank side from Lloyds (1000) lines
// tagged to the event. Event money is held for others (2300) — never lodge income.
// Deposit bookings (and any refunded booking) count the money actually received, from the
// payment ledger roll-up on the booking; untouched full payments use their subtotal as before.
import { allocateReceived } from "@/lib/eventPricing";

export type TieOutBooking = {
  payment_method?: string | null;
  payment_status?: string | null;
  balance_paid?: boolean | null;
  subtotal_pence?: number | null;
  fee_pence?: number | null;
  total_pence?: number | null;
  items_subtotal_pence?: number | null;
  stripe_payment_intent_id?: string | null;
  stripe_fee_pence?: number | null;
  stripe_other_fees_pence?: number | null;
  payment_plan?: string | null;
  amount_paid_pence?: number | null;
  fees_paid_pence?: number | null;
  refunded_pence?: number | null;
};

export type TieOutBankLine = { account_code: string | null | undefined; debit_pence: number; credit_pence: number };

/** Cash/cheque/other exceptions marked paid by the Treasurer; everything else is paid through Stripe. */
export const isOfflineMethod = (m?: string | null) => !m || m === "manual" || m === "cash" || m === "cheque";

export const isPaidBooking = (b: TieOutBooking) => b.payment_status === "paid" || (b.balance_paid === true && b.payment_status !== "refunded");

export const bookingFee = (b: TieOutBooking) => b.fee_pence ?? 0;
/** Ticket amount; older rows without a stored subtotal fall back to total − fee. */
export const bookingSubtotal = (b: TieOutBooking) => b.subtotal_pence ?? Math.max(0, (b.total_pence ?? 0) - bookingFee(b));
/** Pre-ordered drinks/vouchers within the subtotal (0 for simple events). */
export const bookingItems = (b: TieOutBooking) => Math.max(0, b.items_subtotal_pence ?? 0);
export const bookingStripeFees = (b: TieOutBooking) => (b.stripe_fee_pence ?? 0) + (b.stripe_other_fees_pence ?? 0);

const ledgerTracked = (b: TieOutBooking) => b.payment_plan === "deposit" || (b.refunded_pence ?? 0) > 0;
/** Order money received (excluding fee contributions), net of refunds. */
export const receivedOrder = (b: TieOutBooking) => ledgerTracked(b) ? Math.max(0, b.amount_paid_pence ?? 0) : isPaidBooking(b) ? bookingSubtotal(b) : 0;
/** Fee contributions received, net of any refunded fee. */
export const receivedFee = (b: TieOutBooking) => ledgerTracked(b) ? Math.max(0, b.fees_paid_pence ?? 0) : isPaidBooking(b) ? bookingFee(b) : 0;
/** Any money has come in (paid in full, deposit paid, or partly refunded). */
export const hasReceipts = (b: TieOutBooking) => ledgerTracked(b) ? receivedOrder(b) + receivedFee(b) > 0 || bookingStripeFees(b) > 0 : isPaidBooking(b);

export function eventActuals(bookings: TieOutBooking[]) {
  const paid = bookings.filter(hasReceipts);
  const online = paid.filter((b) => !isOfflineMethod(b.payment_method));
  let ticketSales = 0, preOrders = 0;
  for (const b of paid) {
    // Drinks/vouchers sit in their own Pre-orders line; money received is split pro rata.
    const a = allocateReceived(receivedOrder(b), bookingSubtotal(b), bookingItems(b));
    ticketSales += a.tickets; preOrders += a.items;
  }
  return {
    ticketSales,
    preOrders,
    feeContributions: paid.reduce((s, b) => s + receivedFee(b), 0),
    stripeFees: online.reduce((s, b) => s + bookingStripeFees(b), 0),
  };
}

export type TieOut = {
  onlineReceived: number;
  cashReceived: number;
  stripeFees: number;
  feesMissing: number;
  payoutsAllocated: number;
  bankReceipts: number;
  stillInStripe: number;
  cashAwaitingBanking: number;
  /** Payouts allocated to this event that aren't yet tagged in Lloyds. */
  payoutsNotYetInBank: number;
  /** Should be 0. Positive: money unaccounted for; negative: more in the bank than explained. */
  unexplained: number;
};

export function eventTieOut(bookings: TieOutBooking[], bankLines: TieOutBankLine[], payoutsAllocated: number): TieOut {
  const paid = bookings.filter(hasReceipts);
  const online = paid.filter((b) => !isOfflineMethod(b.payment_method));
  const offline = paid.filter((b) => isOfflineMethod(b.payment_method));
  const onlineReceived = online.reduce((s, b) => s + receivedOrder(b) + receivedFee(b), 0);
  const cashReceived = offline.reduce((s, b) => s + receivedOrder(b) + receivedFee(b), 0);
  const stripeFees = online.reduce((s, b) => s + bookingStripeFees(b), 0);
  const feesMissing = online.filter((b) => b.stripe_payment_intent_id && b.stripe_fee_pence == null).length;
  // Only money INTO Lloyds counts here; vendor payments out (Dr 2300 / Cr 1000) are costs, not receipts.
  const bankReceipts = bankLines.filter((l) => l.account_code === "1000").reduce((s, l) => s + (l.debit_pence ?? 0), 0);
  const stillInStripe = onlineReceived - stripeFees - payoutsAllocated;
  // Bank receipts are matched to allocated payouts first; any remainder is banked cash/cheques.
  const bankBeyondPayouts = Math.max(0, bankReceipts - payoutsAllocated);
  const cashAwaitingBanking = Math.max(0, cashReceived - bankBeyondPayouts);
  const payoutsNotYetInBank = Math.max(0, payoutsAllocated - bankReceipts);
  const unexplained = onlineReceived + cashReceived - stripeFees - bankReceipts - stillInStripe - cashAwaitingBanking - payoutsNotYetInBank;
  return { onlineReceived, cashReceived, stripeFees, feesMissing, payoutsAllocated, bankReceipts, stillInStripe, cashAwaitingBanking, payoutsNotYetInBank, unexplained };
}

/** Default planned ticket sales: adult price × capacity. */
export const defaultTicketPlan = (adultPricePence?: number | null, capacity?: number | null) =>
  adultPricePence && capacity ? adultPricePence * capacity : 0;
