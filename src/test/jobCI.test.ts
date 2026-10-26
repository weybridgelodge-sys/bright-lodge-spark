// JOB CI: scheduled / multi-lodge functions run per unit.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { fakeDb } from "./helpers/fakeDb";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { forEachUnit, listActiveUnits, unitOfficerRecipient } from "../../supabase/functions/_shared/units";
import * as deadline from "../../supabase/functions/meeting-deadline-reminder/run";
import * as ugle from "../../supabase/functions/secretary-ugle-reminder/run";
import * as returns from "../../supabase/functions/secretary-returns-reminder/run";
import * as almoner from "../../supabase/functions/almoner-overdue-check/run";
import * as sweep from "../../supabase/functions/waitlist-refund-sweep/run";
import * as promoted from "../../supabase/functions/notify-waitlist-promoted/run";
import * as poll from "../../supabase/functions/notify-poll-opened/run";
import * as audit from "../../supabase/functions/notify-year-audit/run";

const lodgeOf = (n: string, site: string) => ({
  ...resolveLodgeSettings(null),
  lodgeName: `${n} Lodge`, lodgeNumber: n === "Alpha" ? "1111" : "2222", provinceName: `${n}shire`,
  configuredSiteUrl: site, crestImageUrl: `${site}/crest.png`,
}) as any;
const A = lodgeOf("Alpha", "https://alpha.example");
const B = lodgeOf("Beta", "https://beta.example");
const BRAND_A = { crestUrl: "https://alpha.example/crest.png", lodgeName: "Alpha Lodge", lodgeNumber: "1111", provinceName: "Alphashire" };

const sender = () => {
  const sent: any[] = [];
  return { sent, send: vi.fn(async (p: any) => { sent.push(p); return { ok: true, status: 200 }; }) };
};
// current_officer_holder(_position_key, _unit) fixture
const holders = (map: Record<string, string>) => ({
  current_officer_holder: (a: any) => map[`${a._unit}:${a._position_key}`] ?? null,
});
const noOther = (sent: any[], other: { site: string; name: string }) => {
  const s = JSON.stringify(sent);
  expect(s).not.toContain(other.site);
  expect(s).not.toContain(other.name);
};

describe("shared units helper", () => {
  it("lists units from the units table, trimmed, de-duplicated, blank dropped; zero units = []", async () => {
    expect(await listActiveUnits(fakeDb({ units: [] }))).toEqual([]);
    expect(await listActiveUnits(fakeDb({ units: [{ id: "u2" }, { id: " u1 " }, { id: "" }, { id: "u2" }] }))).toEqual(["u1", "u2"]);
  });
  it("one unit failing never stops the others; failures logged with the unit id only", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await forEachUnit(["u1", "u2", "u3"], async (u) => { if (u === "u2") throw new Error("lodge settings unavailable: lookup failed"); return u; }, "t");
    expect(out.map((o) => o.ok)).toEqual([true, false, true]);
    expect(out[1]).toMatchObject({ unit_id: "u2", ok: false, error: "lodge settings unavailable: lookup failed" });
    expect(err).toHaveBeenCalledWith("t failed", { unit_id: "u2" });
    err.mockRestore();
  });
  it("officer recipient comes only from this unit; the role fallback ignores other lodges' role holders", async () => {
    const db = fakeDb({
      profiles: [{ id: "sb", email: "sec@b", unit_id: "u2" }, { id: "sa", email: "sec@a", unit_id: "u1" }],
      user_roles: [{ user_id: "sb", role: "secretary" }, { user_id: "sa", role: "secretary" }],
    }, holders({}));
    expect(await unitOfficerRecipient(db, "secretary", "secretary", "u1")).toEqual({ id: "sa", email: "sec@a" });
    expect(await unitOfficerRecipient(db, "secretary", "secretary", "u3")).toBeNull();
  });
  it("an office holder whose profile is another lodge's is never used", async () => {
    const db = fakeDb({ profiles: [{ id: "x", email: "x@b", unit_id: "u2" }], user_roles: [] }, holders({ "u1:secretary": "x" }));
    expect(await unitOfficerRecipient(db, "secretary", "secretary", "u1")).toBeNull();
  });
});

