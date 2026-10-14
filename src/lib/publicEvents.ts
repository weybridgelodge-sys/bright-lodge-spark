import { supabase } from "@/integrations/supabase/client";

export type PublicEvent = {
  id: string;
  slug: string;
  public_title: string;
  name: string;
  tagline: string | null;
  intro_copy: string | null;
  theme: "christmas" | "default";
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  booking_deadline: string | null;
  capacity: number | null;
  adult_price_pence: number | null;
  child_price_pence: number | null;
  hosting_lodges: string[];
  highlights: string[];
  dress_code: string | null;
  seats_taken: number;
  useful_stuff: { parking?: string; timings?: string; access?: string };
  menu_items: string[];
  dietary_choices: string[];
};

export const DEFAULT_VENUE = "Guildford Masonic Centre, Hitherbury Close, Guildford GU2 4DR";
export const CHILD_MAX_AGE = 12;
export const STATEMENT_DESCRIPTOR_MAX = 22;

/** Total in pence: adults × adult price + children × child price. */
export function calcEventTotalPence(adults: number, children: number, adultPence: number | null, childPence: number | null): number {
  return Math.max(0, adults) * (adultPence ?? 0) + Math.max(0, children) * (childPence ?? 0);
}

/** Children are aged 12 and under. */
export function isChildAge(age: number | null | undefined): boolean {
  return typeof age === "number" && age >= 0 && age <= CHILD_MAX_AGE;
}

export function isValidStatementDescriptor(s: string | null | undefined): boolean {
  return !s || s.length <= STATEMENT_DESCRIPTOR_MAX;
}

export type BookingState = "open" | "prices_pending" | "closed" | "sold_out";

/** Booking stays disabled while either price is empty. Children count toward capacity. */
export function eventBookingState(
  ev: Pick<PublicEvent, "adult_price_pence" | "child_price_pence" | "booking_deadline" | "capacity" | "seats_taken" | "event_date">,
  now: Date = new Date(),
  requested = 0,
): BookingState {
  if (ev.adult_price_pence == null || ev.child_price_pence == null) return "prices_pending";
  const deadline = ev.booking_deadline ? new Date(ev.booking_deadline) : new Date(`${ev.event_date}T23:59:59`);
  if (now > deadline) return "closed";
  if (ev.capacity != null && ev.seats_taken + Math.max(requested, 1) > ev.capacity) return "sold_out";
  return "open";
}

export function seatsLeft(ev: Pick<PublicEvent, "capacity" | "seats_taken">): number | null {
  return ev.capacity == null ? null : Math.max(0, ev.capacity - ev.seats_taken);
}

export const formatGBP = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export function formatEventDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}.${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

function normalise(r: any): PublicEvent {
  return { ...r, highlights: Array.isArray(r.highlights) ? r.highlights.map(String) : [], hosting_lodges: r.hosting_lodges ?? [], useful_stuff: r.useful_stuff ?? {}, menu_items: Array.isArray(r.menu_items) ? r.menu_items.map(String) : [], dietary_choices: Array.isArray(r.dietary_choices) ? r.dietary_choices.map(String) : [] };
}

export async function fetchPublicEvents(): Promise<PublicEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await (supabase as any).from("public_events").select("*").gte("event_date", today).order("event_date");
  return ((data as any[]) ?? []).map(normalise);
}

export async function fetchPublicEvent(slug: string): Promise<PublicEvent | null> {
  const { data } = await (supabase as any).from("public_events").select("*").eq("slug", slug).maybeSingle();
  return data ? normalise(data) : null;
}

/** What still blocks publishing: both prices, start/end times and a slug; archived events never publish. */
export function publishBlockers(ev: {
  adult_price_pence: number | null; child_price_pence: number | null; start_time: string | null; end_time: string | null;
  slug: string | null; archived_at?: string | null;
}): string[] {
  const out: string[] = [];
  if (ev.adult_price_pence == null) out.push("adult price");
  if (ev.child_price_pence == null) out.push("child price");
  if (!ev.start_time) out.push("start time");
  if (!ev.end_time) out.push("end time");
  if (!ev.slug) out.push("page slug");
  if (ev.archived_at) out.push("restore from archive");
  return out;
}

/** Public list never shows archived or unpublished events. */
export function isPubliclyVisible(ev: { is_public: boolean; archived_at?: string | null; slug: string | null }): boolean {
  return ev.is_public && !ev.archived_at && !!ev.slug;
}

/** Delete is only allowed when an event has no bookings. */
export const canDeleteEvent = (bookingCount: number) => bookingCount === 0;
