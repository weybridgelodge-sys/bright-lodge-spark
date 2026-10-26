// JOB CJ: calendar feed, sign-in emails and accounts link are per lodge.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fakeDb } from "./helpers/fakeDb";
import { buildFeed, feedLodgeFrom } from "../../supabase/functions/member-calendar-feed/ics";
import { feedUnitFor, scopeRows, NO_FEED_UNIT_MESSAGE } from "../../supabase/functions/member-calendar-feed/unit";
import { authRenderContext, createUnitBrandLookups, siteNameFor, siteUrlFor, senderDisplayName, TEXT_ONLY_BRAND } from "../../supabase/functions/_shared/authEmailBrand";
import { recipientOf, resolveRecipientUnit } from "../../supabase/functions/_shared/authRecipientUnit";
import { accountsLinkUnit } from "../../supabase/functions/accounts-link/unit";

const d = (n: number) => new Date(Date.UTC(2027, 0, 1) + n * 86400000).toISOString().slice(0, 10);
const LODGE_A = { siteUrl: "https://www.alpha.example", calendarName: "Alpha Lodge No. 1111", meetingVenue: "Alpha Hall", senderName: "Alpha Lodge No 1111" };
const LODGE_B = { siteUrl: "https://beta.example", calendarName: "Beta Lodge No. 2222", meetingVenue: "Beta Rooms", senderName: "Beta Lodge" };
// Same rows the previous version read for the golden file (after its own date/archived filters).
const rowsA = () => ({
  events: [{ id: "e1", slug: "ev-1", title: "Installation Meeting", event_date: d(20), tyling_time: "6:15 pm", location: null, intro: "Intro" }],
  meetings: [
    { id: "f1", event_key: "ev-1", meeting_date: d(20), meeting_type: "installation", notes: "Dinner", status: "published", unit_id: "u1" },
    { id: "f2", event_key: "reg-2", meeting_date: d(40), meeting_type: "regular", notes: null, status: "published", unit_id: "u1" },
  ],
  socials: [{ id: "s1", title: "Quiz", starts_at: "2027-01-11T19:30:00Z", ends_at: null, venue: "Pub", description: "Fun" }],
  officers: [{ id: "o1", officer_night_date: d(15), officer_night_venue: null, meeting_date: d(20) }],
  loi: [{ id: "l1", title: "Rehearsal Night", event_date: d(3), time_from: "19:30:00", time_to: "21:30:00", venue: null, description: "" }],
  publicRows: [{ id: "p1", slug: "ladies", public_title: "Ladies Festival", name: "LF", event_date: d(60), start_time: "18:00", end_time: null, venue: null, intro_copy: "Gala" }],
  archivedKeys: new Set<string>(["gone"]),
});
const stamp = (s: string) => s.replace(/DTSTAMP:\S+/g, "DTSTAMP:X");

describe("member-calendar-feed", () => {
  it("single lodge: feed is byte-identical to the previous version's output (UIDs unchanged)", () => {
    const golden = readFileSync("src/test/fixtures/jobCJ-calendar-golden.ics", "utf8").replace(/\n$/, "");
    const out = stamp(buildFeed(scopeRows(rowsA(), "u1", true), feedLodgeFrom(LODGE_A)));
    expect(out).toBe(golden);
    expect(out).toContain("UID:event-e1@www.alpha.example");
    expect(feedLodgeFrom(LODGE_A).file).toBe("alpha-lodge-no-1111");
  });
  it("two lodges: no calendar name, domain, venue, file name or meeting crosses over", () => {
    const rows = rowsA();
    rows.meetings.push({ id: "fb", event_key: "b-1", meeting_date: d(30), meeting_type: "regular", notes: "Beta only", status: "published", unit_id: "u2" });
    const a = buildFeed(scopeRows(rows, "u1", false), feedLodgeFrom(LODGE_A));
    const b = buildFeed(scopeRows(rows, "u2", false), feedLodgeFrom(LODGE_B));
    expect(a).not.toMatch(/beta|Beta/);
    expect(b).not.toMatch(/alpha|Alpha/);
    expect(b).toContain("UID:fbm-fb@beta.example");
    expect(b).toContain("LOCATION:Beta Rooms");
    expect(a).not.toContain("fbm-fb@");
    expect(feedLodgeFrom(LODGE_B).file).toBe("beta-lodge");
  });
  it("rows with no unit belong to the lodge only while exactly one lodge exists", () => {
    const multi = scopeRows(rowsA(), "u1", false);
    expect(multi.events).toEqual([]);
    expect(multi.socials).toEqual([]);
    expect(multi.meetings).toHaveLength(2);
    expect(scopeRows(rowsA(), "u1", true).events).toHaveLength(1);
  });
  it("a token whose member has no lodge is refused, never defaulted", () => {
    expect(feedUnitFor({ unit_id: " " })).toEqual({ ok: false, message: NO_FEED_UNIT_MESSAGE });
    expect(feedUnitFor(null).ok).toBe(false);
    expect(feedUnitFor({ unit_id: "u2" })).toEqual({ ok: true, unitId: "u2" });
  });
  it("two interleaved requests for different lodges keep separate state", async () => {
    const slow = (l: typeof LODGE_A, ms: number) => new Promise<typeof LODGE_A>((r) => setTimeout(() => r(l), ms));
    const handle = async (unit: string) => {
      const lodge = feedLodgeFrom(await slow(unit === "u1" ? LODGE_A : LODGE_B, unit === "u1" ? 20 : 1));
      await new Promise((r) => setTimeout(r, unit === "u1" ? 1 : 20));
      return buildFeed(scopeRows(rowsA(), unit, false), lodge);
    };
    const [a, b] = await Promise.all([handle("u1"), handle("u2")]);
    expect(a).toContain("X-WR-CALNAME:Alpha Lodge No. 1111");
    expect(b).toContain("X-WR-CALNAME:Beta Lodge No. 2222");
    expect(a).not.toContain("Beta");
    expect(b).not.toContain("Alpha");
  });
});