describe("meeting-deadline-reminder per unit", () => {
  const today = "2026-10-01";
  const target = deadline.targetMeetingDate(today);
  const tables = () => ({
    festive_board_meetings: [
      { id: "ma", meeting_date: target, meeting_type: "regular", status: "published", event_key: null, unit_id: "u1" },
      { id: "mb", meeting_date: target, meeting_type: "regular", status: "published", event_key: null, unit_id: "u2" },
      { id: "late", meeting_date: "2026-10-12", meeting_type: "regular", status: "published", event_key: null, unit_id: "u1" },
    ],
    lodge_events: [], festive_board_attendance: [], regular_meeting_reminders_sent: [],
    profiles: [
      { id: "a1", email: "a1@x", status: "active", unit_id: "u1" },
      { id: "b1", email: "b1@x", status: "active", unit_id: "u2" },
    ],
  });
  it("window: fires exactly 10 days ahead; a meeting 11 days ahead is not picked", () => {
    expect(target).toBe("2026-10-11");
  });
  it("single-unit output is byte-identical to the previous payload", async () => {
    const { sent, send } = sender(); const push = vi.fn(async () => ({}));
    await deadline.runUnit({ db: fakeDb(tables()), send, push }, "u1", A, { dryRun: false, meetingId: null, testEmail: null, targetStr: target });
    expect(sent).toEqual([{
      templateName: "meeting-deadline-reminder", recipientEmail: "a1@x", idempotencyKey: "meeting-deadline-ma-a1@x", unitId: "u1",
      templateData: { meetingDate: "11th October", deadlineDate: "4th October", bookingUrl: "https://alpha.example/bookings", ...BRAND_A },
    }]);
    expect(push).toHaveBeenCalledWith({
      member_ids: ["a1"], title: "Alpha Lodge — booking deadline approaching".length ? expect.any(String) : "",
      body: "The deadline for our next meeting on 11th October is approaching. Please book your space by 4th October.",
      data: { type: "meeting_deadline", meeting_id: "ma" },
    });
  });
  it("two units: each lodge's members, meetings and branding only", async () => {
    const db = fakeDb(tables());
    const a = sender(), b = sender(); const push = vi.fn(async () => ({}));
    await deadline.runUnit({ db, send: a.send, push }, "u1", A, { dryRun: false, meetingId: null, testEmail: null, targetStr: target });
    await deadline.runUnit({ db, send: b.send, push }, "u2", B, { dryRun: false, meetingId: null, testEmail: null, targetStr: target });
    expect(a.sent.map((p) => p.recipientEmail)).toEqual(["a1@x"]);
    expect(b.sent.map((p) => p.recipientEmail)).toEqual(["b1@x"]);
    expect(b.sent[0].idempotencyKey).toBe("meeting-deadline-mb-b1@x");
    noOther(a.sent, { site: "beta.example", name: "Beta" });
    noOther(b.sent, { site: "alpha.example", name: "Alpha" });
  });
  it("a unit with no members sends nothing; a meeting_id from another lodge is not found", async () => {
    const t = tables(); t.profiles = t.profiles.filter((p) => p.unit_id !== "u2");
    const b = sender();
    const r = await deadline.runUnit({ db: fakeDb(t), send: b.send, push: async () => ({}) }, "u2", B, { dryRun: false, meetingId: null, testEmail: null, targetStr: target });
    expect(b.sent).toEqual([]);
    expect((r.results[0] as any).targets).toBe(0);
    const r2 = await deadline.runUnit({ db: fakeDb(tables()), send: b.send, push: async () => ({}) }, "u2", B, { dryRun: true, meetingId: "ma", testEmail: null, targetStr: target });
    expect(r2.meetings).toBe(0);
  });
});

