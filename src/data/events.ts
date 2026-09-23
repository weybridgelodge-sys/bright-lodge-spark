import { useEffect, useState } from "react";

// Single source of truth for all lodge events.
// Used by both the homepage Live Events Feed and the /events calendar page.
//
// HOW TO UPDATE: Edit the `events` array below. To add a one-off date, append
// a new entry. Lodge of Instruction sessions come live from the portal's LOI Schedule
// (public_loi_schedule view) via `useEvents()` / `getEventsAsync()`.

export type EventType = "meeting" | "officers" | "social" | "loi";

export interface LodgeEvent {
  title: string;
  date: Date;
  time?: string;
  venue: string;
  address?: string;
  type: EventType;
  description?: string;
  highlight?: boolean;
  link?: string;
}

export const typeLabel: Record<EventType, string> = {
  meeting: "Lodge Meeting",
  officers: "Officers Night",
  social: "Social Event",
  loi: "Lodge of Instruction",
};

export const typeBadgeClass: Record<EventType, string> = {
  meeting: "bg-primary text-primary-foreground",
  officers: "bg-primary/80 text-primary-foreground",
  social: "bg-accent text-accent-foreground",
  loi: "bg-secondary text-secondary-foreground",
};

/** All events are now live from the portal — no hardcoded entries. */
const fixedEvents: LodgeEvent[] = [];

const GMC_ADDRESS = "Hitherbury Close, Guildford GU2 4DR";

function londonParts(iso: string) {
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute };
}

function meetingRowToEvent(r: { title: string | null; event_date: string | null; location: string | null; description: string | null }): LodgeEvent | null {
  if (!r.event_date) return null;
  const { y, m, d, hh, mm } = londonParts(r.event_date);
  const loc = r.location || "Guildford Masonic Centre";
  const isGmc = /guildford masonic centre/i.test(loc);
  return {
    title: r.title || "Lodge Meeting",
    date: new Date(y, m - 1, d, hh, mm),
    time: fmtTime(`${hh}:${String(mm).padStart(2, "0")}`),
    venue: isGmc ? "Guildford Masonic Centre" : loc,
    address: isGmc ? GMC_ADDRESS : undefined,
    type: "meeting",
    description: r.description ?? undefined,
    highlight: true,
    link: "/bookings",
  };
}

function officersRowToEvent(r: { officer_night_date: string | null; venue: string | null }): LodgeEvent | null {
  if (!r.officer_night_date) return null;
  const [y, m, d] = r.officer_night_date.slice(0, 10).split("-").map(Number);
  const venue = r.venue || "Guildford Masonic Centre";
  return {
    title: "Officers Night",
    date: new Date(y, m - 1, d, 19, 0),
    time: "7.00 pm – 9.30 pm",
    venue,
    address: /guildford masonic centre|masonic centre/i.test(venue) ? GMC_ADDRESS : undefined,
    type: "officers",
    description: "Officers rehearsal ahead of the next regular meeting.",
  };
}

function festivalRowToEvent(r: { name: string | null; event_date: string | null }): LodgeEvent | null {
  if (!r.event_date) return null;
  const [y, m, d] = r.event_date.slice(0, 10).split("-").map(Number);
  return {
    title: r.name || "Ladies Festival",
    date: new Date(y, m - 1, d, 18, 30),
    venue: "See event details",
    type: "social",
    highlight: true,
    link: "/ladies-festival",
  };
}

function fmtTime(t: string | null): string | undefined {
  const m = (t ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}.${m[2]} ${suffix}`;
}

/** Map a public_loi_schedule row to the shared LodgeEvent shape. */
function loiRowToEvent(r: {
  title: string | null; event_date: string | null; time_from: string | null;
  time_to: string | null; venue: string | null; description: string | null;
}): LodgeEvent | null {
  if (!r.event_date) return null;
  const [y, mo, d] = r.event_date.split("-").map(Number);
  const [hh, mm] = (r.time_from ?? "19:30").split(":").map(Number);
  const from = fmtTime(r.time_from);
  const to = fmtTime(r.time_to);
  const venue = r.venue || "Guildford Masonic Centre";
  return {
    title: r.title || "Lodge of Instruction",
    date: new Date(y, mo - 1, d, hh || 0, mm || 0),
    time: from && to ? `${from} – ${to}` : from,
    venue,
    address: venue === "Guildford Masonic Centre" ? "Hitherbury Close, Guildford GU2 4DR" : undefined,
    type: "loi",
    description: r.description ?? undefined,
    link: "/events#loi",
  };
}

const sortByDate = (list: LodgeEvent[]) =>
  [...list].sort((a, b) => a.date.getTime() - b.date.getTime());

/** Fetch all live events (published meeting, Officers Nights, LOI, Ladies Festival promo), sorted by date. */
export async function getEventsAsync(): Promise<LodgeEvent[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const sb = supabase as any;
  const [loi, mtg, off, fest] = await Promise.all([
    sb.from("public_loi_schedule").select("title,event_date,time_from,time_to,venue,description"),
    sb.from("public_lodge_meetings").select("title,event_date,location,description"),
    sb.from("public_officers_nights").select("officer_night_date,venue"),
    sb.from("public_ladies_festival_promo").select("name,event_date"),
  ]);
  for (const [n, r] of [["LOI", loi], ["meetings", mtg], ["officers", off], ["festival", fest]] as const) {
    if (r.error) console.error(`${n} fetch failed`, r.error);
  }
  const keep = (e: LodgeEvent | null): e is LodgeEvent => !!e;
  return sortByDate([
    ...fixedEvents,
    ...(loi.data ?? []).map(loiRowToEvent).filter(keep),
    ...(mtg.data ?? []).map(meetingRowToEvent).filter(keep),
    ...(off.data ?? []).map(officersRowToEvent).filter(keep),
    ...(fest.data ?? []).map(festivalRowToEvent).filter(keep),
  ]);
}

/** Shared hook used by the homepage feed and the /events page. */
export function useEvents(): { events: LodgeEvent[]; loading: boolean } {
  const [state, setState] = useState<{ events: LodgeEvent[]; loading: boolean }>({ events: [], loading: true });
  useEffect(() => {
    let alive = true;
    getEventsAsync()
      .catch(() => sortByDate(fixedEvents))
      .then((events) => { if (alive) setState({ events, loading: false }); });
    return () => { alive = false; };
  }, []);
  return state;
}

/** Upcoming events from now (inclusive of today). */
export function filterUpcoming(events: LodgeEvent[], limit?: number): LodgeEvent[] {
  const now = Date.now() - 86_400_000;
  const list = events.filter((e) => e.date.getTime() >= now);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}
