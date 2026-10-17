import { describe, expect, it } from "vitest";
import { inferSchedule, outsideSchedule, planSchedule, type ScheduleMeeting, type ScheduleMonth } from "@/lib/meetingDiary";

const m = (d: string, t: "regular" | "installation" = "regular", status = "draft"): ScheduleMeeting => ({ id: d, meeting_date: d, meeting_type: t, cancelled_at: null, status });
// The seven meetings in the diary today.
const diary = [m("2026-09-12"), m("2026-02-18"), m("2026-05-13"), m("2027-05-12"), m("2027-02-17"), m("2026-12-09"), m("2026-10-21", "installation")];

describe("per-month meeting schedule", () => {
  const sched = inferSchedule(diary);
  it("infers Feb 3rd Wed, May 2nd Wed, Oct 3rd Wed installation, Dec 2nd Wed", () => {
    expect(sched).toEqual([
      { month: 2, weekday: 3, ordinal: "3", meeting_type: "regular" },
      { month: 5, weekday: 3, ordinal: "2", meeting_type: "regular" },
      { month: 10, weekday: 3, ordinal: "3", meeting_type: "installation" },
      { month: 12, weekday: 3, ordinal: "2", meeting_type: "regular" },
    ]);
  });
  it("shows the Saturday 12 Sep draft as outside schedule", () => {
    expect(outsideSchedule(sched, diary).map((x) => x.meeting_date)).toEqual(["2026-09-12"]);
  });
  it("season 2026 skips all four existing meetings", () => {
    const p = planSchedule(sched, 2026, 10, diary);
    expect(p.map((r) => [r.date, r.status])).toEqual([["2026-10-21", "existing"], ["2026-12-09", "existing"], ["2027-02-17", "existing"], ["2027-05-12", "existing"]]);
  });
  it("season 2027 gives 4 new meetings a year", () => {
    const p = planSchedule(sched, 2027, 10, diary);
    expect(p.filter((r) => r.status === "new").map((r) => r.date)).toEqual(["2027-10-20", "2027-12-08", "2028-02-16", "2028-05-10"]);
  });
  it("flags a month whose meeting sits on another date as moved, not new", () => {
    const p = planSchedule(sched, 2026, 10, [...diary.filter((x) => x.id !== "2026-12-09"), m("2026-12-02")]);
    expect(p.find((r) => r.date === "2026-12-09")).toMatchObject({ status: "moved", existingDate: "2026-12-02" });
  });
  it("never generates unticked months; monthly unit gives 12", () => {
    const monthly: ScheduleMonth[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ordinal: "2", weekday: 4, meeting_type: "regular" }));
    expect(planSchedule(monthly, 2026, 10, []).length).toBe(12);
    expect(planSchedule(sched, 2027, 10, []).length).toBe(4);
  });
  it("starts empty when nothing can be inferred", () => expect(inferSchedule([])).toEqual([]));
});
