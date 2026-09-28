import { describe, it, expect } from "vitest";
import { buildSuggestions, isBankCharge, money, type BankLine } from "@/lib/treasurer/bankRecon";

const line = (p: Partial<BankLine>): BankLine => ({
  id: p.id ?? "x",
  statement_id: "s1",
  transaction_date: p.transaction_date ?? "2026-09-05",
  description: p.description ?? "",
  amount_pence: p.amount_pence ?? 0,
  raw_memo: p.raw_memo ?? null,
  parse_order: p.parse_order ?? 0,
  matched_journal_line_id: null,
  matched_entry_id: null,
  match_type: null,
  matched_at: null,
  match_rejected: false,
});

// Synthetic statement mirroring the real outstanding balances in the ledger.
const charge = line({ id: "l1", description: "LLOYDS BANK CHG", amount_pence: -1250 });
const subs = line({ id: "l2", description: "BACS J TIDMARSH SUBS 2026", amount_pence: 25000 });
const ugle = line({ id: "l3", description: "UGLE ANNUAL RETURN", amount_pence: -161000 });
const noise = line({ id: "l4", description: "SAINSBURYS SUPERSTORE", amount_pence: -4320 });

const debtors = [{ key: "Julien Tidmarsh", pence: 25000 }, { key: "David Poole", pence: 25000 }];
const creditors = [{ key: "UGLE", pence: 161000 }, { key: "Provincial Grand Lodge", pence: 66790 }];

describe("bank reconciliation", () => {
  it("detects bank charges only", () => {
    expect(isBankCharge(charge)).toBe(true);
    expect(isBankCharge(subs)).toBe(false);
    expect(isBankCharge(noise)).toBe(false);
  });

  it("suggests subs and creditor settlements, ignores charges and noise", () => {
    const s = buildSuggestions([charge, subs, ugle, noise], debtors, creditors);
    expect(s.map((x) => x.line.id)).toEqual(["l2", "l3"]);
    expect(s[0].label).toBe("settles Julien Tidmarsh's subscription, £250.00 outstanding");
    expect(s[1].label).toBe("settles UGLE creditor balance, £1,610.00 outstanding");
  });

  it("allows a small partial-payment tolerance but not a wild mismatch", () => {
    const near = line({ id: "l5", description: "TIDMARSH SUBS", amount_pence: 23000 });
    const far = line({ id: "l6", description: "TIDMARSH SUBS", amount_pence: 5000 });
    expect(buildSuggestions([near], debtors, creditors)).toHaveLength(1);
    expect(buildSuggestions([far], debtors, creditors)).toHaveLength(0);
  });

  it("needs the surname, not just the amount", () => {
    const anon = line({ id: "l7", description: "BACS CREDIT 998211", amount_pence: 25000 });
    expect(buildSuggestions([anon], debtors, creditors)).toHaveLength(0);
  });

  it("formats money", () => expect(money(-1250)).toBe("-£12.50"));
});

import { buildTakenLedgerFilter } from "@/lib/treasurer/bankRecon";
describe("buildTakenLedgerFilter (line-level matching)", () => {
  const E = "7f6fbc80";
  const hotel = { id: "1a9aee26", entry_id: E };
  const stripe1 = { id: "53ac2165", entry_id: E };
  const stripe2 = { id: "d0c32f3b", entry_id: E };
  it("excludes only the matched line of a multi-line contra entry", () => {
    const taken = buildTakenLedgerFilter([{ matched_journal_line_id: hotel.id, matched_entry_id: E }]);
    expect(taken(hotel)).toBe(true);
    expect(taken(stripe1)).toBe(false);
    expect(taken(stripe2)).toBe(false);
  });
  it("falls back to entry-level only for legacy matches without a line id", () => {
    const taken = buildTakenLedgerFilter([{ matched_journal_line_id: null, matched_entry_id: E }]);
    expect(taken(stripe1)).toBe(true);
  });
});

import { splitSelectionStatus } from "@/lib/treasurer/bankRecon";
describe("split matching helpers", () => {
  it("treats split-link lines as taken, globally", () => {
    const taken = buildTakenLedgerFilter(
      [{ matched_journal_line_id: "p90", matched_entry_id: "JE72" }],
      [{ journal_line_id: "s2070" }],
    );
    expect(taken({ id: "p90", entry_id: "JE72" })).toBe(true);
    expect(taken({ id: "s2070", entry_id: "JE76" })).toBe(true);
    expect(taken({ id: "other", entry_id: "JE76" })).toBe(false);
  });
  it("tracks running total against a payment", () => {
    const c90 = { debit_pence: 0, credit_pence: 9000 };
    const c2070 = { debit_pence: 0, credit_pence: 207000 };
    expect(splitSelectionStatus(-216000, [c90])).toMatchObject({ total: 9000, remaining: 207000, exact: false });
    expect(splitSelectionStatus(-216000, [c90, c2070])).toMatchObject({ total: 216000, remaining: 0, exact: true });
    expect(splitSelectionStatus(-216000, []).exact).toBe(false);
  });
  it("counts debits for receipts only", () => {
    expect(splitSelectionStatus(500, [{ debit_pence: 500, credit_pence: 0 }, { debit_pence: 0, credit_pence: 500 }]).exact).toBe(true);
  });
});
