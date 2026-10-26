// Pure iCalendar builder for member-calendar-feed (JOB CJ). Every lodge value
// (event-ID domain, calendar name, venue, file name) is passed in per request;
// nothing here is shared between requests or lodges.
import { matchesPublicCalendarEvent, publicCalendarTimes, upcomingPublicCalendarRows, type PublicCalendarRow } from "../_shared/publicEventCalendar.ts";

/** One lodge's calendar identity, from that lodge's Unit Setup. */
export interface FeedLodge { domain: string; calName: string; venue: string; file: string }

/** Feed identity from lodge settings (same derivation as before JOB CJ, so UIDs do not change). */
export function feedLodgeFrom(lodge: { siteUrl: string; calendarName: string; meetingVenue: string; senderName: string }): FeedLodge {
  return {
    domain: new URL(lodge.siteUrl).host,
    calName: lodge.calendarName,
    venue: lodge.meetingVenue,
    file: lodge.senderName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "calendar",
  };
}

/** archivedKeys is no longer used to hide meetings (JOB DF); kept optional for callers. */
export interface FeedRows { events: any[]; meetings: any[]; socials: any[]; officers: any[]; loi: any[]; publicRows: any[]; archivedKeys?: Set<string> }

const LONDON = "Europe/London";

function pad(n: number) { return String(n).padStart(2, "0"); }

/** UTC-anchored timestamp for DTSTAMP (which must be UTC per RFC 5545). */
function toUtcICS(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** London wall-clock parts for a real instant. Used for timestamptz sources. */
const londonParts = (() => {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  return (d: Date) => {
    const p: Record<string, string> = {};
    for (const part of fmt.formatToParts(d)) if (part.type !== "literal") p[part.type] = part.value;
    // Intl can emit "24" for midnight on some runtimes — normalise to "00".
    const hour = p.hour === "24" ? "00" : p.hour;
    return { y: p.year, m: p.month, d: p.day, hh: hour, mm: p.minute, ss: p.second };
  };
})();

type WallClock = { y: string; m: string; d: string; hh: string; mm: string; ss: string };

/** Local London wall-clock from explicit numeric components (no TZ maths). */
function wall(y: number, m1: number, d: number, hh: number, mm: number, ss = 0): WallClock {
  return { y: String(y), m: pad(m1), d: pad(d), hh: pad(hh), mm: pad(mm), ss: pad(ss) };
}

/** Add hours to a wall-clock. Only used for +2h/+3h event durations that don't cross a DST boundary. */
function addHours(w: WallClock, hours: number): WallClock {
  // Anchor as UTC just for arithmetic, then read the same UTC hands back out.
  const anchor = Date.UTC(Number(w.y), Number(w.m) - 1, Number(w.d), Number(w.hh), Number(w.mm), Number(w.ss));
  const shifted = new Date(anchor + hours * 3600_000);
  return {
    y: String(shifted.getUTCFullYear()),
    m: pad(shifted.getUTCMonth() + 1),
    d: pad(shifted.getUTCDate()),
    hh: pad(shifted.getUTCHours()),
    mm: pad(shifted.getUTCMinutes()),
    ss: pad(shifted.getUTCSeconds()),
  };
}

function fmtWall(w: WallClock): string {
  return `${w.y}${w.m}${w.d}T${w.hh}${w.mm}${w.ss}`;
}

function escText(v: string): string {
  return (v ?? "")
    .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

type CalEvent = {
  uid: string;
  title: string;
  location?: string;
  description?: string;
  start: WallClock;
  end: WallClock;
  url?: string;
  slug?: string;
};

/** Extract London Y-M-D from a date-ish string. For plain "YYYY-MM-DD" we keep the digits;
 * for a full timestamptz we resolve which London day it lands on. */
function londonYMD(iso: string): { y: number; m1: number; d: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return { y, m1: m, d };
  }
  const p = londonParts(new Date(iso));
  return { y: Number(p.y), m1: Number(p.m), d: Number(p.d) };
}

/** Parse a free-text time ("6:15 pm for 6:45 pm", "18:15", "7.30pm") to wall-clock H/M. */
function parseTime(free?: string | null, fallback = { hh: 18, mm: 15 }): { hh: number; mm: number } {
  const s = (free ?? "").toLowerCase().trim();
  if (!s) return fallback;
  const m12 = s.match(/(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)/);
  if (m12) {
    let hh = Number(m12[1]) % 12;
    if (m12[3] === "pm") hh += 12;
    return { hh, mm: Number(m12[2] ?? "0") };
  }
  const m24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) return { hh: Number(m24[1]), mm: Number(m24[2]) };
  return fallback;
}

