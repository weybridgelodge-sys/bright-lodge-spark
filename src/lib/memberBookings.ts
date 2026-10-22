// "Book my place" rules: deadline, visibility and the member's own status.
// Raw items come from get_my_bookable_items() (host-unit filtered, module-gated).
import { londonToday } from "../../supabase/functions/_shared/publicEventCalendar";

export const MEMBER_BOOKINGS_MODULE_KEY = "member_bookings";
export const DEFAULT_DEADLINE_DAYS = 7;

export type MemberBookingStatus = "not_booked" | "pending" | "booked" | "waitlisted" | "apologies";
export type RawBooking = {
  status: string | null; method?: string | null; created_at?: string | null;
  /** Meeting bookings only: row id, has a Stripe session, agreed total incl. card fee, hold end. */
  id?: string; card?: boolean; total_pence?: number | null; hold_until?: string | null;
};
export type BookableItem = {
  kind: "meeting" | "event"; id: string; title: string; meeting_type?: string | null;
  event_date: string; price_pence: number | null; child_price_pence?: number | null;
  booking_deadline: string | null; book_path: string; bookings: RawBooking[];
  /** Meetings only: the member's own festive_board_attendance statuses (incl. hand-added rows). */
  register?: string[];
};

export const STATUS_LABEL: Record<MemberBookingStatus, string> = {
  not_booked: "Not booked", pending: "Pending payment", booked: "Booked", waitlisted: "Waitlisted", apologies: "Apologies",
};

/** Stored per-event deadline wins; only a blank one falls back to 7 days before the event. Date-only = end of that day. */
export function effectiveDeadline(stored: string | null | undefined, eventDate: string): Date {
  if (stored && stored.trim()) {
    const s = stored.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59`) : new Date(s);
  }
  const d = new Date(`${eventDate}T23:59:59`);
  d.setDate(d.getDate() - DEFAULT_DEADLINE_DAYS);
  return d;
}

export function isBookingClosed(item: Pick<BookableItem, "booking_deadline" | "event_date">, now = new Date()): boolean {
  return now > effectiveDeadline(item.booking_deadline, item.event_date);
}

/** Past events never show; closed ones stay until the event date has passed. */
export function visibleItems<T extends Pick<BookableItem, "event_date">>(items: T[], now = new Date()): T[] {
  const today = londonToday(now);
  return items.filter((i) => i.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
}

const BOOKED = new Set(["paid", "confirmed", "deposit_paid", "completed"]);
/** festive_attendance_status values: booked/attended = attending (meeting-only too); no_show/cancelled_refunded ignored. */
const REGISTER_ATTENDING = new Set(["booked", "attended"]);

/** Strongest status wins: booked > waitlisted > pending > apologies; refunded/failed/cancelled are ignored.
 *  With no booking-derived status, the member's register row(s) decide. */
export function memberStatus(bookings: RawBooking[], register: string[] = [], now = new Date()): MemberBookingStatus {
  const s = new Set(liveBookings(bookings, now).map((b) => (b.status ?? "").toLowerCase()));
  if ([...s].some((x) => BOOKED.has(x))) return "booked";
  if (s.has("waitlisted")) return "waitlisted";
  if (s.has("pending")) return "pending";
  if (s.has("apologies")) return "apologies";
  const r = new Set(register.map((x) => (x ?? "").toLowerCase()));
  if ([...r].some((x) => REGISTER_ATTENDING.has(x))) return "booked";
  if (r.has("apologies")) return "apologies";
  return "not_booked";
}

export type CardFooter = { kind: "book" } | { kind: "message"; text: string };
export const PENDING_HOLD_MESSAGE = "Your card payment is being held. If it is not completed within the hour the hold is released.";

/** Card footer: status first; the deadline only matters for apologies and not-booked. */
export function cardFooter(status: MemberBookingStatus, closed: boolean): CardFooter {
  switch (status) {
    case "booked": return { kind: "message", text: "You are booked. To change this booking, contact the Secretary." };
    case "waitlisted": return { kind: "message", text: "You are on the waiting list. The Secretary will contact you if a place becomes free." };
    case "pending": return { kind: "message", text: PENDING_HOLD_MESSAGE };
    case "apologies": return closed ? { kind: "message", text: "Your apologies are recorded. To attend, contact the Secretary." } : { kind: "book" };
    default: return closed ? { kind: "message", text: "Booking closed, contact the Secretary." } : { kind: "book" };
  }
}

/** A pending card booking is a Stripe-session booking still "pending". */
export const isPendingCard = (b: RawBooking) =>
  (b.status ?? "").toLowerCase() === "pending" && (b.card === true || (b.method ?? "").toLowerCase() === "card");

/** Pending card bookings whose 60-minute hold has passed are released: they no longer count. */
export function liveBookings(bookings: RawBooking[], now = new Date()): RawBooking[] {
  return bookings.filter((b) => !(isPendingCard(b) && b.hold_until && new Date(b.hold_until).getTime() <= now.getTime()));
}

/** The member's pending card booking that can still be paid (hold not yet expired), if any. */
export function resumableCardBooking(bookings: RawBooking[], now = new Date()): (RawBooking & { id: string; hold_until: string }) | null {
  const b = liveBookings(bookings, now).find((x) => isPendingCard(x) && x.id && x.hold_until);
  return (b as (RawBooking & { id: string; hold_until: string })) ?? null;
}

export type ItemFooter = CardFooter | { kind: "resume"; bookingId: string; totalPence: number | null; holdUntil: string };

/** Full card footer: a live pending card booking offers "Continue to payment"; everything else as cardFooter. */
export function itemFooter(item: Pick<BookableItem, "bookings" | "register" | "booking_deadline" | "event_date">, now = new Date()): { status: MemberBookingStatus; footer: ItemFooter } {
  const status = memberStatus(item.bookings, item.register, now);
  const resume = status === "pending" ? resumableCardBooking(item.bookings, now) : null;
  if (resume) return { status, footer: { kind: "resume", bookingId: resume.id, totalPence: resume.total_pence ?? null, holdUntil: resume.hold_until } };
  return { status, footer: cardFooter(status, isBookingClosed(item, now)) };
}

/** "Held until HH:MM" in UK time. */
export const heldUntilLabel = (iso: string) =>
  `Held until ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" })}`;
