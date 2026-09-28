/** Pure helpers for the journal-entry drill-down view. */
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  stripe_payout: "Stripe payout",
  stripe_receipt: "Stripe receipt",
  charity_collection: "Charity collection",
  charity_donation: "Charity donation",
  subscription_renewal: "Subscription renewal",
  bank_charge: "Bank charge",
  direct_payment: "Direct Payment",
  direct_receipt: "Direct Receipt",
  creditor_recognition: "Creditor invoice",
  creditor_payment: "Creditor payment",
  bank_reconciliation: "Bank reconciliation",
  reserve_allocation: "Reserve allocation",
  gmc_dining_invoice: "Dining invoice",
  general_journal: "General Journal",
  year_close: "Year-end closing journal",
};

export function sourceTypeLabel(t: string | null | undefined): string {
  if (!t) return "Unknown";
  if (SOURCE_TYPE_LABELS[t]) return SOURCE_TYPE_LABELS[t];
  const s = t.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type DrillLine = { id: string; code: string; debit: number; credit: number };

/** Orders lines debits first then by account code, and totals them. */
export function summarizeEntryLines<T extends DrillLine>(lines: T[]) {
  const sorted = [...lines].sort((a, b) => {
    const ad = a.debit > 0 ? 0 : 1;
    const bd = b.debit > 0 ? 0 : 1;
    return ad - bd || a.code.localeCompare(b.code, undefined, { numeric: true });
  });
  const debit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  return { lines: sorted, debit, credit, balanced: debit === credit, difference: Math.abs(debit - credit) };
}
