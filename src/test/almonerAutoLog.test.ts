import { describe, it, expect } from "vitest";
import { evaluateAutoLog } from "../../supabase/functions/_shared/almonerAutoLog";
import { disengagementRisk } from "@/lib/kpis";

const M = (id: string, d: string) => ({ id, meeting_date: d, meeting_type: "regular" });
const feb = M("feb", "2026-02-18"), may = M("may", "2026-05-13"), sep = M("sep", "2026-09-12");
const old = M("old", "2025-11-12");
const meetings = [old, feb, may, sep];
// someone else is recorded at each meeting so they count as "recorded"
const base = meetings.map((m) => ({ member_id: "x", meeting_id: m.id, attendance_status: "attended" }));
const today = "2026-10-11";
const est = { id: "w", initiation_date: "2010-01-01" };

describe("Disengagement Risk = Tier 1 rule", () => {
  const member: any = { id: "w", status: "active", is_honorary_member: false, initiation_date: "2010-01-01" };
  const eng = (att: any[], absences: any[] = []) => ({ meetings: [feb, may, sep], attendance: [...base, ...att], absences, visitors: [] });
  const ids = (e: any, mem = member) => disengagementRisk([mem], e, today).members.map((m) => m.id);
  it("flags 2 consecutive unexcused misses after an apology (Aldington-Smyth pattern)", () => {
    expect(ids(eng([{ member_id: "w", meeting_id: "feb", attendance_status: "apologies" }]))).toEqual(["w"]);
  });
  it("does not flag booked then two apologies (French / Mallard pattern)", () => {
    expect(ids(eng([
      { member_id: "w", meeting_id: "feb", attendance_status: "booked" },
      { member_id: "w", meeting_id: "may", attendance_status: "apologies" },
      { member_id: "w", meeting_id: "sep", attendance_status: "apologies" }]))).toEqual([]);
  });
  it("a single unexcused miss is not enough", () => {
    expect(ids(eng([
      { member_id: "w", meeting_id: "feb", attendance_status: "attended" },
      { member_id: "w", meeting_id: "may", attendance_status: "apologies" }]))).toEqual([]);
  });
  it("excludes honorary members", () => {
    expect(ids(eng([]), { ...member, is_honorary_member: true })).toEqual([]);
  });
  it("a welfare absence covering a meeting excuses it, in both KPI and Auto-Log", () => {
    const abs = [{ member_id: "w", period_start: "2026-05-01", period_end: "2026-05-31" }];
    expect(ids(eng([{ member_id: "w", meeting_id: "feb", attendance_status: "attended" }], abs))).toEqual([]);
    expect(evaluateAutoLog(meetings, [...base, { member_id: "w", meeting_id: "feb", attendance_status: "attended" }], [est], today, undefined, abs)).toEqual([]);
  });
  it("agrees with Auto-Log Tier 1 on the same data", () => {
    const att = [...base, { member_id: "w", meeting_id: "feb", attendance_status: "apologies" }];
    const t1 = evaluateAutoLog(meetings, att, [est], today).filter((e) => e.tier === 1).map((e) => e.member_id);
    expect(ids({ meetings: [feb, may, sep], attendance: att, absences: [], visitors: [] })).toEqual([...new Set(t1)]);
  });
});

describe("Almoner Auto-Log", () => {
  it("Tier 1: apology Feb then two unexplained misses → one consecutive entry", () => {
    const r = evaluateAutoLog(meetings, [...base, { member_id: "w", meeting_id: "feb", attendance_status: "apologies" }], [est], today);
    expect(r.map((e) => e.key)).toEqual(["t1c:may"]);
    expect(r[0].trigger_date).toBe("2026-09-12");
  });
  it("Tier 1: one apology does not clear another meeting's miss and a single miss is not enough", () => {
    const r = evaluateAutoLog(meetings, [...base,
      { member_id: "w", meeting_id: "feb", attendance_status: "attended" },
      { member_id: "w", meeting_id: "may", attendance_status: "apologies" }], [est], today);
    expect(r).toEqual([]);
  });
  it("Tier 1: 3 consecutive misses produce one entry, not a separate year entry", () => {
    const r = evaluateAutoLog(meetings, base, [est], today);
    expect(r.map((e) => e.key)).toEqual(["t1c:feb"]);
  });
  it("Tier 1: 3 non-consecutive misses in a lodge year trigger a year entry", () => {
    const ms = [M("a", "2025-10-15"), M("b", "2025-11-12"), M("c", "2026-02-18"), M("d", "2026-03-11"), M("e", "2026-05-13")];
    const att = [...ms.map((m) => ({ member_id: "x", meeting_id: m.id, attendance_status: "attended" })),
      { member_id: "w", meeting_id: "d", attendance_status: "attended" }];
    // from Feb only: c miss, d present, e miss → 2 misses, no trigger
    expect(evaluateAutoLog(ms, att, [est], today)).toEqual([]);
    // window opened earlier for the rule itself: a miss, b present, c miss, d present, e miss → 3 in year
    const att2 = [...att, { member_id: "w", meeting_id: "b", attendance_status: "attended" }];
    expect(evaluateAutoLog(ms, att2, [est], today, "2025-10-01").map((e) => e.key)).toEqual(["t1y:2025"]);
  });
  it("ignores meetings before 18 Feb 2026", () => {
    const r = evaluateAutoLog(meetings, [...base,
      { member_id: "w", meeting_id: "feb", attendance_status: "attended" },
      { member_id: "w", meeting_id: "may", attendance_status: "attended" }], [est], today);
    expect(r).toEqual([]); // only old + sep missed; old is outside the window
  });
  it("Tier 2: new member's single apologised miss is logged", () => {
    const nm = { id: "n", initiation_date: "2026-01-14" };
    const r = evaluateAutoLog(meetings, [...base,
      { member_id: "n", meeting_id: "feb", attendance_status: "attended" },
      { member_id: "n", meeting_id: "may", attendance_status: "apologies" },
      { member_id: "n", meeting_id: "sep", attendance_status: "attended" }], [nm], today);
    expect(r.map((e) => [e.key, e.tier])).toEqual([["t2:may", 2]]);
  });
  it("Tier 2 ends 12 months after initiation; meetings before initiation are ignored", () => {
    const nm = { id: "n", initiation_date: "2025-05-01" };
    const r = evaluateAutoLog(meetings, [...base, { member_id: "n", meeting_id: "may", attendance_status: "apologies" }], [nm], today);
    // feb: new, missed → t2:feb ; may (after 1 May 2026) established, apology ; sep miss → streak 1
    expect(r.map((e) => e.key)).toEqual(["t2:feb"]);
    const late = { id: "l", initiation_date: "2026-06-01" };
    expect(evaluateAutoLog(meetings, base, [late], today).map((e) => e.key)).toEqual(["t2:sep"]);
  });
  it("same unresolved gap yields the same key on rerun", () => {
    const a = evaluateAutoLog(meetings, base, [est], today).map((e) => e.key);
    const b = evaluateAutoLog(meetings, base, [est], "2026-10-12").map((e) => e.key);
    expect(a).toEqual(b);
  });
});
