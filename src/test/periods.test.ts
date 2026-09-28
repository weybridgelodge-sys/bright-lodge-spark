import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const rows = [
  { id: "oct", label: "October 2025", period_start: "2025-10-01", period_end: "2025-10-31", status: "open" },
  { id: "nov", label: "November 2025", period_start: "2025-11-01", period_end: "2025-11-30", status: "open" },
];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ neq: () => ({ order: async () => ({ data: rows, error: null }) }) }) }) },
}));

import { periodIdForDate, usePostingPeriod } from "@/lib/treasurer/periods";

describe("posting periods", () => {
  it("picks the unlocked period containing the date", () => {
    expect(periodIdForDate(rows, "2025-10-17")).toBe("oct");
    expect(periodIdForDate(rows, "2025-11-30")).toBe("nov");
    expect(periodIdForDate(rows, "2025-12-01")).toBeNull(); // December is locked, so not in the list
  });

  it("defaults from the date, allows override, and recomputes when the date changes", async () => {
    const { result, rerender } = renderHook(({ d }) => usePostingPeriod(d), { initialProps: { d: "2025-10-17" } });
    await waitFor(() => expect(result.current.periodId).toBe("oct"));
    act(() => result.current.setPeriodId("nov"));
    expect(result.current.periodId).toBe("nov");
    expect(result.current.autoId).toBe("oct");
    rerender({ d: "2025-11-04" });
    await waitFor(() => expect(result.current.periodId).toBe("nov"));
    rerender({ d: "2025-10-02" });
    await waitFor(() => expect(result.current.periodId).toBe("oct"));
  });
});

import { sortPeriodsNewestFirst } from "@/lib/treasurer/periods";
describe("sortPeriodsNewestFirst", () => {
  it("orders newest start first, undated last, stable tie-break", () => {
    const ps = [
      { id: "c", label: "Mar 2026", period_start: "2026-03-01", period_end: "2026-03-31" },
      { id: "x", label: "Undated", period_start: null, period_end: null },
      { id: "a", label: "Dec 2026", period_start: "2026-12-01", period_end: "2026-12-31" },
      { id: "b2", label: "Oct 2025 B", period_start: "2025-10-01", period_end: "2025-10-31" },
      { id: "b1", label: "Oct 2025 A", period_start: "2025-10-01", period_end: "2025-10-31" },
    ];
    expect(sortPeriodsNewestFirst(ps).map((p) => p.id)).toEqual(["a", "c", "b1", "b2", "x"]);
  });
});
