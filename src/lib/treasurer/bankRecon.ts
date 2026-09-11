import { supabase } from "@/integrations/supabase/client";

/** A parsed bank line, as stored in bank_statement_transactions. */
export type BankLine = {
  id: string;
  statement_id: string;
  transaction_date: string | null;
  description: string | null;
  amount_pence: number;
  raw_memo: string | null;
  parse_order: number;
  matched_journal_line_id: string | null;
  matched_entry_id: string | null;
  match_type: string | null;
  matched_at: string | null;
  match_rejected: boolean;
};

export type OutstandingBalance = {
  /** 1100: the line description (member name). 2000: the entry payee. */
  key: string;
  pence: number;
};

export type Suggestion = {
  line: BankLine;
  kind: "subscription" | "creditor";
  target: OutstandingBalance;
  label: string;
};

export const money = (pence: number) =>
  `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Tolerance for a partial/discounted settlement suggestion: 10% or £5, whichever is larger. */
export const matchTolerancePence = (outstanding: number) =>
  Math.max(500, Math.round(outstanding * 0.1));

const haystack = (l: BankLine) => `${l.description ?? ""} ${l.raw_memo ?? ""}`.toUpperCase();

/** Bank charge detection: "CHARGE" or "CHG" anywhere in description or memo. */
export function isBankCharge(l: BankLine): boolean {
  const h = haystack(l);
  return /CHARGE/.test(h) || /\bCHG\b/.test(h) || /CHG/.test(h);
}

export function isUnreconciled(l: BankLine): boolean {
  return !l.matched_journal_line_id;
}

/** Map of account code -> id for the codes this module posts to. */
export async function fetchAccountMap(codes: string[]): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("chart_of_accounts" as any)
    .select("id,code")
    .in("code", codes);
  if (error) throw error;
  const m = new Map<string, string>();
  for (const a of ((data as any[]) ?? [])) m.set(a.code as string, a.id as string);
  return m;
}

export async function fetchOpenPeriodId(): Promise<string | null> {
  const { data } = await supabase
    .from("treasurer_periods" as any)
    .select("id")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

/**
 * Outstanding 1100 Debtors per member: grouped by the journal line description
 * (the named lines written by the subscription accrual and New Member Fees).
 * Only positive remaining balances are returned.
 */
export async function fetchOutstandingDebtors(asAt?: string): Promise<OutstandingBalance[]> {
  const accounts = await fetchAccountMap(["1100"]);
  const id = accounts.get("1100");
  if (!id) return [];
  let q = supabase
    .from("journal_lines" as any)
    .select("description,debit_pence,credit_pence,journal_entries!inner(entry_date)")
    .eq("account_id", id);
  if (asAt) q = q.lte("journal_entries.entry_date", asAt);
  const { data, error } = await q;
  if (error) throw error;
  const m = new Map<string, number>();
  for (const r of ((data as any[]) ?? [])) {
    const key = (r.description ?? "").trim() || "Unnamed";
    m.set(key, (m.get(key) ?? 0) + Number(r.debit_pence ?? 0) - Number(r.credit_pence ?? 0));
  }
  return [...m.entries()]
    .filter(([, pence]) => pence > 0)
    .map(([key, pence]) => ({ key, pence }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Outstanding 2000 Creditors per payee. Only positive remaining balances are returned. */
export async function fetchOutstandingCreditors(asAt?: string): Promise<OutstandingBalance[]> {
  const accounts = await fetchAccountMap(["2000"]);
  const id = accounts.get("2000");
  if (!id) return [];
  let q = supabase
    .from("journal_lines" as any)
    .select("debit_pence,credit_pence,journal_entries!inner(entry_date,payee)")
    .eq("account_id", id);
  if (asAt) q = q.lte("journal_entries.entry_date", asAt);
  const { data, error } = await q;
  if (error) throw error;
  const m = new Map<string, number>();
  for (const r of ((data as any[]) ?? [])) {
    const key = (r.journal_entries?.payee ?? "").trim() || "Uncategorised";
    m.set(key, (m.get(key) ?? 0) + Number(r.credit_pence ?? 0) - Number(r.debit_pence ?? 0));
  }
  return [...m.entries()]
    .filter(([, pence]) => pence > 0)
    .map(([key, pence]) => ({ key, pence }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Surname = last whitespace-separated word of the debtor description. */
export function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

const CREDITOR_PAYEES = ["UGLE", "PROVINCIAL GRAND LODGE"];

/**
 * Pure suggestion engine — no database access, so it can be unit tested.
 * Bank charges are handled separately and are never suggested here.
 */
export function buildSuggestions(
  lines: BankLine[],
  debtors: OutstandingBalance[],
  creditors: OutstandingBalance[],
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const l of lines) {
    if (!isUnreconciled(l) || l.match_rejected || isBankCharge(l)) continue;
    const h = haystack(l);

    if (l.amount_pence > 0) {
      const candidates = debtors
        .filter((d) => {
          const s = surnameOf(d.key).toUpperCase();
          if (s.length < 3 || !h.includes(s)) return false;
          return Math.abs(d.pence - l.amount_pence) <= matchTolerancePence(d.pence);
        })
        .sort((a, b) => Math.abs(a.pence - l.amount_pence) - Math.abs(b.pence - l.amount_pence));
      if (candidates.length) {
        const t = candidates[0];
        out.push({
          line: l,
          kind: "subscription",
          target: t,
          label: `settles ${t.key}'s subscription, ${money(t.pence)} outstanding`,
        });
      }
      continue;
    }

    if (l.amount_pence < 0) {
      const paid = Math.abs(l.amount_pence);
      const candidates = creditors
        .filter((c) => {
          const up = c.key.toUpperCase();
          if (!CREDITOR_PAYEES.some((p) => up.includes(p))) return false;
          return Math.abs(c.pence - paid) <= matchTolerancePence(c.pence);
        })
        .sort((a, b) => Math.abs(a.pence - paid) - Math.abs(b.pence - paid));
      if (candidates.length) {
        const t = candidates[0];
        out.push({
          line: l,
          kind: "creditor",
          target: t,
          label: `settles ${t.key} creditor balance, ${money(t.pence)} outstanding`,
        });
      }
    }
  }
  return out;
}

