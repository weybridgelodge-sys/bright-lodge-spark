// JOB DF: member calendar shows every non-cancelled meeting (past/future, any status).
import { describe, it, expect } from "vitest";
import { buildFeed, feedLodgeFrom } from "../../supabase/functions/member-calendar-feed/ics";
import { scopeRows } from "../../supabase/functions/member-calendar-feed/unit";

const LODGE = feedLodgeFrom({ siteUrl: "https://lodge-a.example", calendarName: "Lodge A", meetingVenue: "Hall A", senderName: "Lodge A" });
const NOW = new Date("2026-10-26T12:00:00Z");
const empty = { socials: [], officers: [], loi: [], publicRows: [] };
const m = (id: string, date: string, type: string, status: string, key: string, unit = "u1") =>
  ({ id, event_key: key, meeting_date: date, meeting_type: type, notes: null, status, unit_id: unit });

// The 8 live non-cancelled Weybridge meetings (cancelled row is excluded by the query: cancelled_at IS NULL).
const liveMeetings = [
  m("m1", "2026-02-18", "regular", "completed", "k-0218"),
  m("m2", "2026-05-13", "regular", "completed", "k-0513"),
  m("m3", "2026-09-12", "regular", "draft", "event_1781647641995"),
  m("m4", "2026-10-21", "installation", "draft", "event_1781912659776"),
  m("m5", "2026-12-09", "regular", "published", "ev-dec"),
  m("m6", "2027-01-07", "dispensation", "draft", "k-0107"),
  m("m7", "2027-02-17", "regular", "draft", "k-0217"),
  m("m8", "2027-05-12", "regular", "draft", "k-0512"),
];
const liveEvents = [
  { id: "a1", slug: "event_1781647641995", title: "Super Saturday - Three Double Passing Ceremonies", event_date: "2026-09-12", tyling_time: "10:00 am", location: null, intro: "SECRET DRAFT COPY", published: false, archived_at: "2026-09-01", unit_id: "u1" },
  { id: "a2", slug: "event_1781912659776", title: "Weybridge Lodge Installation Meeting and Charitable White Table", event_date: "2026-10-21", tyling_time: "5:00 pm", location: null, intro: "UNPUBLISHED BLURB", published: false, archived_at: "2026-10-01", unit_id: "u1" },
  { id: "p1", slug: "ev-dec", title: "December Meeting", event_date: "2026-12-09", tyling_time: "6:15 pm", location: null, intro: "Public intro", published: true, archived_at: null, unit_id: "u1" },
  { id: "x1", slug: "orphan", title: "Unlinked Draft Event", event_date: "2026-11-01", tyling_time: null, location: null, intro: "nope", published: false, archived_at: null, unit_id: "u1" },
];
const feed = (meetings = liveMeetings, events = liveEvents) =>
  buildFeed(scopeRows({ ...empty, meetings, events }, "u1", false), LODGE, NOW);
const vevents = (raw: string) => raw.replace(/\r\n /g, "").split("BEGIN:VEVENT").slice(1).map((b) => ({
  uid: b.match(/UID:(\S+)/)![1], start: b.match(/DTSTART;TZID=Europe\/London:(\S+)/)![1],
  summary: b.match(/SUMMARY:(.*)/)![1].trim(), desc: b.match(/\nDESCRIPTION:(.*)\r?\nSTATUS/)?.[1] ?? "",
}));

describe("JOB DF member calendar meetings", () => {
  it("live Weybridge data: exactly the 8 meetings, each once", () => {
    const v = vevents(feed());
    console.table(v);
    expect(v).toHaveLength(8);
    expect(new Set(v.map((e) => e.start.slice(0, 8))).size).toBe(8);
  });
  it("completed past meeting and draft future meeting are shown", () => {
    const v = vevents(feed());
    expect(v.find((e) => e.uid.startsWith("fbm-m1@"))).toBeTruthy();
    expect(v.find((e) => e.uid.startsWith("fbm-m8@"))).toBeTruthy();
  });
  it("meeting linked to archived+unpublished event uses its title and time, never its intro", () => {
    const ics = feed();
    const e = vevents(ics).find((x) => x.uid.startsWith("event-a2@"))!;
    expect(e.summary).toBe("Meeting: Weybridge Lodge Installation Meeting and Charitable White Table");
    expect(e.start).toBe("20261021T170000");
    expect(ics).not.toContain("UNPUBLISHED BLURB");
    expect(ics).not.toContain("SECRET DRAFT COPY");
  });
  it("cancelled meeting hidden (query excludes it; nothing re-adds it)", () => {
    expect(feed().match(/20270107T/g)?.length).toBe(2); // one VEVENT (DTSTART + DTEND)
  });
  it("unlinked unpublished event stays hidden", () => {
    expect(feed()).not.toContain("Unlinked Draft Event");
  });
  it("no duplicate when the linked event is published", () => {
    const v = vevents(feed()).filter((e) => e.start.startsWith("20261209"));
    expect(v).toHaveLength(1);
    expect(v[0].uid).toMatch(/^event-p1@/);
    expect(v[0].desc).toBe("Public intro");
  });
  it("second-lodge meeting is not shown to this lodge's member", () => {
    const ics = feed([...liveMeetings, m("b1", "2026-11-11", "regular", "draft", "b-key", "u2")]);
    expect(ics).not.toContain("fbm-b1@");
  });
});
