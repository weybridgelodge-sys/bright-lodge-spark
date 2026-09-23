import { useEffect, useState } from "react";

// Single source of truth for all lodge events.
// Used by both the homepage Live Events Feed and the /events calendar page.
//
// HOW TO UPDATE: Edit the `events` array below. To add a one-off date, append
// a new entry. Lodge of Instruction sessions come live from the portal's LOI Schedule
// (public_loi_schedule view) via `useEvents()` / `getEventsAsync()`.

export type EventType = "meeting" | "social" | "loi";

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
  social: "Social Event",
  loi: "Lodge of Instruction",
};

export const typeBadgeClass: Record<EventType, string> = {
  meeting: "bg-primary text-primary-foreground",
  social: "bg-accent text-accent-foreground",
  loi: "bg-secondary text-secondary-foreground",
};

/** Fixed, known events. Add new dated entries here. */
const fixedEvents: LodgeEvent[] = [
  {
    title: "Initiation Ceremony",
    date: new Date(2026, 3, 15),
    time: "6.00 pm",
    venue: "Guildford Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    description:
      "Initiation ceremony welcoming a new candidate into Freemasonry — our fifth of the year.",
    highlight: true,
    link: "/bookings",
  },
  {
    title: "Installation Meeting",
    date: new Date(2026, 9, 21),
    time: "Evening",
    venue: "Guildford Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    description: "Installation of the new Worshipful Master for the ensuing year.",
    link: "/bookings",
  },
  {
    title: "Initiation Ceremony",
    date: new Date(2026, 11, 16),
    time: "5.30 pm",
    venue: "Guildford Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    link: "/bookings",
  },
  {
    title: "Weybridge & Astolat Lodges Ladies Festival",
    date: new Date(2026, 7, 22),
    time: "6.30 pm – 1.00 am",
    venue: "Macdonald Frimley Hall Hotel",
    type: "social",
    description:
      "Black Tie evening in aid of Action for Carers Surrey featuring three-course dinner, DJ, Grand Raffle, and more.",
    highlight: true,
    link: "/ladies-festival",
  },


  {
    title: "Super Saturday",
    date: new Date(2026, 8, 12),
    time: "10.00 am",
    venue: "Guildford Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    description:
      "A triple double-passing ceremony — three candidates advanced to the Fellow Craft degree — kicking off the new Masonic season. Open to all Brethren.",
    highlight: true,
    link: "/bookings",
  },
];

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

/** Fetch all events: fixed events + live LOI schedule, sorted ascending by date. */
export async function getEventsAsync(): Promise<LodgeEvent[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("public_loi_schedule")
    .select("title,event_date,time_from,time_to,venue,description");
  if (error) console.error("LOI schedule fetch failed", error);
  const lois = (data ?? []).map(loiRowToEvent).filter((e): e is LodgeEvent => !!e);
  return sortByDate([...fixedEvents, ...lois]);
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
