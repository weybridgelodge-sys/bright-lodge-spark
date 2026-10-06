import { describe, it, expect } from "vitest";
import { computeContactDue, formatPartialDob, isValidPartialDob, partialDobAge } from "./widowContactDue";

describe("partial date of birth", () => {
  it("formats unknown year", () => {
    expect(formatPartialDob(12, 3, null)).toBe("12 March (year unknown)");
    expect(formatPartialDob(12, 3, 1940)).toBe("12 March 1940");
    expect(formatPartialDob(null, null, null)).toBe("—");
  });
  it("validates", () => {
    expect(isValidPartialDob(29, 2, null)).toBe(true);
    expect(isValidPartialDob(29, 2, 1941)).toBe(false);
    expect(isValidPartialDob(31, 4, null)).toBe(false);
    expect(isValidPartialDob(null, null, null)).toBe(true);
    expect(isValidPartialDob(null, null, 1940)).toBe(false);
    expect(isValidPartialDob(5, null, null)).toBe(false);
  });
  it("age only when year known", () => {
    const today = new Date(2026, 9, 6);
    expect(partialDobAge(12, 3, null, today)).toBeNull();
    expect(partialDobAge(12, 3, 1940, today)).toBe(86);
    expect(partialDobAge(7, 10, 1940, today)).toBe(85);
  });
});

describe("computeContactDue", () => {
  const today = new Date(2026, 9, 6);
  it("uses last contact", () => {
    const r = computeContactDue("2026-08-01", "2025-01-01T00:00:00Z", 90, today);
    expect(r.dueDate).toBe("2026-10-30");
    expect(r.overdue).toBe(false);
  });
  it("falls back to date added and flags overdue", () => {
    const r = computeContactDue(null, "2026-06-01T10:00:00Z", 90, today);
    expect(r.dueDate).toBe("2026-08-30");
    expect(r.overdue).toBe(true);
  });
  it("due today is not overdue", () => {
    expect(computeContactDue("2026-09-06", "2026-01-01", 30, today).overdue).toBe(false);
  });
});
