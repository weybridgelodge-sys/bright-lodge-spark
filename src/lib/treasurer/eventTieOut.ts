// Event Accounts subledger: income actuals come from paid bookings, Stripe fees from
// the events-account balance transactions, and the bank side from Lloyds (1000) lines
// tagged to the event. Event money is held for others (2300) — never lodge income.

export type TieOutBooking = {
  payment_method?: string | null;
  payment_status?: string | null;
  balance_paid?: boolean | null;
  subtotal_pence?: number | null;
  fee_pence?: number | null;
  total_pence?: number | null;
  stripe_payment_intent_id?: string | null;
  stripe_fee_pence?: number | null;
  stripe_other_fees_pence?: number | null;
};

export type TieOutBankLine = { account_code: string | null | undefined; debit_pence: number; credit_pence: number };

/** Cash/cheque/other exceptions marked paid by the Treasurer; everything else is paid through Stripe. */
export const isOfflineMethod = (m?: string | null) => !m || m === "manual" || m === "cash" || m === "cheque";

export const isPaidBooking = (b: TieOutBooking) => b.payment_status === "paid" || (b.balance_paid === true && b.payment_status !== "refunded");

export const bookingFee = (b: TieOutBooking) => b.fee_pence ?? 0;
/** Ticket amount; older rows without a stored subtotal fall back to total − fee. */
export const bookingSubtotal = (b: TieOutBooking) => b.subtotal_pence ?? Math.max(0, (b.total_pence ?? 0) - bookingFee(b));
export const bookingStripeFees = (b: TieOutBooking) => (b.stripe_fee_pence ?? 0) + (b.stripe_other_fees_pence ?? 0);

export function eventActuals(bookings: TieOutBooking[]) {
  const paid = bookings.filter(isPaidBooking);
  const online = paid.filter((b) => !isOfflineMethod(b.payment_method));
  return {
    ticketSales: paid.reduce((s, b) => s + bookingSubtotal(b), 0),
    feeContributions: paid.reduce((s, b) => s + bookingFee(b), 0),
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
  const paid = bookings.filter(isPaidBooking);
  const online = paid.filter((b) => !isOfflineMethod(b.payment_method));
  const offline = paid.filter((b) => isOfflineMethod(b.payment_method));
  const onlineReceived = online.reduce((s, b) => s + bookingSubtotal(b) + bookingFee(b), 0);
  const cashReceived = offline.reduce((s, b) => s + bookingSubtotal(b) + bookingFee(b), 0);
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