/** Parse a Postgres time ("19:30:00") to H/M. */
function parseDbTime(t: string | null | undefined, fallback: { hh: number; mm: number }) {
  const m = (t ?? "").match(/^(\d{1,2}):(\d{2})/);
  return m ? { hh: Number(m[1]), mm: Number(m[2]) } : fallback;
}

/** LOI entries from the editable loi_schedule_entries table (London wall-clock). */
function loiFromSchedule(rows: any[], c: FeedLodge): CalEvent[] {
  return rows.map((r) => {
    const ymd = londonYMD(r.event_date as string);
    const f = parseDbTime(r.time_from, { hh: 19, mm: 30 });
    const t = parseDbTime(r.time_to, { hh: 21, mm: 30 });
    return {
      uid: `loi-${r.id}@${c.domain}`,
      title: r.title,
      location: r.venue ?? c.venue,
      description: r.description ?? "",
      start: wall(ymd.y, ymd.m1, ymd.d, f.hh, f.mm),
      end: wall(ymd.y, ymd.m1, ymd.d, t.hh, t.mm),
    };
  });
}

function classifyEventTitle(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("installation")) return `Meeting: ${raw}`;
  if (s.includes("officers night") || s.includes("officers' night") || s.includes("officer night")) return `Officers Night: ${raw}`;
  if (s.includes("initiation") || s.includes("passing") || s.includes("raising") || s.includes("meeting")) return `Meeting: ${raw}`;
  return `Meeting: ${raw}`;
}

/** Static VTIMEZONE for Europe/London. Post-1996 rules; sufficient for any date
 *  a lodge calendar will contain. */
// Property order and parts matter for strict parsers (notably Proton Calendar):
// - LAST-MODIFIED as a validity anchor (RFC 5545 §3.6.5 recommended).
// - RRULE parts in canonical order: FREQ, BYMONTH, BYDAY.
// - Sub-component property order: DTSTART, TZOFFSETFROM, TZOFFSETTO, RRULE, TZNAME.
// - DTSTART inside STANDARD/DAYLIGHT must be *floating* local time (no Z).
const LONDON_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/London",
  "LAST-MODIFIED:20240101T000000Z",
  "X-LIC-LOCATION:Europe/London",
  "BEGIN:STANDARD",
  "DTSTART:19961027T020000",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "TZNAME:GMT",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19960331T010000",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "TZNAME:BST",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];


/** A lodge_events row is public copy only when published and not archived (missing flag = published). */
const eventIsVisible = (ev: any) => ev?.published !== false && !ev?.archived_at;