describe("secretary-ugle-reminder per unit", () => {
  const tables = () => ({
    profiles: [
      { id: "m1", first_name: "Ann", last_name: "Able", status: "active", initiation_date: "2020-05-13", ugle_reg_number: null, unit_id: "u1" },
      { id: "m2", first_name: "Bob", last_name: "Bee", status: "active", initiation_date: "2021-01-01", ugle_reg_number: "", unit_id: "u2" },
      { id: "sa", email: "sec@a", status: "active", initiation_date: null, unit_id: "u1" },
      { id: "sb", email: "sec@b", status: "active", initiation_date: null, unit_id: "u2" },
    ],
    user_roles: [],
  });
  const H = holders({ "u1:secretary": "sa", "u2:secretary": "sb" });
  it("single-unit payload matches the previous output", async () => {
    const { sent, send } = sender();
    await ugle.runUnit({ db: fakeDb(tables(), H), send }, "u1", A, { force: false, dryRun: false, today: "2026-10-01" });
    expect(sent[0]).toEqual({
      templateName: "secretary-ugle-missing", recipientEmail: "sec@a", unitId: "u1",
      idempotencyKey: expect.stringMatching(/^secretary-ugle-2026-10-n1-/),
      templateData: {
        members: [{ name: "Ann Able", initiationLabel: "13 May 2020", url: "https://alpha.example/members/admin#member-m1" }],
        adminUrl: "https://alpha.example/members/admin", ...BRAND_A,
      },
    });
  });
  it("two units: own members to own Secretary; no Secretary = skipped, never another lodge's", async () => {
    const db = fakeDb(tables(), H); const a = sender(), b = sender();
    await ugle.runUnit({ db, send: a.send }, "u1", A, { force: false, dryRun: false, today: "2026-10-01" });
    await ugle.runUnit({ db, send: b.send }, "u2", B, { force: false, dryRun: false, today: "2026-10-01" });
    expect(JSON.stringify(a.sent)).not.toContain("Bob");
    expect(b.sent[0].recipientEmail).toBe("sec@b");
    expect(a.sent[0].idempotencyKey).not.toBe(b.sent[0].idempotencyKey);
    const c = sender();
    const r = await ugle.runUnit({ db: fakeDb(tables(), holders({ "u1:secretary": "sa" })), send: c.send }, "u2", B, { force: false, dryRun: false, today: "2026-10-01" });
    expect(r).toEqual({ sent: false, reason: "no_secretary_recipient", missing: 1 });
    expect(c.sent).toEqual([]);
  });
});

