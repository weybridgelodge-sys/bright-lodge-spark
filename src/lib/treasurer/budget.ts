import { supabase } from "@/integrations/supabase/client";
import { treasurerYearBounds, treasurerYearContaining } from "@/lib/treasurer/reports";
import { fetchCollections, fetchDonations, reliefChestBalance } from "@/lib/charity/queries";

export type AnnualBudget = {
  id: string;
  lodge_year_start: string;
  lodge_year_end: string;
  label: string;
  income_budget_pence: number;
  expenditure_budget_pence: number;
  notes: string | null;
};

/** The lodge (treasurer) year containing today: 1 Oct – 30 Sep. */
export function currentLodgeYear(): { year: number; start: string; end: string; label: string } {
  const today = new Date().toISOString().slice(0, 10);
  const year = treasurerYearContaining(today);
  return { year, ...treasurerYearBounds(year) };
}

export async function fetchAnnualBudget(startIso: string): Promise<AnnualBudget | null> {
  const { data, error } = await supabase
    .from("treasurer_annual_budgets" as any)
    .select("id,lodge_year_start,lodge_year_end,label,income_budget_pence,expenditure_budget_pence,notes")
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
  income_budget_pence: number;
  expenditure_budget_pence: number;
  notes: string | null;
  userId: string | null;
}): Promise<void> {
  const row = {
    lodge_year_start: input.lodge_year_start,
    lodge_year_end: input.lodge_year_end,
    label: input.label,
    income_budget_pence: input.income_budget_pence,
    expenditure_budget_pence: input.expenditure_budget_pence,
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
  budget: AnnualBudget | null;
  reliefChestBalance: number; // pounds
};

export async function fetchBudgetSnapshot(): Promise<BudgetSnapshot> {
  const ly = currentLodgeYear();
  const [quarter, budget, collections, donations] = await Promise.all([
    findLatestClosedQuarter(),
    fetchAnnualBudget(ly.start),
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
    budget,
    reliefChestBalance: reliefChestBalance(collections, donations),
  };
}