export function buildFeed(r: FeedRows, c: FeedLodge, now: Date = new Date()): string {
  // JOB DF: every non-cancelled meeting appears (any status, past or future);
  // an archived/unpublished linked event never hides its meeting.
  const cal: CalEvent[] = [];

  const meetingsByKey = new Map<string, any>();
  const unkeyed: any[] = [];
  for (const m of r.meetings) {
    const k = (m as any).event_key;
    if (!k || meetingsByKey.has(k)) { unkeyed.push(m); continue; }
    meetingsByKey.set(k, m);
  }
  for (const e of r.events) {
    const ev = e as any;
    const visible = eventIsVisible(ev);
    const linked = meetingsByKey.get(ev.slug);
    // Hidden (unpublished/archived) events appear only through their linked meeting.
    if (!visible && !linked) continue;
    const ymd = londonYMD(ev.event_date);
    const t = parseTime(ev.tyling_time, { hh: 18, mm: 15 });
    const start = wall(ymd.y, ymd.m1, ymd.d, t.hh, t.mm);
    const end = addHours(start, 3);
    // Unpublished copy (intro) is never included for a hidden event.
    const descParts = [visible ? ev.intro : null, linked?.notes].filter(Boolean);
    cal.push({
      uid: `event-${ev.id}@${c.domain}`,
      title: classifyEventTitle(ev.title),
      location: ev.location ?? c.venue,
      description: descParts.join("\n\n"),
      start, end,
      slug: ev.slug,
    });
    if (linked) meetingsByKey.delete(ev.slug);
  }
  for (const m of unkeyed) meetingsByKey.set(`__fbm_${(m as any).id}`, m);
  for (const [, m] of meetingsByKey) {
    const md = (m as any).meeting_date as string; // YYYY-MM-DD
    const ymd = londonYMD(md);
    const start = wall(ymd.y, ymd.m1, ymd.d, 18, 15);
    const end = addHours(start, 3);
    cal.push({
      uid: `fbm-${(m as any).id}@${c.domain}`,
      title: `Meeting: ${meetingTypeTitle((m as any).meeting_type)}`,
      location: c.venue,
      description: (m as any).notes ?? "",
      start, end,
      slug: (m as any).event_key,
    });
  }

  // Socials — starts_at/ends_at are timestamptz (true instants); render each in London wall-clock.
  for (const s of r.socials) {
    const so = s as any;
    const startInstant = new Date(so.starts_at);
    const p = londonParts(startInstant);
    const start = wall(Number(p.y), Number(p.m), Number(p.d), Number(p.hh), Number(p.mm), Number(p.ss));
    let end: WallClock;
    if (so.ends_at) {
      const q = londonParts(new Date(so.ends_at));
      end = wall(Number(q.y), Number(q.m), Number(q.d), Number(q.hh), Number(q.mm), Number(q.ss));
    } else {
      end = addHours(start, 3);
    }
    cal.push({
      uid: `social-${so.id}@${c.domain}`,
      title: `Social: ${so.title}`,
      location: so.venue ?? "",
      description: so.description ?? "",
      start, end,
    });
  }

  // Officers Night — fixed 19:00–21:30 London wall-clock, independent of the linked meeting time.
  for (const s of r.officers) {
    const so = s as any;
    const ymd = londonYMD(so.officer_night_date as string);
    const start = wall(ymd.y, ymd.m1, ymd.d, 19, 0);
    const end = wall(ymd.y, ymd.m1, ymd.d, 21, 30);
    cal.push({
      uid: `officers-night-${so.id}@${c.domain}`,
      title: "Officers Night: Rehearsal",
      location: so.officer_night_venue ?? c.venue,
      description: "Officers rehearsal ahead of the next regular meeting.",
      start, end,
    });
  }

  for (const l of loiFromSchedule(r.loi, c)) cal.push(l);

  for (const row of upcomingPublicCalendarRows(r.publicRows as PublicCalendarRow[])) {
    const matching = cal.filter((e) => matchesPublicCalendarEvent(row, {
      date: `${e.start.y}-${e.start.m}-${e.start.d}`, title: e.title, slug: e.slug,
    }));
    // Retain an existing UID when replacing a matching record: subscribers update it rather than seeing a new duplicate.
    const uid = matching[0]?.uid ?? `public-event-${row.id}@${c.domain}`;
    for (let i = cal.length - 1; i >= 0; i--) if (matching.includes(cal[i])) cal.splice(i, 1);
    const times = publicCalendarTimes(row);
    const toWall = (value: string) => {
      const [date, time] = value.split("T");
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm, ss] = time.split(":").map(Number);
      return wall(y, m, d, hh, mm, ss);
    };
    const start = toWall(times.start);
    cal.push({
      uid, title: `Social: ${row.public_title}`, start,
      end: times.end ? toWall(times.end) : addHours(start, 3),
      location: row.venue ?? c.venue, description: row.intro_copy ?? "",
      url: `https://${c.domain}/events/${row.slug}`,
    });
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${c.calName.replace(/\./g, "")}//Member Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escText(c.calName)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...LONDON_VTIMEZONE,
  ];
  const stamp = toUtcICS(now);
  for (const ev of cal) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/London:${fmtWall(ev.start)}`,
      `DTEND;TZID=Europe/London:${fmtWall(ev.end)}`,
      `SUMMARY:${escText(ev.title)}`,
    );
    if (ev.location) lines.push(`LOCATION:${escText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escText(ev.description)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    // One on-screen reminder, 12 hours before the start. No email alarm.
    lines.push(
      "STATUS:CONFIRMED", "TRANSP:OPAQUE",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escText(ev.title)}`, "TRIGGER:-PT12H", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  const body = lines.map(fold).join("\r\n");
  return body;
}
