// JOB CL: unit_id on lodge-owned tables; readers match strictly, null keeps the single-lodge fallback.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fakeDb } from "./helpers/fakeDb";
import { buildFeed, feedLodgeFrom } from "../../supabase/functions/member-calendar-feed/ics";
import { scopeRows } from "../../supabase/functions/member-calendar-feed/unit";
import { pollUnitAllowed } from "../../supabase/functions/notify-poll-opened/unit";
import * as returns from "../../supabase/functions/secretary-returns-reminder/run";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";

const d = (n: number) => new Date(Date.UTC(2027, 0, 1) + n * 86400000).toISOString().slice(0, 10);
const LODGE_A = { siteUrl: "https://www.alpha.example", calendarName: "Alpha Lodge No. 1111", meetingVenue: "Alpha Hall", senderName: "Alpha Lodge No 1111" };
const LODGE_B = { siteUrl: "https://beta.example", calendarName: "Beta Lodge No. 2222", meetingVenue: "Beta Rooms", senderName: "Beta Lodge" };
const stamp = (s: string) => s.replace(/DTSTAMP:\S+/g, "DTSTAMP:X");
const rows = (u: string | null) => ({
  events: [{ id: "e1", slug: "ev-1", title: "Installation Meeting", event_date: d(20), tyling_time: "6:15 pm", location: null, intro: "Intro", unit_id: u }],
  meetings: [
    { id: "f1", event_key: "ev-1", meeting_date: d(20), meeting_type: "installation", notes: "Dinner", status: "published", unit_id: "u1" },
    { id: "f2", event_key: "reg-2", meeting_date: d(40), meeting_type: "regular", notes: null, status: "published", unit_id: "u1" },
  ],
  socials: [{ id: "s1", title: "Quiz", starts_at: "2027-01-11T19:30:00Z", ends_at: null, venue: "Pub", description: "Fun", unit_id: u }],
  officers: [{ id: "o1", officer_night_date: d(15), officer_night_venue: null, meeting_date: d(20), unit_id: u }],
  loi: [{ id: "l1", title: "Rehearsal Night", event_date: d(3), time_from: "19:30:00", time_to: "21:30:00", venue: null, description: "", unit_id: u }],
  publicRows: [{ id: "p1", slug: "ladies", public_title: "Ladies Festival", name: "LF", event_date: d(60), start_time: "18:00", end_time: null, venue: null, intro_copy: "Gala", unit_id: u }],
  archivedKeys: new Set<string>(["gone"]),
});

describe("calendar feed after backfill", () => {
  it("Weybridge-shaped fixture with unit_id on every row is still byte-identical to the golden file", () => {
    const golden = readFileSync("src/test/fixtures/jobCJ-calendar-golden.ics", "utf8").replace(/\n$/, "");
    expect(stamp(buildFeed(scopeRows(rows("u1"), "u1", true), feedLodgeFrom(LODGE_A)))).toBe(golden);
    // Strict match does not depend on the single-lodge flag any more.
    expect(stamp(buildFeed(scopeRows(rows("u1"), "u1", false), feedLodgeFrom(LODGE_A)))).toBe(golden);
  });
  it("two lodges: events, socials, officers nights, rehearsal nights and public events never cross", () => {
    const r = rows("u1");
    const b = rows("u2");
    const mixed = {
      ...r,
      events: [...r.events, { ...b.events[0], id: "e2", slug: "ev-b", title: "Beta Meeting" }],
      socials: [...r.socials, { ...b.socials[0], id: "s2", title: "Beta Quiz" }],
      officers: [...r.officers, { ...b.officers[0], id: "o2" }],
      loi: [...r.loi, { ...b.loi[0], id: "l2", title: "Beta Rehearsal" }],
      publicRows: [...r.publicRows, { ...b.publicRows[0], id: "p2", slug: "beta-gala", public_title: "Beta Gala" }],
    };
    const sa = scopeRows(mixed, "u1", false), sb = scopeRows(mixed, "u2", false);
    for (const k of ["events", "socials", "officers", "loi", "publicRows"] as const) {
      expect(sa[k].every((x: any) => x.unit_id === "u1")).toBe(true);
      expect(sb[k].every((x: any) => x.unit_id === "u2")).toBe(true);
      expect(sb[k]).toHaveLength(1);
    }
    expect(buildFeed(sb, feedLodgeFrom(LODGE_B))).not.toMatch(/Alpha|alpha|Ladies Festival|Installation Meeting|UID:[a-z]+-(e1|s1|o1|l1|p1)@/);
  });
  it("null unit rows keep the single-lodge fallback only", () => {
    expect(scopeRows(rows(null), "u1", true).events).toHaveLength(1);
    expect(scopeRows(rows(null), "u1", false).events).toHaveLength(0);
  });
});

