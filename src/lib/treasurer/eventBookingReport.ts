// Treasurer event account: which bookings count as paid, which are awaiting payment,
// and how the stored lodge value is shown. Display only; never rewrites rows or figures.
import { eventLodgeOptions, matchLodgeOption, GUEST_LODGE, OTHER_LODGE } from "@/lib/eventLodges";

export type ReportBooking = {
  payment_status?: string | null; payment_method?: string | null; created_at?: string | null;
  deposit_paid: boolean; balance_paid: boolean; deposit_pence: number; balance_pence: number;
  total_pence?: number | null; amount_paid_pence?: number | null; ticket_count: number;
};
export type ReportGroup = "paid" | "awaiting" | "hidden";

const HOLD_MS = 30 * 60 * 1000;

/** Unpaid card / Pay by Bank holds lapse after 30 minutes (same rule as the booking list and checkout). */
export const isLapsedHold = (b: ReportBooking, now = Date.now()) =>
  b.payment_status === "pending" && b.payment_method !== "bank_transfer" && !!b.created_at && now - new Date(b.created_at).getTime() > HOLD_MS;

export const moneyReceived = (b: ReportBooking) => b.deposit_paid || b.balance_paid || (b.amount_paid_pence ?? 0) > 0;

/**
 * paid      = any money received (paid, deposit_paid, refunded, or a manual row ticked paid).
 * hidden    = cancelled, expired, or a lapsed unpaid card/Pay by Bank hold, with no money received.
 * awaiting  = everything else, including pending, missing or unknown status.
 */
export function reportGroup(b: ReportBooking, now = Date.now()): ReportGroup {
  if (moneyReceived(b)) return "paid";
  const s = (b.payment_status ?? "").toLowerCase();
  if (s === "cancelled" || s === "expired" || isLapsedHold(b, now)) return "hidden";
  return "awaiting";
}

/** Tickets counted in the PDF total: only bookings in the paid group whose status is not refunded. */
export const paidTicketTotal = (rows: ReportBooking[], now = Date.now()) =>
  rows.filter((b) => reportGroup(b, now) === "paid" && b.payment_status !== "refunded").reduce((s, b) => s + (b.ticket_count ?? 0), 0);

export function statusLabel(b: ReportBooking): string {
  switch (b.payment_status) {
    case "paid": return "Paid";
    case "deposit_paid": return "Deposit paid";
    case "refunded": return "Refunded";
    case "pending": return b.payment_method === "bank_transfer" ? "Awaiting bank transfer" : "Pending";
    case "cancelled": return "Cancelled";
    case "expired": return "Expired";
    default:
      if (b.deposit_paid && b.balance_paid) return "Paid";
      if (b.balance_paid) return "Paid";
      if (b.deposit_paid) return "Deposit paid";
      return "Awaiting payment";
  }
}

export const amountDue = (b: ReportBooking) => Math.max(0, (b.total_pence ?? (b.deposit_pence + b.balance_pence)) - (b.amount_paid_pence ?? 0));

/** Stored lodge_label -> display text. Legacy short values match the event's lodges; unmatched shows as stored. */
export function lodgeDisplay(stored: string | null | undefined, hostingLodges: readonly unknown[] | null | undefined, owningLodge?: string | null): string {
  const raw = (stored ?? "").trim();
  if (!raw) return "";
  const m = matchLodgeOption(raw, eventLodgeOptions(hostingLodges, owningLodge));
  if (m === GUEST_LODGE) return "Guest / not a Freemason";
  if (m === OTHER_LODGE) return "Another lodge";
  return m ?? raw;
}

/** jsPDF's built-in Helvetica draws WinAnsi only; anything else prints as junk (e.g. the old tick). */
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export const isPdfSafe = (s: string) => [...s].every((c) => {
  const n = c.codePointAt(0)!;
  return n === 10 || (n >= 32 && n <= 126) || (n >= 160 && n <= 255) || WIN_ANSI_EXTRA.includes(c);
});
/** Replace characters the PDF font cannot draw (guest-entered text). */
export const pdfSafe = (s: string) => [...s].map((c) => (isPdfSafe(c) ? c : "?")).join("");

/**
 * Headcount/catering: a booking counts unless reportGroup says "hidden", and a refunded
 * booking never counts — the guest is not attending, even though money was recorded.
 * Status is compared trimmed and lower-case, exactly as reportGroup does.
 */
export const countsForHeadcount = (b: ReportBooking, now = Date.now()) => {
  if ((b.payment_status ?? "").trim().toLowerCase() === "refunded") return false;
  return reportGroup(b, now) !== "hidden";
};
/** Guests whose booking counts for headcount and catering. */
export function countedGuests<G extends { booking_id: string }>(guests: G[], bookings: (ReportBooking & { id: string })[], now = Date.now()): G[] {
  const ok = new Set(bookings.filter((b) => countsForHeadcount(b, now)).map((b) => b.id));
  return guests.filter((g) => ok.has(g.booking_id));
}