describe("auth-email-hook recipient lodge", () => {
  it("reads the recipient from either payload shape; ignores user_metadata", () => {
    expect(recipientOf({ user: { id: "x", email: "A@X.test", app_metadata: { unit_id: "u2" }, user_metadata: { unit_id: "evil" } } }))
      .toEqual({ email: "a@x.test", userId: "x", appUnit: "u2" });
    expect(recipientOf({ data: { email: "b@x.test" } })).toEqual({ email: "b@x.test", userId: "", appUnit: "" });
  });
  it("order: pending_account_units, then app_metadata, then profile; none = neutral", async () => {
    const db = fakeDb({
      pending_account_units: [{ email: "new@x.test", unit_id: "u2" }],
      profiles: [{ id: "p1", email: "m@x.test", unit_id: "u1" }, { id: "p2", email: "dup@x.test", unit_id: "u1" }, { id: "p3", email: "dup@x.test", unit_id: "u2" }],
    });
    expect(await resolveRecipientUnit(db, { email: "new@x.test", userId: "", appUnit: "u1" })).toEqual({ unitId: "u2", source: "pending" });
    expect(await resolveRecipientUnit(db, { email: "m@x.test", userId: "p1", appUnit: "u9" })).toEqual({ unitId: "u9", source: "app_metadata" });
    expect(await resolveRecipientUnit(db, { email: "", userId: "p1", appUnit: "" })).toEqual({ unitId: "u1", source: "profile" });
    expect(await resolveRecipientUnit(db, { email: "m@x.test", userId: "", appUnit: "" })).toEqual({ unitId: "u1", source: "profile" });
    expect(await resolveRecipientUnit(db, { email: "dup@x.test", userId: "", appUnit: "" })).toEqual({ unitId: "", source: "none" });
    expect(await resolveRecipientUnit(db, { email: "nobody@x.test", userId: "", appUnit: "" })).toEqual({ unitId: "", source: "none" });
  });
  it("a database error gives the neutral brand, never throws", async () => {
    const bad = { from: () => { throw new Error("down"); } };
    expect(await resolveRecipientUnit(bad, { email: "a@x.test", userId: "", appUnit: "" })).toEqual({ unitId: "", source: "none" });
  });
});

