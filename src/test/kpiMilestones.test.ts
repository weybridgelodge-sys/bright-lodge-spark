import { describe, it, expect } from "vitest";
import { milestones, milestoneDateLabel, type KpiMember } from "@/lib/kpis";

const member = (id: string): KpiMember => ({ id, first_name: "A", last_name: id, status: "active" } as unknown as KpiMember);
const window2027 = { start: "2027-10-01", end: "2028-09-30" };
const oct = () => 10;

describe("KPI WM milestones from the Past Masters roll", () => {
  it("uses the exact installed_on anniversary", () => {
    const ms = milestones([member("s")], [{ member_id: "s", lodge_year: 2017, installed_on: "2017-10-18" }], window2027, oct);
    expect(ms).toHaveLength(1);
    expect(ms[0].date).toBe("2027-10-18");
    expect(milestoneDateLabel(ms[0])).toBe("18/10/2027");
  });

  it("year-only shows month and year, never a day", () => {
    const ms = milestones([member("f")], [{ member_id: "f", lodge_year: 2017, installed_on: null }], window2027, oct);
    expect(ms).toHaveLength(1);
    expect(milestoneDateLabel(ms[0])).toBe("October 2027");
  });

  it("year-only with no installation month shows just the year", () => {
    const ms = milestones([member("f")], [{ member_id: "f", lodge_year: 2017, installed_on: null }], window2027, () => null);
    expect(milestoneDateLabel(ms[0])).toBe("2027");
  });

  it("uses the earliest of two terms", () => {
    const ms = milestones(
      [member("c")],
      [
        { member_id: "c", lodge_year: 2009, installed_on: "2009-10-21" },
        { member_id: "c", lodge_year: 1997, installed_on: "1997-10-15" },
      ],
      { start: "2022-10-01", end: "2023-09-30" },
      oct,
    );
    expect(ms.map((m) => m.date)).toEqual(["2022-10-15"]);
    expect(ms[0].years).toBe(25);
  });

  it("member with no roll entry gets no WM milestone", () => {
    const ms = milestones([member("x")], [{ member_id: "other", lodge_year: 2017, installed_on: "2017-10-18" }], window2027, oct);
    expect(ms.filter((m) => m.kind === "wm")).toEqual([]);
  });

  it("sorts a month-only entry after exact days in that month", () => {
    const ms = milestones(
      [member("f"), member("s")],
      [
        { member_id: "f", lodge_year: 2017, installed_on: null },
        { member_id: "s", lodge_year: 2017, installed_on: "2017-10-18" },
      ],
      window2027, oct,
    );
    expect(ms.map(milestoneDateLabel)).toEqual(["18/10/2027", "October 2027"]);
  });
});
