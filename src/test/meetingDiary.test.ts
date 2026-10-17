import { describe, expect, it } from "vitest";
import { generateSeriesDates, planSeries, planMove, dependencyWarnings, installationEffect, type DiaryMeeting } from "@/lib/meetingDiary";
import { masonicStartYearOf, type InstallationConfig } from "../../supabase/functions/_shared/masonicYear";

const cfg: InstallationConfig = {
  rule: { mode: "weekday_rule", installation_month: 10, installation_ordinal: "3", installation_weekday: 3, fixed_day: null, applies_from_year: null },
  stored: { 2026: "2026-10-21" },
};

describe("repeating meeting series", () => {
  it("2nd Thursday, October to May, spans the year end", () => {
    const d = generateSeriesDates({ ordinal: "2", weekday: 4, months: [10, 11, 12, 1, 2, 3, 4, 5] }, 2026);
    expect(d).toEqual(["2026-10-08", "2026-11-12", "2026-12-10", "2027-01-14", "2027-02-11", "2027-03-11", "2027-04-08", "2027-05-13"]);
  });
  it("last weekday of month", () => {
    expect(generateSeriesDates({ ordinal: "last", weekday: 3, months: [12] }, 2026)).toEqual(["2026-12-30"]);
  });
  it("skips dates already in the diary but not cancelled ones", () => {
    const meetings: DiaryMeeting[] = [
      { id: "a", meeting_date: "2026-12-09", meeting_type: "regular", cancelled_at: null },
      { id: "b", meeting_date: "2027-02-17", meeting_type: "regular", cancelled_at: "2026-10-01T00:00:00Z" },
    ];
    const p = planSeries({ ordinal: "2", weekday: 3, months: [12] }, 2026, meetings);
    expect(p.existing).toEqual(["2026-12-09"]);
    expect(planSeries({ ordinal: "3", weekday: 3, months: [2] }, 2027, meetings).toAdd).toEqual(["2027-02-17"]);
  });
});

describe("move and drop", () => {
  const meetings: DiaryMeeting[] = [
    { id: "inst", meeting_date: "2026-10-21", meeting_type: "installation", cancelled_at: null },
    { id: "reg", meeting_date: "2026-12-09", meeting_type: "regular", cancelled_at: null },
    { id: "gone", meeting_date: "2027-01-13", meeting_type: "regular", cancelled_at: "2026-10-01T00:00:00Z" },
  ];
  it("moving the Installation moves the stored override", () => {
    expect(planMove(meetings, "inst", "2026-10-28")).toEqual({ ok: true, installationOverride: { year: 2026, date: "2026-10-28" } });
  });
  it("moving a regular meeting has no override", () => {
    expect(planMove(meetings, "reg", "2026-12-16")).toEqual({ ok: true, installationOverride: null });
  });
  it("rejects a clash, a cancelled meeting and the same date", () => {
    expect(planMove(meetings, "reg", "2026-10-21").ok).toBe(false);
    expect(planMove(meetings, "gone", "2027-01-20").ok).toBe(false);
    expect(planMove(meetings, "reg", "2026-12-09").ok).toBe(false);
  });
  it("can move onto the date of a cancelled meeting", () => {
    expect(planMove(meetings, "reg", "2027-01-13").ok).toBe(true);
  });
  it("warns about attached history before dropping", () => {
    expect(dependencyWarnings({ attendance: 30, bookings: 1, summonses: 1, dining_invoices: 0, booking_page: 1 }))
      .toEqual(["30 attendance records", "1 booking", "1 summons", "a booking page"]);
    expect(dependencyWarnings({ attendance: 0, bookings: 0, summonses: 0, dining_invoices: 0, booking_page: 0 })).toEqual([]);
  });
  it("moving the Installation shifts the KPI period boundary", () => {
    const e = installationEffect(cfg, 2026, "2026-10-28");
    expect(e.before.previous?.end).toBe("2026-10-20");
    expect(e.after.previous?.end).toBe("2026-10-27");
    expect(e.after.next?.start).toBe("2026-10-28");
  });
});

describe("officer year lookup (Installation 21 Oct 2026)", () => {
  it.each([
    ["2026-09-30", 2025],
    ["2026-10-01", 2025],
    ["2026-10-20", 2025],
    ["2026-10-21", 2026],
  ])("%s → %i", (date, year) => {
    expect(masonicStartYearOf(date, cfg)).toBe(year);
  });
  it("falls back to the rule when no date is stored", () => {
    const noStore = { ...cfg, stored: {} };
    expect(masonicStartYearOf("2026-10-20", noStore)).toBe(2025);
    expect(masonicStartYearOf("2026-10-21", noStore)).toBe(2026);
    expect(masonicStartYearOf("2027-10-19", noStore)).toBe(2026);
    expect(masonicStartYearOf("2027-10-20", noStore)).toBe(2027);
  });
});
