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

  it("year-only with no installation month is not listed", () => {
    const ms = milestones([member("f")], [{ member_id: "f", lodge_year: 2017, installed_on: null }], window2027, () => null);
    expect(ms).toEqual([]);
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

// Live-shaped window: 21 Oct 2026 to 19 Oct 2027.
const live = { start: "2026-10-21", end: "2027-10-19" };
const wm = (installed_on: string | null, lodge_year: number, month = oct) =>
  milestones([member("m")], [{ member_id: "m", lodge_year, installed_on }], live, month).filter((x) => x.kind === "wm");

describe("KPI WM milestones at the window edges", () => {
  it("exact date on the start boundary is included", () => {
    expect(wm("2016-10-21", 2016).map(milestoneDateLabel)).toEqual(["21/10/2026"]);
  });
  it("exact date on the end boundary is included", () => {
    expect(wm("2017-10-19", 2017).map(milestoneDateLabel)).toEqual(["19/10/2027"]);
  });
  it("one day before the start is excluded (Smith, 19/10/2016)", () => {
    expect(wm("2016-10-19", 2016)).toEqual([]);
    expect(wm("2016-10-20", 2016)).toEqual([]);
  });
  it("one day after the end is excluded", () => {
    expect(wm("2017-10-20", 2017)).toEqual([]);
  });
  it("year-only, month wholly inside the window, shows month+year", () => {
    expect(wm(null, 2017, () => 3).map(milestoneDateLabel)).toEqual(["March 2027"]);
  });
  it("year-only, month straddling the window start is not shown", () => {
    expect(wm(null, 2016)).toEqual([]);
  });
  it("year-only, month straddling the window end is not shown", () => {
    expect(wm(null, 2017)).toEqual([]);
  });
  it("no roll entry gives no milestone", () => {
    expect(milestones([member("m")], [], live, oct)).toEqual([]);
  });
  it("Coleman 15/10/2027 and Scott 18/10/2027 still show", () => {
    expect(wm("1997-10-15", 1997).map(milestoneDateLabel)).toEqual(["15/10/2027"]);
    expect(wm("2017-10-18", 2017).map(milestoneDateLabel)).toEqual(["18/10/2027"]);
  });
});
