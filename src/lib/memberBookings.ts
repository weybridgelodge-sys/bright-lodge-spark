// "Book my place" rules: deadline, visibility and the member's own status.
// Raw items come from get_my_bookable_items() (host-unit filtered, module-gated).
import { londonToday } from "../../supabase/functions/_shared/publicEventCalendar";

export const MEMBER_BOOKINGS_MODULE_KEY = "member_bookings";
export const DEFAULT_DEADLINE_DAYS = 7;

export type MemberBookingStatus = "not_booked" | "pending" | "booked" | "waitlisted" | "apologies";
export type RawBooking = { status: string | null; method?: string | null; created_at?: string | null };
export type BookableItem = {
  kind: "meeting" | "event"; id: string; title: string; meeting_type?: string | null;
  event_date: string; price_pence: number | null; child_price_pence?: number | null;
  booking_deadline: string | null; book_path: string; bookings: RawBooking[];
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

/** Strongest status wins: booked > waitlisted > pending > apologies; refunded/failed/cancelled are ignored. */
export function memberStatus(bookings: RawBooking[]): MemberBookingStatus {
  const s = new Set(bookings.map((b) => (b.status ?? "").toLowerCase()));
  if ([...s].some((x) => BOOKED.has(x))) return "booked";
  if (s.has("waitlisted")) return "waitlisted";
  if (s.has("pending")) return "pending";
  if (s.has("apologies")) return "apologies";
  return "not_booked";
}
