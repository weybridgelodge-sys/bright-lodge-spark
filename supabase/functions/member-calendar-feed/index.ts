// Personal per-member calendar subscription feed.
// Reached at /functions/v1/member-calendar-feed?token=... (no JWT required —
// the token itself is the credential). Returns a live iCalendar document that
// merges lodge_events, festive_board_meetings, lodge_socials, and the rolling
// Thursday Lodge of Instruction dates. Lodge Visits are intentionally excluded.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const LODGE_DOMAIN = "weybridgelodge.org.uk";
const CAL_NAME = "Weybridge Lodge No. 6787";

function pad(n: number) { return String(n).padStart(2, "0"); }
function toUtcICS(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
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
  start: Date;
  end: Date;
};

/** Merge tyling / dining times (free text) with the meeting date to get a start Date. */
function combineDateTime(dateIso: string, freeTimeText?: string | null): Date {
  const base = new Date(dateIso);
  const s = (freeTimeText ?? "").toLowerCase().trim();
  if (!s) return base;
  // 24h "HH:MM"
  const m24 = s.match(/(\d{1,2}):(\d{2})/);
  // 12h "H(.MM)? ?(am|pm)"
  const m12 = s.match(/(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)/);
  let hh = base.getHours(), mm = base.getMinutes();
  if (m12) {
    hh = Number(m12[1]) % 12 + (m12[3] === "pm" ? 12 : 0);
    mm = Number(m12[2] ?? "0");
  } else if (m24) {
    hh = Number(m24[1]); mm = Number(m24[2]);
  } else {
    return base;
  }
  const out = new Date(base);
  out.setHours(hh, mm, 0, 0);
  return out;
}

/** Rolling Thursday LOI dates — mirrors src/data/events.ts getRollingLOIs(). */
function rollingLOIs(count = 26): CalEvent[] {
  const out: CalEvent[] = [];
  const resumeDate = new Date(2026, 7, 20); // Thu 20 Aug 2026
  const d = new Date();
  d.setHours(19, 30, 0, 0);
  const day = d.getDay();
  const diff = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  if (d.getTime() < resumeDate.getTime()) {
    d.setFullYear(resumeDate.getFullYear(), resumeDate.getMonth(), resumeDate.getDate());
  }
  for (let i = 0; i < count; i++) {
    const start = new Date(d);
    start.setDate(d.getDate() + i * 7);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    out.push({
      uid: `loi-${start.toISOString().slice(0, 10)}@${LODGE_DOMAIN}`,
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

    // Confirm active member
    const { data: prof } = await admin
      .from("profiles")
      .select("id,status")
      .eq("id", (tokenRow as any).member_id)
      .maybeSingle();
    if (!prof || (prof as any).status !== "active") {
      return new Response("Not an active member", { status: 403, headers: cors });
    }

    // Fire-and-forget usage stamp
    admin.from("member_calendar_tokens")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("member_id", (tokenRow as any).member_id)
      .then(() => {}, () => {});

    // Pull sources in parallel — one year back, two years forward.
    const nowIso = new Date().toISOString();
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

    // lodge_events (+ merge in matching festive_board_meetings notes)
    const meetingsByKey = new Map<string, any>();
    for (const m of (meetingsRes.data ?? [])) {
      if ((m as any).event_key) meetingsByKey.set((m as any).event_key, m);
    }
    for (const e of (eventsRes.data ?? [])) {
      const ev = e as any;
      const start = combineDateTime(ev.event_date, ev.tyling_time);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
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
    // Any festive_board_meetings without a matching lodge_events row still get their own entry
    for (const [, m] of meetingsByKey) {
      const start = new Date((m as any).meeting_date + "T18:15:00");
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      cal.push({
        uid: `fbm-${(m as any).id}@${LODGE_DOMAIN}`,
        title: `Meeting: ${(m as any).meeting_type ?? "Regular meeting"}`,
        location: "Guildford Masonic Centre",
        description: (m as any).notes ?? "",
        start, end,
      });
    }

    // Ad-hoc Socials
    for (const s of (socialsRes.data ?? [])) {
      const so = s as any;
      const start = new Date(so.starts_at);
      const end = so.ends_at ? new Date(so.ends_at) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
      cal.push({
        uid: `social-${so.id}@${LODGE_DOMAIN}`,
        title: `Social: ${so.title}`,
        location: so.venue ?? "",
        description: so.description ?? "",
        start, end,
      });
    }

    // Rolling LOI Thursdays (public site source of truth for now)
    for (const l of rollingLOIs(26)) cal.push(l);

    // Build ICS
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
    ];
    const stamp = toUtcICS(new Date());
    for (const ev of cal) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${ev.uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${toUtcICS(ev.start)}`,
        `DTEND:${toUtcICS(ev.end)}`,
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