describe("secretary-returns-reminder per unit", () => {
  const today = "2026-10-01";
  const row = (id: string, due: string | null, unit: string | null, extra: any = {}) => ({
    id, return_type: "form_p", masonic_year: 2026, date_due: due, status: "draft", reminder_lead_days: null,
    member_id: unit ? `p-${id}` : null, candidate_id: unit ? null : `c-${id}`,
    member: unit ? { first_name: id, last_name: "M", unit_id: unit } : null,
    candidate: unit ? null : { first_name: id, last_name: "C" }, ...extra,
  });
  const tables = () => ({
    secretary_returns: [
      row("a-edge", "2026-10-15", "u1"),      // exactly 14 days: in
      row("a-out", "2026-10-16", "u1"),       // 15 days: out
      row("a-over", "2026-09-30", "u1"),      // yesterday: overdue
      row("a-nodate", null, "u1"),            // missing date: never in scope
      row("b-1", "2026-10-02", "u2"),
      row("cand", "2026-10-03", null),        // no unit
    ],
    profiles: [{ id: "sa", email: "sec@a", unit_id: "u1" }, { id: "sb", email: "sec@b", unit_id: "u2" }],
    user_roles: [],
  });
  const H = holders({ "u1:secretary": "sa", "u2:secretary": "sb" });
  it("single unit: unit-less rows still belong to the only lodge; window edges hold", async () => {
    const { sent, send } = sender();
    const t = tables(); t.secretary_returns = t.secretary_returns.filter((r) => !r.id.startsWith("b-"));
    const r = await returns.runUnit({ db: fakeDb(t, H), send }, "u1", A, { force: false, today, reportDate: "01 Oct 2026", singleUnit: true });
    const d = sent[0].templateData;
    expect(d.overdue.map((x: any) => x.person)).toEqual(["a-over M"]);
    expect(d.dueSoon.map((x: any) => x.person)).toEqual(["cand C", "a-edge M"]);
    expect(d.portalUrl).toBe("https://alpha.example/members/admin/returns");
    expect(sent[0].idempotencyKey).toBe("secretary-returns-u1-2026-10-01-o1-s2");
    expect(r).not.toHaveProperty("skipped_no_unit");
  });
  it("two units: unit-less rows are skipped and counted, never guessed; keys carry the unit", async () => {
    const db = fakeDb(tables(), H); const a = sender(), b = sender();
    const ra = await returns.runUnit({ db, send: a.send }, "u1", A, { force: false, today, reportDate: "x", singleUnit: false });
    const rb = await returns.runUnit({ db, send: b.send }, "u2", B, { force: false, today, reportDate: "x", singleUnit: false });
    expect(ra).toMatchObject({ skipped_no_unit: 1, overdue: 1, due_soon: 1 });
    expect(rb).toMatchObject({ skipped_no_unit: 1, overdue: 0, due_soon: 1, recipient: "sec@b" });
    expect(JSON.stringify(b.sent)).not.toContain("a-");
    noOther(b.sent, { site: "alpha.example", name: "Alpha" });
    expect(b.sent[0].idempotencyKey.startsWith("secretary-returns-u2-")).toBe(true);
  });
});

describe("almoner-overdue-check per unit", () => {
  const tables = () => ({
    profiles: [
      { id: "a1", first_name: "Ann", last_name: "A", status: "active", unit_id: "u1" },
      { id: "b1", first_name: "Bob", last_name: "B", status: "active", unit_id: "u2" },
      { id: "almA", email: "alm@a", status: "inactive", unit_id: "u1" },
      { id: "almB", email: "alm@b", status: "inactive", unit_id: "u2" },
    ],
    welfare_log_entries: [
      { member_id: "a1", contact_date: "2020-01-01", follow_up_date: "2020-01-02", is_system: false, deleted_at: null },
      { member_id: "b1", contact_date: "2020-01-01", follow_up_date: "2020-01-02", is_system: false, deleted_at: null },
    ],
    festive_board_meetings: [], festive_board_attendance: [], welfare_absences: [], user_roles: [],
    email_send_log: [
      { template_name: "almoner-overdue-digest", status: "sent", created_at: new Date(Date.now() - 2 * 86400000).toISOString(), metadata: { unit_id: "u2" } },
    ],
  });
  const H = holders({ "u1:almoner": "almA", "u2:almoner": "almB" });
  const opts = { dryRun: false, force: true, testDate: null, singleUnit: false };
  const push = async () => ({ ok: true, status: 200, json: async () => ({}) });
  it("two units: each Almoner gets only their own lodge's members and branding", async () => {
    const db = fakeDb(tables(), H); const a = sender(), b = sender();
    await almoner.runUnit({ db, send: a.send, push, now: () => 1 }, "u1", A, opts);
    await almoner.runUnit({ db, send: b.send, push, now: () => 1 }, "u2", B, opts);
    expect(a.sent[0].recipientEmail).toBe("alm@a");
    expect(a.sent[0].templateData.members.map((m: any) => m.name)).toEqual(["Ann A"]);
    expect(b.sent[0].templateData.members.map((m: any) => m.name)).toEqual(["Bob B"]);
    expect(a.sent[0].templateData.portalUrl).toBe("https://alpha.example/members/almoner");
    expect(a.sent[0].unitId).toBe("u1");
    expect(a.sent[0].idempotencyKey).toContain("almoner-weekly-u1-");
    noOther(a.sent, { site: "beta.example", name: "Beta" });
    noOther(b.sent, { site: "alpha.example", name: "Alpha" });
  });
  it("the digest window reads only this lodge's last send", async () => {
    const db = fakeDb(tables(), H); const a = sender(), b = sender();
    await almoner.runUnit({ db, send: a.send, push }, "u1", A, opts);
    await almoner.runUnit({ db, send: b.send, push }, "u2", B, opts);
    expect(a.sent[0].templateData.sinceDate).not.toBe(b.sent[0].templateData.sinceDate);
  });
  it("no Almoner in the unit = skipped with a reason, nothing emailed", async () => {
    const c = sender();
    const r = await almoner.runUnit({ db: fakeDb(tables(), holders({ "u1:almoner": "almA" })), send: c.send, push }, "u2", B, opts);
    expect(r).toMatchObject({ error: "no_almoner_recipient" });
    expect(c.sent).toEqual([]);
  });
});