describe("auth-email-hook per-lodge brand", () => {
  const S = {
    u1: { lodgeName: "Alpha Lodge", lodgeNumber: "1111", provinceName: "Alphashire", crestImageUrl: "https://alpha.example/c.png", configuredFormalSenderName: "", configuredSiteUrl: "https://alpha.example" },
    u2: { lodgeName: "Beta Lodge", lodgeNumber: "2222", provinceName: "Betashire", crestImageUrl: "https://beta.example/c.png", configuredFormalSenderName: "Beta Sender", configuredSiteUrl: "https://beta.example" },
  } as Record<string, any>;
  const quiet = { warn: () => {} };
  it("single lodge: context equals the previous composition (header, wording, link, sender)", async () => {
    const l = createUnitBrandLookups({ load: async (u) => S[u], ...quiet });
    const b = await l.get("u1");
    const ctx = authRenderContext(b, "https://root.example");
    expect(ctx).toEqual({
      brand: { crestUrl: "https://alpha.example/c.png", lodgeName: "Alpha Lodge", lodgeNumber: "1111", provinceName: "Alphashire" },
      siteName: siteNameFor(b), siteUrl: siteUrlFor(b, "https://root.example"), senderName: senderDisplayName(b),
    });
    expect(ctx.siteName).toBe("Alpha Lodge No. 1111");
    expect(ctx.siteUrl).toBe("https://alpha.example");
  });
  it("two lodges never share header, name, link or sender", async () => {
    const l = createUnitBrandLookups({ load: async (u) => S[u], ...quiet });
    const a = authRenderContext(await l.get("u1"), "https://root.example");
    const b = authRenderContext(await l.get("u2"), "https://root.example");
    expect(JSON.stringify(a)).not.toMatch(/Beta|beta/);
    expect(JSON.stringify(b)).not.toMatch(/Alpha|alpha/);
    expect(b.senderName).toBe("Beta Sender");
  });
  it("recipient with no lodge = neutral text-only brand", async () => {
    const l = createUnitBrandLookups({ load: async (u) => S[u], ...quiet });
    expect(await l.get("")).toBeNull();
    const ctx = authRenderContext(null, "https://root.example");
    expect(ctx.brand).toEqual(TEXT_ONLY_BRAND);
    expect(ctx.siteName).toBe("Members Portal");
    expect(ctx.siteUrl).toBe("https://root.example");
  });
  it("one lodge's settings failing or timing out only affects that lodge", async () => {
    const l = createUnitBrandLookups({
      load: async (u) => { if (u === "u2") throw new Error("lodge settings unavailable"); if (u === "u3") return new Promise(() => {}); return S[u]; },
      timeoutMs: 30, ...quiet,
    });
    expect(await l.get("u2")).toBeNull();
    expect(await l.get("u3")).toBeNull();
    expect((await l.get("u1"))?.lodgeName).toBe("Alpha Lodge");
  });
  it("two interleaved sends for different lodges keep separate brands", async () => {
    const l = createUnitBrandLookups({ load: (u) => new Promise((r) => setTimeout(() => r(S[u]), u === "u1" ? 25 : 1)), ...quiet });
    const [a, b] = await Promise.all([l.get("u1"), l.get("u2")]);
    expect(a?.lodgeName).toBe("Alpha Lodge");
    expect(b?.lodgeName).toBe("Beta Lodge");
  });
});

describe("accounts-link lodge", () => {
  it("takes the submitting member's own lodge; blank = refused", async () => {
    const db = fakeDb({ profiles: [{ id: "t1", unit_id: "u2" }, { id: "t2", unit_id: "" }] });
    expect(await accountsLinkUnit(db, "t1")).toEqual({ ok: true, unitId: "u2" });
    const r = await accountsLinkUnit(db, "t2");
    expect(r.ok).toBe(false);
    expect((r as any).message).toMatch(/has no lodge set/);
    expect((await accountsLinkUnit(db, null)).ok).toBe(false);
  });
});

describe("source guards", () => {
  const read = (f: string) => readFileSync(`supabase/functions/${f}`, "utf8").replace(/\/\/.*$/gm, "");
  const files = ["member-calendar-feed/index.ts", "member-calendar-feed/ics.ts", "auth-email-hook/index.ts", "accounts-link/index.ts", "_shared/email-templates/_layout.tsx"];
  it.each(files)("%s: no module-level let/var, no no-argument loadLodgeSettings(), no global brand setter", (f) => {
    const s = read(f);
    expect(s).not.toMatch(/^(let|var)\s/m);
    expect(s).not.toMatch(/loadLodgeSettings\(\s*\)/);
    expect(s).not.toMatch(/setAuthEmailBrand|getAuthEmailBrand/);
    expect(s).not.toMatch(/weybridge|6787/i);
  });
  it("every sign-in template passes its own brand to the header and footer", () => {
    for (const t of ["signup", "invite", "magic-link", "recovery", "email-change", "reauthentication"]) {
      const s = read(`_shared/email-templates/${t}.tsx`);
      expect(s).toContain("<BrandHeader brand={brand} />");
      expect(s).toContain("<BrandFooter brand={brand} />");
    }
  });
});
