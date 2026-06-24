// Single source of truth for all lodge events.
// Used by both the homepage Live Events Feed and the /events calendar page.
//
// HOW TO UPDATE: Edit the `events` array below. To add a one-off date, append
// a new entry. Weekly Lodge of Instruction Thursdays are generated automatically
// by `getRollingLOIs()` — no need to add those manually.

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
    venue: "South West Surrey Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    description:
      "Initiation ceremony welcoming a new candidate into Freemasonry — our fifth of the year.",
    highlight: true,
    link: "/events",
  },
  {
    title: "Installation Meeting",
    date: new Date(2026, 9, 21),
    time: "Evening",
    venue: "South West Surrey Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    description: "Installation of the new Worshipful Master for the ensuing year.",
    link: "/events",
  },
  {
    title: "Initiation Ceremony",
    date: new Date(2026, 11, 16),
    time: "5.30 pm",
    venue: "South West Surrey Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "meeting",
    link: "/events",
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
    venue: "South West Surrey Masonic Centre",
    address: "Hitherbury Close, Guildford GU2 4DR",
    type: "loi",
    description:
      "A triple double-passing ceremony — three candidates advanced to the Fellow Craft degree — kicking off the new Masonic season. Open to all Brethren.",
    highlight: true,
    link: "/events",
  },
];

/**
 * Generate the next `count` Thursday Lodge of Instruction dates from today.
 * Skips the summer break — no LOI sessions resume until Thursday 20 August 2026.
 * Keeps the events feed automatically "live" without manual updates.
 */
export function getRollingLOIs(count = 6): LodgeEvent[] {
  const result: LodgeEvent[] = [];
  const resumeDate = new Date(2026, 7, 20); // Thu 20 Aug 2026
  const d = new Date();
  d.setHours(19, 30, 0, 0);
  const day = d.getDay();
  const diff = (4 - day + 7) % 7 || 7; // next Thursday
  d.setDate(d.getDate() + diff);
  if (d.getTime() < resumeDate.getTime()) {
    d.setFullYear(resumeDate.getFullYear(), resumeDate.getMonth(), resumeDate.getDate());
  }

  for (let i = 0; i < count; i++) {
    const date = new Date(d);
    date.setDate(d.getDate() + i * 7);
    result.push({
      title: "Lodge of Instruction",
      date,
      time: "7.30 pm",
      venue: "South West Surrey Masonic Centre",
      address: "Hitherbury Close, Guildford GU2 4DR",
      type: "loi",
      description: "Weekly rehearsal and ritual practice — visitors welcome by arrangement.",
      link: "/events",
    });
  }
  return result;
}

/** All events (fixed + rolling LOIs), sorted ascending by date. */
export const events: LodgeEvent[] = [...fixedEvents, ...getRollingLOIs(6)].sort(
  (a, b) => a.date.getTime() - b.date.getTime()
);

/** Upcoming events from now (inclusive of today). */
export function getUpcoming(limit?: number): LodgeEvent[] {
  const now = Date.now() - 86_400_000;
  const list = events.filter((e) => e.date.getTime() >= now);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}