describe("waitlist-refund-sweep per unit", () => {
  const today = "2026-10-01";
  const tables = () => ({
    festive_board_meetings: [
      { id: "mA", meeting_date: "2026-09-30", status: "published", unit_id: "u1" }, // yesterday: swept
      { id: "mT", meeting_date: today, status: "published", unit_id: "u1" },        // today: not yet
      { id: "mB", meeting_date: "2026-09-01", status: "published", unit_id: "u2" },
    ],
    bookings: [
      { id: "bk-a-0000", meeting_id: "mA", payment_status: "waitlisted", stripe_payment_intent_id: "pi1", environment: "live", contact_email: "a@x", unit_id: "u1", total_pence: 1000 },
      { id: "bk-t-0000", meeting_id: "mT", payment_status: "waitlisted", stripe_payment_intent_id: "pi2", environment: "live", contact_email: "t@x", unit_id: "u1" },
      { id: "bk-n-0000", meeting_id: "mA", payment_status: "waitlisted", stripe_payment_intent_id: "pi3", environment: "live", contact_email: "n@x", unit_id: "" },
      { id: "bk-b-0000", meeting_id: "mB", payment_status: "waitlisted", stripe_payment_intent_id: "pi4", environment: "live", contact_email: "b@x", unit_id: "u2" },
    ],
  });
  it("refunds only this lodge's past meetings; blank-unit bookings are skipped and counted", async () => {
    const db = fakeDb(tables()); const a = sender();
    const refund = vi.fn(async () => ({ id: "re_1" }));
    const r = await sweep.runUnit({ db, send: a.send, refund }, "u1", A, { manualMeetingId: null, today });
    expect(refund).toHaveBeenCalledTimes(1);
    expect(refund).toHaveBeenCalledWith("live", "pi1");
    expect(r).toMatchObject({ refunded: 1, skipped_no_unit: 1 });
    expect(a.sent[0]).toMatchObject({ recipientEmail: "a@x", unitId: "u1", idempotencyKey: "waitlist-refund-bk-a-0000" });
    expect(a.sent[0].templateData).toMatchObject({ ...BRAND_A, totalAmount: "£10.00", bookingRef: "bk-a-000" });
    expect(db.tables.bookings.find((b) => b.id === "bk-b-0000")!.payment_status).toBe("waitlisted");
  });
});

describe("notify-waitlist-promoted per unit", () => {
  it("only this lodge's bookings, with its own branding", async () => {
    const db = fakeDb({
      bookings: [
        { id: "pa-000000", promoted_from_waitlist: true, payment_status: "confirmed", promotion_notified_at: null, unit_id: "u1", contact_email: "a@x", event_label: "Festive Board" },
        { id: "pb-000000", promoted_from_waitlist: true, payment_status: "confirmed", promotion_notified_at: null, unit_id: "u2", contact_email: "b@x", event_label: "Festive Board" },
      ],
      festive_board_meetings: [],
    });
    const a = sender();
    const r = await promoted.runUnit({ db, send: a.send }, "u1", A, null);
    expect(r).toEqual({ processed: 1, sent: 1 });
    expect(a.sent[0]).toEqual({
      templateName: "waitlist-promoted", recipientEmail: "a@x", idempotencyKey: "waitlist-promoted-pa-000000", unitId: "u1",
      templateData: { firstName: undefined, eventLabel: "Festive Board", eventDate: "", bookingRef: "pa-00000", ...BRAND_A },
    });
    expect(db.tables.bookings[1].promotion_notified_at).toBeNull();
  });
});

