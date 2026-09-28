import { describe, it, expect } from "vitest";
import { certifiedPackPath, frozenRemarks, packStatements, selectPackSource } from "@/lib/treasurer/accountsPack";
import type { Approval, Round, Signoff, YearSnapshot } from "@/lib/treasurer/yearAudit";

const snap = (surplus: number): YearSnapshot => ({
  masonic_year: 2025, as_at: "2026-09-30", taken_at: "2026-09-01T10:00:00Z",
  income_expenditure: { income: 1000, expenditure: 1000 - surplus, surplus },
  balance_sheet: { assets: 0, liabilities: 0, net_assets: 0, fund_bf: 0, surplus, total_funds: surplus },
  trial_balance: { debit: 0, credit: 0 },
  accounts: [
    { code: "1000", name: "Bank", type: "asset", net: 500 },
    { code: "2100", name: "Deferred", type: "liability", net: -200 },
    { code: "4000", name: "Subs", type: "income", net: -1000 },
    { code: "5000", name: "Dining", type: "expense", net: 700 },
  ],
});
const ap = (o: Partial<Approval> = {}): Approval => ({ id: "a", masonic_year: 2025, status: "draft", round_number: 0, figures_snapshot: null, submitted_at: null, submitted_by: null, treasurer_remarks: "live draft", ...o });
const rd = (n: number, remarks: string, s = snap(n)): Round => ({ id: "r" + n, approval_id: "a", round_number: n, figures_snapshot: s, submitted_at: "", submitted_by: null, outcome: null, treasurer_remarks: remarks });
const sig = (role: "auditor_1" | "auditor_2", round: number, decision: "confirmed" | "query" = "confirmed"): Signoff =>
  ({ id: role + round, approval_id: "a", round_number: round, officer_role: role, signed_by: role, signed_at: "2026-10-05T00:00:00Z", decision, note: null });

describe("remarks frozen per round", () => {
  it("shows the current round's frozen remarks, not the live draft edited afterwards", () => {
    const a = ap({ status: "submitted", round_number: 2, treasurer_remarks: "edited after submitting" });
    expect(frozenRemarks(a, [rd(1, "round one"), rd(2, "as submitted")])).toBe("as submitted");
  });
  it("draft years have no frozen remarks", () => {
    expect(frozenRemarks(ap(), [rd(1, "old")])).toBeNull();
  });
});

describe("pack content selection", () => {
  it("approved year uses the approved round's frozen figures, remarks and confirmations", () => {
    const a = ap({ status: "approved", round_number: 2, treasurer_remarks: "changed later", figures_snapshot: snap(1) });
    const src = selectPackSource({ approval: a, rounds: [rd(1, "r1", snap(111)), rd(2, "certified", snap(222))],
      sigs: [sig("auditor_2", 2), sig("auditor_1", 2), sig("auditor_1", 1, "query")], live: snap(999) });
    expect(src.draft).toBe(false);
    expect(src.snap.income_expenditure.surplus).toBe(222);
    expect(src.remarks).toBe("certified");
    expect(src.certifiers.map((s) => s.officer_role)).toEqual(["auditor_1", "auditor_2"]);
  });
  it.each(["draft", "submitted", "query"] as const)("%s year uses live figures + draft remarks, marked DRAFT", (status) => {
    const src = selectPackSource({ approval: ap({ status, round_number: 1 }), rounds: [rd(1, "frozen", snap(5))], sigs: [sig("auditor_1", 1)], live: snap(999) });
    expect(src.draft).toBe(true);
    expect(src.snap.income_expenditure.surplus).toBe(999);
    expect(src.remarks).toBe("live draft");
    expect(src.certifiers).toEqual([]);
  });
  it("no approval row yet is a draft from live figures", () => {
    expect(selectPackSource({ approval: null, rounds: [], sigs: [], live: snap(3) }).draft).toBe(true);
  });
  it("statement lines use natural signs; path is per round", () => {
    const s = packStatements(snap(300));
    expect(s.income[0].amount).toBe(1000);
    expect(s.expense[0].amount).toBe(700);
    expect(s.liabilities[0].amount).toBe(200);
    expect(certifiedPackPath(2025, 2)).toBe("year-end-accounts/FY2025-2026-round-2-certified.pdf");
  });
});

import { packComparative } from "@/lib/treasurer/accountsPack";
describe("accounts pack comparative", () => {
  const base = { masonic_year: 2025, as_at: "2026-09-30", taken_at: "2026-10-02T00:00:00Z",
    income_expenditure: { income: 0, expenditure: 0, surplus: 0 },
    balance_sheet: { assets: 0, liabilities: 0, net_assets: 0, fund_bf: 0, surplus: 0, total_funds: 0 },
    trial_balance: { debit: 0, credit: 0 } };
  it("merges prior-year lines by code, zero-filling either side", () => {
    const c = packComparative({ ...base, accounts: [{ code: "1000", name: "Bank", type: "asset", net: 100 }],
      comparative: { ...base, masonic_year: 2024, accounts: [{ code: "1000", name: "Bank", type: "asset", net: 652493 }, { code: "4300", name: "Raffle", type: "income", net: -67000 }] } } as any);
    expect(c.hasPrior).toBe(true);
    expect(c.assets).toEqual([{ code: "1000", name: "Bank", cur: 100, pri: 652493 }]);
    expect(c.income).toEqual([{ code: "4300", name: "Raffle", cur: 0, pri: 67000 }]);
  });
  it("old snapshots without a comparative show no prior column", () => {
    const c = packComparative({ ...base, accounts: [{ code: "1000", name: "Bank", type: "asset", net: 5 }] } as any);
    expect(c.hasPrior).toBe(false);
    expect(c.assets[0].pri).toBeNull();
  });
});
