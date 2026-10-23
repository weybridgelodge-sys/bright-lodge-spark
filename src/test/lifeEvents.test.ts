import { describe, it, expect } from "vitest";
import { upcomingManualDate, nextOccurrence, dateKey } from "@/lib/lifeEvents";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const key = (iso: string, rec: boolean, today: Date) => {
  const d = upcomingManualDate(iso, rec, today);
  return d ? dateKey(d) : null;
};
const T = day(2026, 10, 23);

describe("manual life event window", () => {
  it("recurring past date rolls to next year and is excluded beyond 92 days", () => {
    expect(dateKey(nextOccurrence("2026-09-10", true, T))).toBe("2027-09-10");
    expect(key("2026-09-10", true, T)).toBeNull();
  });
  it("recurring date 30 days ahead is included", () => {
    expect(key("2001-11-22", true, T)).toBe("2026-11-22");
  });
  it("non-recurring past date is excluded", () => {
    expect(key("2026-09-10", false, T)).toBeNull();
  });
  it("non-recurring date within 92 days is included", () => {
    expect(key("2027-01-15", false, T)).toBe("2027-01-15");
    expect(key("2027-01-23", false, T)).toBe("2027-01-23"); // day 92
    expect(key("2027-01-24", false, T)).toBeNull(); // day 93
  });
  it("non-recurring today and yesterday included, two days ago excluded", () => {
    expect(key("2026-10-23", false, T)).toBe("2026-10-23");
    expect(key("2026-10-22", false, T)).toBe("2026-10-22");
    expect(key("2026-10-21", false, T)).toBeNull();
  });
  it("crosses the year end", () => {
    expect(key("2010-01-05", true, day(2026, 12, 20))).toBe("2027-01-05");
    expect(key("2010-12-31", true, day(2026, 12, 31))).toBe("2026-12-31");
    expect(key("2010-01-01", true, day(2026, 12, 31))).toBe("2027-01-01");
  });
  it("29 Feb recurring falls on 28 Feb in non-leap years, 29 Feb in leap years", () => {
    expect(key("2000-02-29", true, day(2027, 1, 10))).toBe("2027-02-28");
    expect(key("2000-02-29", true, day(2028, 1, 10))).toBe("2028-02-29");
  });
});
