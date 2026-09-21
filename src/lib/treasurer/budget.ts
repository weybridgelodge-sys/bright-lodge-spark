import { supabase } from "@/integrations/supabase/client";
import { treasurerYearBounds, treasurerYearContaining } from "@/lib/treasurer/reports";
import { fetchCollections, fetchDonations, reliefChestBalance } from "@/lib/charity/queries";

export type AnnualBudget = {
  id: string;
  lodge_year_start: string;
  lodge_year_end: string;
  label: string;
  notes: string | null;
};

/** One budgeted amount for one chart-of-accounts category in one lodge year. */
export type BudgetLine = {
  id: string;
  lodge_year_start: string;
  account_id: string;
  amount_pence: number;
};

export type LodgeYear = { year: number; start: string; end: string; label: string };

/** The lodge (treasurer) year containing today: 1 Oct – 30 Sep. */
export function currentLodgeYear(): LodgeYear {
  const today = new Date().toISOString().slice(0, 10);
  const year = treasurerYearContaining(today);
  return { year, ...treasurerYearBounds(year) };
}

/** Current lodge year plus the next two. */
export function budgetYearOptions(): LodgeYear[] {
  const base = currentLodgeYear().year;
  return [0, 1, 2].map((i) => ({ year: base + i, ...treasurerYearBounds(base + i) }));
}

export async function fetchAnnualBudget(startIso: string): Promise<AnnualBudget | null> {
  const { data, error } = await supabase
    .from("treasurer_annual_budgets" as any)
    .select("id,lodge_year_start,lodge_year_end,label,notes")
    .eq("lodge_year_start", startIso)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AnnualBudget) ?? null;
}

export async function saveAnnualBudget(input: {
  id?: string;
  lodge_year_start: string;
  lodge_year_end: string;
  label: string;
  notes: string | null;
  userId: string | null;
}): Promise<void> {
  const row = {
    lodge_year_start: input.lodge_year_start,
    lodge_year_end: input.lodge_year_end,
    label: input.label,
    notes: input.notes,
    updated_by: input.userId,
  };
  if (input.id) {
    const { error } = await supabase.from("treasurer_annual_budgets" as any).update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("treasurer_annual_budgets" as any)
      .insert({ ...row, created_by: input.userId });
    if (error) throw error;
  }
}

// ─── Per-category budget lines ──────────────────────────────────────────────

export async function fetchBudgetLines(startIso: string): Promise<BudgetLine[]> {
  const { data, error } = await supabase
    .from("treasurer_budget_lines" as any)
    .select("id,lodge_year_start,account_id,amount_pence")
    .eq("lodge_year_start", startIso);
  if (error) throw error;
  return ((data as unknown as BudgetLine[]) ?? []);
}