describe("secretary-returns-reminder uses the return's own unit", () => {
  const lodge = (n: string, site: string) => ({ ...resolveLodgeSettings(null), lodgeName: `${n} Lodge`, configuredSiteUrl: site }) as any;
  const row = (id: string, unit: string | null, memberUnit: string | null) => ({
    id, unit_id: unit, return_type: "form_p", masonic_year: 2026, date_due: "2026-10-03", status: "draft", reminder_lead_days: null,
    member_id: memberUnit ? `p-${id}` : null, candidate_id: memberUnit ? null : `c-${id}`,
    member: memberUnit ? { first_name: id, last_name: "M", unit_id: memberUnit } : null,
    candidate: memberUnit ? null : { first_name: id, last_name: "C" },
  });
  const t = () => ({
    secretary_returns: [row("own-b", "u2", "u1"), row("cand-a", "u1", null), row("cand-b", "u2", null), row("legacy", null, null)],
    profiles: [{ id: "sa", email: "sec@a", unit_id: "u1" }, { id: "sb", email: "sec@b", unit_id: "u2" }], user_roles: [],
  });
  const H = { current_officer_holder: (a: any) => (({ "u1:secretary": "sa", "u2:secretary": "sb" }) as any)[`${a._unit}:${a._position_key}`] ?? null };
  const run = async (u: string, single: boolean) => {
    const sent: any[] = [];
    const r = await returns.runUnit({ db: fakeDb(t(), H), send: async (x: any) => { sent.push(x); return { ok: true } as any; } } as any, u, lodge(u, `https://${u}.example`), { force: false, today: "2026-10-01", reportDate: "x", singleUnit: single });
    return { r, people: (sent[0]?.templateData.dueSoon ?? []).map((x: any) => x.person) };
  };
  it("row unit wins over member unit; candidate letters now go to their own lodge", async () => {
    const a = await run("u1", false), b = await run("u2", false);
    expect(a.people).toEqual(["cand-a C"]);
    expect(b.people.sort()).toEqual(["cand-b C", "own-b M"]);
    expect(a.r).toMatchObject({ skipped_no_unit: 1 });
  });
});

describe("notify-poll-opened poll unit", () => {
  it("own lodge allowed, other lodge refused, legacy null allowed", () => {
    expect(pollUnitAllowed("u1", "u1")).toBe(true);
    expect(pollUnitAllowed("u2", "u1")).toBe(false);
    expect(pollUnitAllowed(null, "u1")).toBe(true);
    expect(pollUnitAllowed(" ", "u1")).toBe(true);
  });
});

// Mirror of public.fill_unit_from_caller(): record's own unit, then caller's profile unit, else refuse.
const fill = (rec: string | null, caller: string | null) => {
  const r = (rec ?? "").trim() || (caller ?? "").trim();
  if (!r) throw new Error("no_unit_for_write");
  return r;
};
describe("writer unit rule (insert trigger)", () => {
  it("record unit wins, then caller, else refuses", () => {
    expect(fill("u2", "u1")).toBe("u2");
    expect(fill(null, "u1")).toBe("u1");
    expect(() => fill(null, null)).toThrow("no_unit_for_write");
    expect(() => fill("  ", "")).toThrow();
  });
  const dir = "drizzle/migrations";
  const sql = readFileSync(`${dir}/${readdirSync(dir).find((f) => f.includes("jobcl_unit_id"))}`, "utf8");
  const T = ["secretary_returns", "candidates", "polls", "lodge_events", "lodge_socials", "summonses", "loi_schedule_entries"];
  it("migration covers every table, is re-runnable and has no lodge literal or default", () => {
    for (const t of T) {
      expect(sql).toContain(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS unit_id text;`);
      expect(sql).toContain(`UPDATE public.${t} SET unit_id = (SELECT id FROM public.units) WHERE unit_id IS NULL;`);
      expect(sql).toContain(`CREATE INDEX IF NOT EXISTS ${t}_unit_id_idx`);
      expect(sql).toContain(`DROP TRIGGER IF EXISTS ${t}_fill_unit`);
      expect(sql).toContain(`IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${t}_unit_id_fkey')`);
    }
    expect(sql).toMatch(/IF n <> 1 THEN\s+RAISE EXCEPTION/);
    expect(sql).not.toMatch(/weybridge/i);
    expect(sql).not.toMatch(/unit_id text (NOT NULL|DEFAULT)/i);
    expect(sql).not.toMatch(/current_unit_id\(\)/);
  });
});