describe("notify-poll-opened per caller unit", () => {
  it("emails and pushes only the caller's lodge", async () => {
    const db = fakeDb({ profiles: [
      { id: "a1", email: "a1@x", status: "active", unit_id: "u1" },
      { id: "a2", email: null, status: "active", unit_id: "u1" },
      { id: "b1", email: "b1@x", status: "active", unit_id: "u2" },
    ] });
    const a = sender(); const push = vi.fn(async () => ({}));
    const r = await poll.runUnit({ db, send: a.send, push }, "u1", A, { id: "p1", question: "Q?", options: ["Y", "N"], closes_at: null, results_visibility: "live" }, null);
    expect(r).toMatchObject({ sent: 1, recipients: 1 });
    expect(a.sent[0]).toEqual({
      templateName: "poll-opened", recipientEmail: "a1@x", idempotencyKey: "poll-open-p1-a1@x", unitId: "u1",
      templateData: { question: "Q?", options: ["Y", "N"], dashboardUrl: "https://alpha.example/members/dashboard", closesAt: null, liveResults: true, ...BRAND_A },
    });
    expect(push).toHaveBeenCalledWith({ member_ids: ["a1", "a2"], title: "New poll", body: "Q?", data: { type: "poll", poll_id: "p1" } });
  });
});

describe("notify-year-audit per caller unit", () => {
  it("uses this lodge's office holders and skips a holder from another lodge", async () => {
    const db = fakeDb({ profiles: [
      { id: "t1", email: "t1@x", full_name: "T One", unit_id: "u1" },
      { id: "au", email: "au@x", full_name: "Aud", unit_id: "u2" },
    ] }, holders({ "u1:auditor_1": "au", "u1:auditor_2": "t1" }));
    const a = sender();
    const r = await audit.runUnit({ db, send: a.send }, "u1", A, { id: "ap", masonic_year: 2025, round_number: 1 }, ["auditor_1", "auditor_2"], "review_needed", "", "t1");
    expect(r).toEqual({ sent: 1, failures: [], skipped_other_unit: 1 });
    expect(a.sent[0]).toMatchObject({ recipientEmail: "t1@x", unitId: "u1", templateData: { yearLabel: "FY 2025/26", url: "https://alpha.example/members", actor: "T One", ...BRAND_A } });
  });
});

describe("source guards for the eight functions", () => {
  const fns = ["meeting-deadline-reminder", "almoner-overdue-check", "secretary-ugle-reminder", "secretary-returns-reminder", "waitlist-refund-sweep", "notify-waitlist-promoted", "notify-poll-opened", "notify-year-audit"];
  const src = (f: string, file: string) => { try { return readFileSync(`supabase/functions/${f}/${file}`, "utf8"); } catch { return ""; } };
  it.each(fns)("%s: no no-argument loadLodgeSettings(), no module-level let/var, no host-lodge literal", (f) => {
    const code = (src(f, "index.ts") + src(f, "run.ts")).replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/loadLodgeSettings\(\s*\)/);
    expect(code).not.toMatch(/^(let|var)\s/m);
    expect(code).not.toMatch(/weybridge|6787/i);
  });
  it.each(fns.slice(0, 6))("%s: scheduled entry runs per unit through the shared helper", (f) => {
    const code = src(f, "index.ts");
    expect(code).toContain("forEachUnit(");
    expect(code).toContain("loadLodgeSettingsStrict(unitId)");
  });
});
