import { describe, it, expect } from "vitest";
import { computeTrialBalance, type TBAccount, type TBLine } from "@/lib/treasurer/reportPeriods";

const accts: TBAccount[] = [
  { id: "bank", code: "1000", name: "Bank", account_type: "asset" },
  { id: "def", code: "2100", name: "Deferred", account_type: "liability" },
  { id: "susp", code: "1010", name: "Suspense", account_type: "asset" },
  { id: "subs", code: "4000", name: "Subs", account_type: "income" },
  { id: "levy", code: "5200", name: "Levy", account_type: "expense" },
  { id: "fund", code: "3000", name: "Fund", account_type: "equity" },
];
const L = (account_id: string, entry_date: string, debit: number, credit: number): TBLine => ({ account_id, entry_date, debit, credit });
const lines: TBLine[] = [
  L("bank", "2025-10-01", 500000, 0), L("fund", "2025-10-01", 0, 500000),
  L("bank", "2026-01-10", 25000, 0), L("subs", "2026-01-10", 0, 25000), // prior year I&E
  L("susp", "2026-11-01", 41861, 0), L("susp", "2026-11-02", 0, 41861), // net zero
  L("bank", "2026-11-05", 0, 207000), L("levy", "2026-11-05", 207000, 0), // debit-only expense
  L("bank", "2026-12-01", 30000, 0), L("subs", "2026-12-01", 0, 30000), // credit-only income (YTD)
  L("bank", "2027-01-01", 999, 0), L("def", "2027-01-01", 0, 999), // after as-at
];

describe("trial balance", () => {
  const tb = computeTrialBalance(accts, lines, "2026-12-31");
  const row = (id: string) => tb.rows.find((r) => r.id === id)!;

  it("orders by code and lists every account", () => {
    expect(tb.rows.map((r) => r.code)).toEqual(["1000", "1010", "2100", "3000", "4000", "5200"]);
  });
  it("puts balances on the natural side", () => {
    expect(row("bank")).toMatchObject({ dr: 348000, cr: 0 });
    expect(row("levy")).toMatchObject({ dr: 207000, cr: 0 });
    expect(row("subs")).toMatchObject({ dr: 0, cr: 30000 }); // YTD only
    expect(row("susp")).toMatchObject({ dr: 0, cr: 0 });
    expect(row("def")).toMatchObject({ dr: 0, cr: 0 }); // after the date
    expect(tb.priorSurplus).toEqual({ dr: 0, cr: 25000 });
  });
  it("total Dr equals total Cr for a balanced ledger", () => {
    expect(tb.totalDr).toBe(tb.totalCr);
    expect(tb.difference).toBe(0);
  });
  it("detects an unbalanced ledger", () => {
    expect(computeTrialBalance(accts, [L("bank", "2026-01-01", 100, 0)], "2026-12-31").difference).toBe(100);
  });
});
