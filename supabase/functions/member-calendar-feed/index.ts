// Personal per-member calendar subscription feed.
// Reached at /functions/v1/member-calendar-feed?token=... (no JWT required —
// the token itself is the credential). Returns a live iCalendar document that
// merges lodge_events, festive_board_meetings, lodge_socials, and the rolling
// Thursday Lodge of Instruction dates. Lodge Visits are intentionally excluded.
//
// Times are emitted as floating local times with TZID=Europe/London plus a
// VTIMEZONE block. This is deliberate — Deno runs in UTC, so anything built
// with `new Date(y,m,d)` / `setHours()` / bare "YYYY-MM-DDTHH:MM:SS" strings
// would otherwise be treated as UTC and appear one hour late during BST when
// the calendar client rewinds it to London local time.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const LODGE_DOMAIN = "weybridgelodge.org.uk";
const CAL_NAME = "Weybridge Lodge No. 6787";
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

/** Rolling Thursday LOI dates — mirrors src/data/events.ts getRollingLOIs().
 *  All in London wall-clock so DST is handled correctly. */
function rollingLOIs(count = 26): CalEvent[] {
  const out: CalEvent[] = [];
  // Anchor: Thu 20 Aug 2026 (resume date after the summer break).
  const RESUME = { y: 2026, m1: 8, d: 20 };
  const todayLondon = londonParts(new Date());
  // Find the next Thursday relative to *London* today.
  const anchor = new Date(Date.UTC(Number(todayLondon.y), Number(todayLondon.m) - 1, Number(todayLondon.d)));
  const day = anchor.getUTCDay(); // Sun=0..Sat=6
  const diff = (4 - day + 7) % 7 || 7;
  anchor.setUTCDate(anchor.getUTCDate() + diff);
  const resumeAnchor = new Date(Date.UTC(RESUME.y, RESUME.m1 - 1, RESUME.d));
  if (anchor.getTime() < resumeAnchor.getTime()) {
    anchor.setTime(resumeAnchor.getTime());
  }
  for (let i = 0; i < count; i++) {
    const dt = new Date(anchor.getTime() + i * 7 * 86400_000);
    const start = wall(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), 19, 30);
    const end = addHours(start, 2);
    out.push({
      uid: `loi-${start.y}${start.m}${start.d}@${LODGE_DOMAIN}`,
      title: "LOI: Lodge of Instruction",
      location: "Guildford Masonic Centre, Hitherbury Close, Guildford GU2 4DR",
      description: "Weekly rehearsal and ritual practice.",
      start, end,
    });
  }
  return out;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    if (!token) {
      return new Response("Missing token", { status: 400, headers: cors });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow, error: tokErr } = await admin
      .from("member_calendar_tokens")
      .select("member_id")
      .eq("token", token)
      .maybeSingle();
    if (tokErr) throw tokErr;
    if (!tokenRow) return new Response("Invalid token", { status: 403, headers: cors });

    const { data: prof } = await admin
      .from("profiles")
      .select("id,status")
      .eq("id", (tokenRow as any).member_id)
      .maybeSingle();
    if (!prof || (prof as any).status !== "active") {
      return new Response("Not an active member", { status: 403, headers: cors });
    }

    admin.from("member_calendar_tokens")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("member_id", (tokenRow as any).member_id)
      .then(() => {}, () => {});

    const fromIso = new Date(Date.now() - 365 * 86400_000).toISOString();
    const toIso = new Date(Date.now() + 2 * 365 * 86400_000).toISOString();

    const [eventsRes, meetingsRes, socialsRes] = await Promise.all([
      admin.from("lodge_events")
        .select("id,slug,title,event_date,tyling_time,location,intro")
        .eq("published", true)
        .gte("event_date", fromIso)
        .lte("event_date", toIso),
      admin.from("festive_board_meetings")
        .select("id,event_key,meeting_date,meeting_type,notes,status")
        .eq("status", "published")
        .gte("meeting_date", fromIso.slice(0, 10)),
      admin.from("lodge_socials")
        .select("id,title,starts_at,ends_at,venue,description")
        .gte("starts_at", fromIso),
    ]);

    const cal: CalEvent[] = [];

    const meetingsByKey = new Map<string, any>();
    for (const m of (meetingsRes.data ?? [])) {
      if ((m as any).event_key) meetingsByKey.set((m as any).event_key, m);
    }
    for (const e of (eventsRes.data ?? [])) {
      const ev = e as any;
      const ymd = londonYMD(ev.event_date);
      const t = parseTime(ev.tyling_time, { hh: 18, mm: 15 });
      const start = wall(ymd.y, ymd.m1, ymd.d, t.hh, t.mm);
      const end = addHours(start, 3);
      const linked = meetingsByKey.get(ev.slug);
      const descParts = [ev.intro, linked?.notes].filter(Boolean);
      cal.push({
        uid: `event-${ev.id}@${LODGE_DOMAIN}`,
        title: classifyEventTitle(ev.title),
        location: ev.location ?? "Guildford Masonic Centre",
        description: descParts.join("\n\n"),
        start, end,
      });
      if (linked) meetingsByKey.delete(ev.slug);
    }
    for (const [, m] of meetingsByKey) {
      const md = (m as any).meeting_date as string; // YYYY-MM-DD
      const ymd = londonYMD(md);
      const start = wall(ymd.y, ymd.m1, ymd.d, 18, 15);
      const end = addHours(start, 3);
      cal.push({
        uid: `fbm-${(m as any).id}@${LODGE_DOMAIN}`,
        title: `Meeting: ${(m as any).meeting_type ?? "Regular meeting"}`,
        location: "Guildford Masonic Centre",
        description: (m as any).notes ?? "",
        start, end,
      });
    }

    // Socials — starts_at/ends_at are timestamptz (true instants); render each in London wall-clock.
    for (const s of (socialsRes.data ?? [])) {
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
        uid: `social-${so.id}@${LODGE_DOMAIN}`,
        title: `Social: ${so.title}`,
        location: so.venue ?? "",
        description: so.description ?? "",
        start, end,
      });
    }

    for (const l of rollingLOIs(26)) cal.push(l);

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Weybridge Lodge No 6787//Member Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escText(CAL_NAME)}`,
      "X-WR-TIMEZONE:Europe/London",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
      ...LONDON_VTIMEZONE,
    ];
    const stamp = toUtcICS(new Date());
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
      lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const body = lines.map(fold).join("\r\n");

    return new Response(body, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="weybridge-lodge.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("member-calendar-feed error", e);
    return new Response(`Error: ${(e as Error).message}`, { status: 500, headers: cors });
  }
});