type PostLine = { account_id: string; debit_pence: number; credit_pence: number; description?: string | null };

/**
 * Posts a balanced journal entry and returns { entryId, lineIds }.
 * Rolls the entry back if the line insert fails, so no orphan entries are left.
 */
export async function postEntry(
  header: { entry_date: string; description: string; source_type: string; payee?: string | null; period_id: string | null },
  lines: PostLine[],
): Promise<{ entryId: string; lineIds: string[] }> {
  const { data: u } = await supabase.auth.getUser();
  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries" as any)
    .insert({ ...header, created_by: u.user?.id ?? null })
    .select("id")
    .single();
  if (entryErr || !entry) throw new Error(entryErr?.message ?? "Could not create the journal entry.");
  const entryId = (entry as any).id as string;

  const { data: inserted, error: lineErr } = await supabase
    .from("journal_lines" as any)
    .insert(lines.map((l) => ({ ...l, entry_id: entryId })))
    .select("id");
  if (lineErr) {
    await supabase.from("journal_entries" as any).delete().eq("id", entryId);
    throw new Error(lineErr.message);
  }
  return { entryId, lineIds: ((inserted as any[]) ?? []).map((r) => r.id as string) };
}

export async function markMatched(
  lineId: string,
  matchType: string,
  entryId: string,
  journalLineId: string | null,
) {
  const { error } = await supabase
    .from("bank_statement_transactions" as any)
    .update({
      match_type: matchType,
      matched_entry_id: entryId,
      matched_journal_line_id: journalLineId,
      matched_at: new Date().toISOString(),
      match_rejected: false,
    })
    .eq("id", lineId);
  if (error) throw new Error(error.message);
}

/** Ledger movements posted to 1000 Bank between two dates. */
export type BankLedgerLine = {
  id: string;
  entry_id: string;
  entry_date: string;
  description: string | null;
  debit_pence: number;
  credit_pence: number;
};

export async function fetchBankLedgerLines(from: string, to: string): Promise<BankLedgerLine[]> {
  const accounts = await fetchAccountMap(["1000"]);
  const id = accounts.get("1000");
  if (!id) return [];
  const { data, error } = await supabase
    .from("journal_lines" as any)
    .select("id,entry_id,debit_pence,credit_pence,description,journal_entries!inner(entry_date)")
    .eq("account_id", id)
    .gte("journal_entries.entry_date", from)
    .lte("journal_entries.entry_date", to);
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    entry_id: r.entry_id,
    entry_date: r.journal_entries?.entry_date,
    description: r.description,
    debit_pence: Number(r.debit_pence ?? 0),
    credit_pence: Number(r.credit_pence ?? 0),
  }));
}

/** Nominal balance of 1000 Bank as at a date (debits less credits, from inception). */
export async function fetchBankNominalBalance(asAt: string): Promise<number> {
  const accounts = await fetchAccountMap(["1000"]);
  const id = accounts.get("1000");
  if (!id) return 0;
  const { data, error } = await supabase
    .from("journal_lines" as any)
    .select("debit_pence,credit_pence,journal_entries!inner(entry_date)")
    .eq("account_id", id)
    .lte("journal_entries.entry_date", asAt);
  if (error) throw error;
  return ((data as any[]) ?? []).reduce(
    (s, r) => s + Number(r.debit_pence ?? 0) - Number(r.credit_pence ?? 0),
    0,
  );
}
