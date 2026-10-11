import { describe, it, expect } from "vitest";
import { evaluateAutoLog } from "../../supabase/functions/_shared/almonerAutoLog";
import { computeCheckInFlags, ackDatesFromLogs } from "../../supabase/functions/_shared/almonerCheckIn";

const M = (id: string, d: string) => ({ id, meeting_date: d, meeting_type: "regular" });
const feb = M("feb", "2026-02-18"), may = M("may", "2026-05-13"), sep = M("sep", "2026-09-12"), dec = M("dec", "2026-12-09");
const rec = (ms: any[]) => ms.map((m) => ({ member_id: "x", meeting_id: m.id, attendance_status: "attended" }));
const est = { id: "w", initiation_date: "2010-01-01" };
const now = new Date("2026-10-11T12:00:00Z");
const later = new Date("2026-12-20T12:00:00Z");

describe("Almoner contact acknowledges flags", () => {
  const ms = [feb, may, sep];
  const att = [...rec(ms), { member_id: "w", meeting_id: "feb", attendance_status: "apologies" }];

  it("badge shows without a contact, clears after a contact dated after the misses", () => {
    expect(computeCheckInFlags(ms, att, ["w"], now)["w"]).toBeTruthy();
    expect(computeCheckInFlags(ms, att, ["w"], now, { w: "2026-09-15" })["w"]).toBeUndefined();
  });
  it("a contact dated before the misses does not hide them", () => {
    expect(computeCheckInFlags(ms, att, ["w"], now, { w: "2026-01-01" })["w"]).toBeTruthy();
  });
  it("one fresh miss after the contact brings the badge back", () => {
    const all = [...ms, dec];
    expect(computeCheckInFlags(all, [...att, ...rec([dec])], ["w"], later, { w: "2026-09-15" })["w"]).toBeTruthy();
  });
  it("attending after the contact keeps it silent", () => {
    const all = [...ms, dec];
    const a = [...att, ...rec([dec]), { member_id: "w", meeting_id: "dec", attendance_status: "attended" }];
    expect(computeCheckInFlags(all, a, ["w"], later, { w: "2026-09-15" })["w"]).toBeUndefined();
  });
  it("system and deleted entries never acknowledge", () => {
    expect(ackDatesFromLogs([
      { member_id: "w", contact_date: "2026-09-20", is_system: true },
      { member_id: "w", contact_date: "2026-09-21", deleted_at: "2026-09-22" },
      { member_id: "w", contact_date: "2026-03-01" },
    ])).toEqual({ w: "2026-03-01" });
  });

  it("Tier 1: no entry for an acknowledged gap; a fresh miss creates a new keyed entry", () => {
    const all = [feb, may, sep, dec];
    const a = rec(all);
    expect(evaluateAutoLog(all, a, [est], "2026-10-11", undefined, [], { w: "2026-09-15" })).toEqual([]);
    const base = evaluateAutoLog(all, a, [est], "2026-10-11");
    expect(base.map((e) => e.key)).toEqual(["t1c:feb"]);
    const fresh = evaluateAutoLog(all, a, [est], "2026-12-20", undefined, [], { w: "2026-09-15" });
    expect(fresh.map((e) => e.key)).toEqual(["t1c:feb:dec"]);
    // Rerun gives the same stable key, so no duplicate.
    expect(evaluateAutoLog(all, a, [est], "2026-12-20", undefined, [], { w: "2026-09-15" }).map((e) => e.key)).toEqual(["t1c:feb:dec"]);
  });
  it("Tier 1 without any contact keeps the original single entry", () => {
    const all = [feb, may, sep, dec];
    expect(evaluateAutoLog(all, rec(all), [est], "2026-12-20").map((e) => e.key)).toEqual(["t1c:feb"]);
  });
  it("Tier 2: misses on or before the contact are not logged; later ones are", () => {
    const nm = { id: "w", initiation_date: "2026-01-01" };
    const out = evaluateAutoLog([feb, may, sep], rec([feb, may, sep]), [nm], "2026-10-11", undefined, [], { w: "2026-05-13" });
    expect(out.map((e) => e.key)).toEqual(["t2:sep"]);
  });
});
