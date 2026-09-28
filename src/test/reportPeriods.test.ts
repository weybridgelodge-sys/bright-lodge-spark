import { describe, it, expect } from "vitest";
import {
  addMonths, agreement, bsAsAt, bsComparative, buildAccountDrill, ieComparative, ieRange, masonicYearOptions,
  monthEnd, monthRange, monthsOfYear, sumForRange, yearRange, ytdRange, type DrillSourceLine,
} from "@/lib/treasurer/reportPeriods";

const sel = (o: Partial<Parameters<typeof ieRange>[0]>) =>
  ({ kind: "month", ym: "2026-03", year: 2025, customStart: "2026-01-01", customEnd: "2026-01-31", ...o }) as Parameters<typeof ieRange>[0];

describe("report period ranges", () => {
  it("month / ytd / year bounds", () => {
    expect(monthRange("2026-02")).toMatchObject({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(ytdRange("2026-03")).toMatchObject({ start: "2025-10-01", end: "2026-03-31" });
    expect(ytdRange("2026-11")).toMatchObject({ start: "2026-10-01", end: "2026-11-30" });
    expect(yearRange(2025)).toMatchObject({ start: "2025-10-01", end: "2026-09-30" });
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("comparatives", () => {
    expect(ieComparative(sel({}), "previous")).toMatchObject({ start: "2026-02-01", end: "2026-02-28" });
    expect(ieComparative(sel({}), "last_year")).toMatchObject({ start: "2025-03-01", end: "2025-03-31" });
    expect(ieComparative(sel({ kind: "ytd" }), "previous")).toMatchObject({ start: "2024-10-01", end: "2025-03-31" });
    expect(ieComparative(sel({ kind: "year" }), "previous")).toMatchObject({ start: "2024-10-01", end: "2025-09-30" });
    expect(ieComparative(sel({ kind: "custom" }), "previous")).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
    const b = { kind: "month" as const, ym: "2026-03", year: 2025, customDate: "2026-03-15" };
    expect(bsAsAt(b).date).toBe("2026-03-31");
    expect(bsComparative(b, "previous").date).toBe("2026-02-28");
    expect(bsComparative(b, "last_year").date).toBe("2025-03-31");
    expect(bsComparative({ ...b, kind: "year" }, "last_year").date).toBe("2025-09-30");
  });

  it("the 12 months tile the masonic year exactly", () => {
    const ms = monthsOfYear(2025).map(monthRange);
    expect(ms[0].start).toBe("2025-10-01");
    expect(ms[11].end).toBe("2026-09-30");
    for (let i = 1; i < 12; i++) expect(ms[i].start > ms[i - 1].end).toBe(true);
    expect(ytdRange("2026-09")).toMatchObject(yearRange(2025) && { start: "2025-10-01", end: "2026-09-30" });
  });

  it("year options include future years that have periods", () => {
    expect(masonicYearOptions(2025, [])).toEqual([2026, 2025]);
    expect(masonicYearOptions(2025, ["2025-10-01", "2027-09-01", null])).toEqual([2026, 2025]);
    expect(masonicYearOptions(2026, ["2024-12-01"])).toEqual([2027, 2026, 2024]);
  });
});

const L = (id: string, n: number, date: string, debit: number, credit: number, desc = "x"): DrillSourceLine =>
  ({ id, entry_id: `e${n}`, entry_number: n, entry_date: date, entry_description: desc, line_description: "", source_type: null, debit, credit });

const sample = [
  L("a", 1, "2025-10-01", 0, 300000, "Opening balance"),
  L("b", 5, "2025-11-12", 0, 25000),
  L("c", 3, "2025-11-12", 0, 25000),
  L("d", 9, "2026-03-04", 2500, 0),
  L("e", 12, "2026-09-30", 0, 25000),
  L("f", 20, "2026-10-01", 0, 99999),
];

describe("account drill-down totals", () => {
  it("sorts by date then doc no., with running balance and opening flag", () => {
    const d = buildAccountDrill(sample.slice(0, 5), "income");
    expect(d.rows.map((r) => r.entry_number)).toEqual([1, 3, 5, 9, 12]);
    expect(d.rows[0].opening).toBe(true);
    expect(d.rows.at(-1)!.running).toBe(d.total);
    expect(d.total).toBe(372500);
  });

  it("sum of monthly figures equals the annual figure, and drill totals agree", () => {
    const monthly = monthsOfYear(2025).map((ym) => {
      const r = monthRange(ym);
      return sumForRange(sample, "income", r.start, r.end);
    });
    const y = yearRange(2025);
    const annual = sumForRange(sample, "income", y.start, y.end);
    expect(monthly.reduce((a, b) => a + b, 0)).toBe(annual);
    const inYear = sample.filter((l) => l.entry_date >= y.start && l.entry_date <= y.end);
    expect(agreement(buildAccountDrill(inYear, "income").total, annual)).toEqual({ agrees: true, difference: 0 });
    expect(agreement(annual - 1, annual).agrees).toBe(false);
  });
});
