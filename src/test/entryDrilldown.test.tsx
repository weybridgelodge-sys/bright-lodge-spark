import { describe, it, expect } from "vitest";
import { summarizeEntryLines, sourceTypeLabel, SOURCE_TYPE_LABELS } from "@/lib/treasurer/entryDrilldown";

describe("entry drill-down helpers", () => {
  it("orders debits first then by code, and detects balance", () => {
    const r = summarizeEntryLines([
      { id: "c", code: "4100", debit: 0, credit: 300000 },
      { id: "b", code: "5200", debit: 100000, credit: 0 },
      { id: "a", code: "1000", debit: 200000, credit: 0 },
    ]);
    expect(r.lines.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(r.debit).toBe(300000);
    expect(r.credit).toBe(300000);
    expect(r.balanced).toBe(true);
  });

  it("reports an unbalanced difference", () => {
    const r = summarizeEntryLines([
      { id: "a", code: "1000", debit: 58279, credit: 0 },
      { id: "b", code: "4100", debit: 0, credit: 58278 },
    ]);
    expect(r.balanced).toBe(false);
    expect(r.difference).toBe(1);
  });

  it("labels all 14 known source types and falls back sensibly", () => {
    expect(Object.keys(SOURCE_TYPE_LABELS)).toHaveLength(14);
    expect(sourceTypeLabel("stripe_payout")).toBe("Stripe payout");
    expect(sourceTypeLabel("general_journal")).toBe("General Journal");
    expect(sourceTypeLabel("annual_return")).toBe("Annual return");
    expect(sourceTypeLabel(null)).toBe("Unknown");
  });
});