/** Insert or update a single category's budgeted amount for a lodge year. */
export async function upsertBudgetLine(input: {
  lodgeYear: LodgeYear;
  accountId: string;
  amountPence: number;
  userId: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("treasurer_budget_lines" as any)
    .upsert(
      {
        lodge_year_start: input.lodgeYear.start,
        lodge_year_end: input.lodgeYear.end,
        label: input.lodgeYear.label,
        account_id: input.accountId,
        amount_pence: input.amountPence,
        created_by: input.userId,
        updated_by: input.userId,
      },
      { onConflict: "lodge_year_start,account_id" },
    );
  if (error) throw error;
}

// ─── Designated reserve budget lines (balance sheet — never part of P&L totals) ──

export type ReserveBudgetLine = {
  id: string;
  lodge_year_start: string;
  pot_id: string;
  amount_pence: number;
};

export async function fetchReserveBudgetLines(startIso: string): Promise<ReserveBudgetLine[]> {
  const { data, error } = await supabase
    .from("treasurer_reserve_budget_lines" as any)
    .select("id,lodge_year_start,pot_id,amount_pence")
    .eq("lodge_year_start", startIso);
  if (error) throw error;
  return ((data as unknown as ReserveBudgetLine[]) ?? []);
}

/** Insert or update a single designated reserve pot's budgeted amount for a lodge year. */
export async function upsertReserveBudgetLine(input: {
  lodgeYear: LodgeYear;
  potId: string;
  amountPence: number;
  userId: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("treasurer_reserve_budget_lines" as any)
    .upsert(
      {
        lodge_year_start: input.lodgeYear.start,
        lodge_year_end: input.lodgeYear.end,
        label: input.lodgeYear.label,
        pot_id: input.potId,
        amount_pence: input.amountPence,
        created_by: input.userId,
        updated_by: input.userId,
      },
      { onConflict: "lodge_year_start,pot_id" },
    );
  if (error) throw error;
}

export type BudgetTotals = { incomePence: number; expenditurePence: number; hasLines: boolean };

/** Income / expenditure budget totals for a lodge year, summed from the line items. */
export async function fetchBudgetTotals(startIso: string): Promise<BudgetTotals> {
  const [lines, { data: accounts, error }] = await Promise.all([
    fetchBudgetLines(startIso),
    supabase.from("chart_of_accounts" as any).select("id,account_type"),
  ]);
  if (error) throw error;
  const typeById = new Map<string, string>(
    ((accounts as any[]) ?? []).map((a) => [a.id as string, a.account_type as string]),
  );
  let incomePence = 0;
  let expenditurePence = 0;
  for (const l of lines) {
    const t = typeById.get(l.account_id);
    if (t === "income") incomePence += Number(l.amount_pence ?? 0);
    else if (t === "expense") expenditurePence += Number(l.amount_pence ?? 0);
  }
  return { incomePence, expenditurePence, hasLines: lines.length > 0 };
}

// ─── Closed-quarter detection ───────────────────────────────────────────────

export type ClosedQuarter = { label: string; start: string; end: string };

const QUARTER_LABEL = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];

const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

/**
 * A quarter counts as closed only when each of its three months is covered by a
 * locked treasurer_periods row that matches that month exactly (period_start is
 * the 1st of the month and period_end is the last day of the month).
 * Looks backwards from today and returns the most recent qualifying quarter.
 */
export async function findLatestClosedQuarter(): Promise<ClosedQuarter | null> {
  const { data, error } = await supabase
    .from("treasurer_periods" as any)
    .select("period_start,period_end,status")
    .eq("status", "locked");
  if (error) throw error;
  const periods = ((data as any[]) ?? []).filter((p) => p.period_start && p.period_end);

  const lockedMonths = new Set<string>();
  for (const p of periods) {
    const s = new Date(p.period_start + "T00:00:00Z");
    const e = new Date(p.period_end + "T00:00:00Z");
    // exact whole-month match: starts on the 1st, ends on the last day of the same month
    if (s.getUTCDate() !== 1) continue;
    if (s.getUTCFullYear() !== e.getUTCFullYear() || s.getUTCMonth() !== e.getUTCMonth()) continue;
    const lastDay = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0)).getUTCDate();
    if (e.getUTCDate() !== lastDay) continue;
    lockedMonths.add(monthKey(s.getUTCFullYear(), s.getUTCMonth()));
  }

  const now = new Date();
  // walk back up to 12 quarters from the quarter before the current one
  let qy = now.getUTCFullYear();
  let qi = Math.floor(now.getUTCMonth() / 3);
  for (let n = 0; n < 12; n++) {
    const firstMonth = qi * 3;
    const months = [0, 1, 2].map((k) => monthKey(qy, firstMonth + k));
    if (months.every((m) => lockedMonths.has(m))) {
      const end = new Date(Date.UTC(qy, firstMonth + 3, 0));
      return {
        label: `${QUARTER_LABEL[qi]} ${qy}`,
        start: `${monthKey(qy, firstMonth)}-01`,
        end: end.toISOString().slice(0, 10),
      };
    }
    qi -= 1;
    if (qi < 0) { qi = 3; qy -= 1; }
  }
  return null;
}

// ─── Dashboard summary ──────────────────────────────────────────────────────

export type BudgetSnapshot = {
  lodgeYearLabel: string;
  quarter: ClosedQuarter | null;
  incomeActualPence: number;
  expenditureActualPence: number;
  /** Summed from this lodge year's per-category budget lines; null when none are set. */
  budget: BudgetTotals | null;
  reliefChestBalance: number; // pounds
};

export async function fetchBudgetSnapshot(): Promise<BudgetSnapshot> {
  const ly = currentLodgeYear();
  const [quarter, totals, collections, donations] = await Promise.all([
    findLatestClosedQuarter(),
    fetchBudgetTotals(ly.start),
    fetchCollections(),
    fetchDonations(),
  ]);

  let incomeActualPence = 0;
  let expenditureActualPence = 0;
  if (quarter) {
    const to = quarter.end < ly.end ? quarter.end : ly.end;
    const { data, error } = await supabase
      .from("treasurer_transactions" as any)
      .select("direction,amount_pence,transaction_date")
      .gte("transaction_date", ly.start)
      .lte("transaction_date", to);
    if (error) throw error;
    for (const t of ((data as any[]) ?? [])) {
      const p = Number(t.amount_pence ?? 0);
      if (t.direction === "income") incomeActualPence += p;
      else if (t.direction === "expense") expenditureActualPence += p;
    }
  }

  return {
    lodgeYearLabel: ly.label,
    quarter,
    incomeActualPence,
    expenditureActualPence,
    budget: totals.hasLines ? totals : null,
    reliefChestBalance: reliefChestBalance(collections, donations),
  };
}
