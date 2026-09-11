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
