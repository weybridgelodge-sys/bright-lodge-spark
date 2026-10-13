import { describe, it, expect } from "vitest";
import { countVisitorVisits } from "@/lib/kpis";
const row = (id: string, status: string, date: string) => ({
  visitor_contact_id: id,
  festive_board_attendance: { attendance_status: status, festive_board_meetings: { meeting_date: date } },
});
describe("visitor visits", () => {
  it("apologies, no-show and cancelled are not visits and don't move Last Seen", () => {
    const r = countVisitorVisits([
      row("ben", "attended", "2026-05-13"), row("ben", "apologies", "2026-09-12"),
      row("stu", "apologies", "2026-09-12"), row("stu", "no_show", "2026-05-13"),
      row("stu", "cancelled_refunded", "2026-02-18"),
    ], "2026-10-13");
    expect(r.counts).toEqual({ ben: 1 });
    expect(r.lastSeen.ben).toBe("2026-05-13");
  });
  it("booked counts; future meetings don't", () => {
    const r = countVisitorVisits([row("a", "booked", "2026-02-18"), row("a", "booked", "2026-10-21")], "2026-10-13");
    expect(r.counts.a).toBe(1);
    expect(r.lastSeen.a).toBe("2026-02-18");
  });
});

import { isRecentVisitor } from "@/lib/kpis";
describe("summons pre-tick", () => {
  const cutoff = new Date("2024-10-13").getTime();
  it("never-attended visitor is not pre-ticked", () => expect(isRecentVisitor(null, cutoff)).toBe(false));
  it("visit within two years is pre-ticked", () => expect(isRecentVisitor("2026-05-13", cutoff)).toBe(true));
  it("visit older than two years is not", () => expect(isRecentVisitor("2024-01-10", cutoff)).toBe(false));
});
