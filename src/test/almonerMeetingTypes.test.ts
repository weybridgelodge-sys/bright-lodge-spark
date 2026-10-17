import { describe, it, expect } from "vitest";
import { countsForAlmoner } from "../../supabase/functions/_shared/almonerMeetingTypes";
import { computeCheckInFlags } from "../../supabase/functions/_shared/almonerCheckIn";
import { evaluateAutoLog } from "../../supabase/functions/_shared/almonerAutoLog";

const est = { id: "w", initiation_date: "2010-01-01" };
const now = new Date("2026-10-30T12:00:00Z");
const pair = (t1: string, t2: string, cancelled2?: string) => {
  const ms = [
    { id: "a", meeting_date: "2026-09-12", meeting_type: t1 },
    { id: "b", meeting_date: "2026-10-21", meeting_type: t2, cancelled_at: cancelled2 ?? null },
  ];
  const att = ms.map((m) => ({ member_id: "x", meeting_id: m.id, attendance_status: "attended" }));
  return { ms, att };
};
const flagged = (t1: string, t2: string, c?: string) => {
  const { ms, att } = pair(t1, t2, c);
  return !!computeCheckInFlags(ms, att, ["w"], now)["w"];
};
const logged = (t1: string, t2: string, c?: string) => {
  const { ms, att } = pair(t1, t2, c);
  return evaluateAutoLog(ms, att, [est], "2026-10-30").length > 0;
};

describe("Almoner counted meeting types", () => {
  it("Regular, Installation, Dispensation and Emergency all count", () => {
    for (const t of ["regular", "installation", "dispensation", "emergency"]) expect(countsForAlmoner({ meeting_type: t })).toBe(true);
    expect(flagged("dispensation", "installation")).toBe(true);
    expect(logged("dispensation", "installation")).toBe(true);
    expect(logged("regular", "regular")).toBe(true);
  });
  it("Emergency meetings count", () => {
    expect(flagged("regular", "emergency")).toBe(true);
    expect(logged("regular", "emergency")).toBe(true);
  });
  it("Cancelled meetings do not count", () => {
    expect(countsForAlmoner({ meeting_type: "installation", cancelled_at: "2026-10-01" })).toBe(false);
    expect(flagged("regular", "installation", "2026-10-01")).toBe(false);
    expect(logged("regular", "installation", "2026-10-01")).toBe(false);
  });
});
