import { describe, it, expect } from "vitest";
import { buildClosingJournal, canCloseYear, closingEntryDate, closingPeriodLabel, yearEndYears } from "@/lib/treasurer/yearEnd";
import { computeTrialBalance, type TBAccount, type TBLine } from "@/lib/treasurer/reportPeriods";
import { keepForClosingMode } from "@/lib/treasurer/reports";

const A = (id: string, code: string, t: string): TBAccount => ({ id, code, name: code, account_type: t });
const accounts = [A("bank", "1000", "asset"), A("fund", "3000", "equity"), A("subs", "4000", "income"),
  A("dine", "4100", "income"), A("levy", "5200", "expense"), A("zero", "5300", "expense")];
const L = (account_id: string, entry_date: string, debit: number, credit: number, closing = false): TBLine =>
  ({ account_id, entry_date, debit, credit, closing });

const ledger: TBLine[] = [
  L("bank", "2025-10-01", 300000, 0), L("fund", "2025-10-01", 0, 300000),
  L("bank", "2025-11-01", 425000, 0), L("subs", "2025-11-01", 0, 425000),
  L("bank", "2026-02-18", 58278, 0), L("dine", "2026-02-18", 0, 58278),
  L("levy", "2026-03-16", 207000, 0), L("bank", "2026-03-16", 0, 207000),
  L("zero", "2026-04-01", 5000, 0), L("zero", "2026-05-01", 0, 5000), L("bank", "2026-04-01", 0, 5000), L("bank", "2026-05-01", 5000, 0),
  L("subs", "2026-10-05", 0, 99999), L("bank", "2026-10-05", 99999, 0), // next year — ignored
];

describe("closing journal", () => {
  const j = buildClosingJournal(accounts, ledger, 2025);
  it("reverses non-zero I&E, posts net to 3000, balances, skips zero accounts", () => {
    expect(j.lines.map((l) => [l.account.code, l.debit, l.credit])).toEqual([
      ["4000", 425000, 0], ["4100", 58278, 0], ["5200", 0, 207000], ["3000", 0, 276278],
    ]);
    expect(j.surplus).toBe(276278);
    expect(j.balanced).toBe(true);
    expect(j.debit).toBe(483278);
  });
  it("dates it 1 Oct of the next year in the year's closing period", () => {
    expect(j.entryDate).toBe("2026-10-01");
    expect(closingEntryDate(2025)).toBe("2026-10-01");
    expect(j.periodLabel).toBe("FY 2025/26 Year-End Close");
    expect(closingPeriodLabel(2025)).toBe(j.periodLabel);
  });
  it("a deficit debits 3000", () => {
    const d = buildClosingJournal(accounts, [L("levy", "2026-01-01", 1000, 0), L("bank", "2026-01-01", 0, 1000)], 2025);
    expect(d.lines.at(-1)).toMatchObject({ debit: 1000, credit: 0 });
    expect(d.balanced).toBe(true);
  });
});

describe("closing entries and reports", () => {
  const posted = buildClosingJournal(accounts, ledger, 2025).lines.map((l) =>
    L(l.account.id, "2026-10-01", l.debit, l.credit, true));
  const all = [...ledger, ...posted];

  it("Trial Balance year movement ignores the closing journal and prior surplus nets to zero", () => {
    const tb = computeTrialBalance(accounts, all, "2026-10-31");
    const row = (c: string) => tb.rows.find((r) => r.code === c)!;
    expect(row("4000").cr).toBe(99999); // only the new year's receipt
    expect(row("5200").dr).toBe(0);
    expect(tb.priorSurplus).toEqual({ dr: 0, cr: 0 });
    expect(row("3000").cr).toBe(300000 + 276278);
    expect(tb.difference).toBe(0);
  });

  it("I&E drops closing-period entries; Balance Sheet (all) keeps them", () => {
    const ids = new Set(["closeP"]);
    expect(keepForClosingMode("closeP", ids, "exclude")).toBe(false);
    expect(keepForClosingMode("octP", ids, "exclude")).toBe(true);
    expect(keepForClosingMode(null, ids, "exclude")).toBe(true);
    expect(keepForClosingMode("closeP", ids, "all")).toBe(true);
    expect(keepForClosingMode("closeP", ids, "only")).toBe(true);
    expect(keepForClosingMode("octP", ids, "only")).toBe(false);
  });
});

describe("double-close guard", () => {
  it("refuses an already-closed year and a year not yet ended", () => {
    expect(canCloseYear(2025, "2026-10-02", true).ok).toBe(false);
    expect(canCloseYear(2025, "2026-09-30", false).ok).toBe(false);
    expect(canCloseYear(2025, "2026-10-01", false).ok).toBe(true);
  });
  it("lists years from earliest activity to now", () => {
    expect(yearEndYears(["2025-10-01", "2027-09-01"], "2026-09-28")).toEqual([2025]);
    expect(yearEndYears(["2024-12-01"], "2026-10-02")).toEqual([2026, 2025, 2024]);
  });
});
