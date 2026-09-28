import { masonicYearOptions } from "./reportPeriods";
/**
 * Pure helpers for the Year End close. The closing journal's only job is to move a
 * masonic year's income & expenditure into 3000 General Fund (next year's opening fund).
 * The database RPC post_year_close recomputes the same figures and refuses on mismatch.
 */
import { computeTrialBalance, masonicYearOf, type TBAccount, type TBLine } from "./reportPeriods";

export const FUND_CODE = "3000";

export const yearEndDate = (year: number) => `${year + 1}-09-30`;
/** Closing journal is dated the first day of the NEXT masonic year. */
export const closingEntryDate = (year: number) => `${year + 1}-10-01`;
export const closingPeriodLabel = (year: number) => `FY ${year}/${String(year + 1).slice(2)} Year-End Close`;
export const fyLabel = (year: number) => `FY ${year}/${String(year + 1).slice(2)}`;

export type ClosingLine = { account: TBAccount; debit: number; credit: number; description: string };

/**
 * Draft closing journal from the Trial Balance as at 30 Sept of `year`: reverses every
 * non-zero income/expense YTD balance and posts the net to 3000. Balanced by construction.
 */
export function buildClosingJournal(accounts: TBAccount[], lines: TBLine[], year: number) {
  const fund = accounts.find((a) => a.code === FUND_CODE) ?? null;
  const tb = computeTrialBalance(accounts, lines, yearEndDate(year));
  const out: ClosingLine[] = [];
  let surplus = 0; // credits − debits across I&E = surplus
  for (const r of tb.rows) {
    if (r.account_type !== "income" && r.account_type !== "expense") continue;
    const net = r.dr - r.cr;
    if (net === 0) continue;
    const { dr, cr, start, ...account } = r;
    out.push({ account, debit: net < 0 ? -net : 0, credit: net > 0 ? net : 0, description: `Close ${r.code} to General Fund` });
    surplus -= net;
  }
  if (fund && surplus !== 0) {
    out.push({
      account: fund,
      debit: surplus < 0 ? -surplus : 0,
      credit: surplus > 0 ? surplus : 0,
      description: `${surplus > 0 ? "Surplus" : "Deficit"} for ${fyLabel(year)}`,
    });
  }
  const debit = out.reduce((s, l) => s + l.debit, 0);
  const credit = out.reduce((s, l) => s + l.credit, 0);
  return {
    lines: out,
    surplus,
    debit,
    credit,
    balanced: debit === credit,
    fundMissing: !fund,
    entryDate: closingEntryDate(year),
    periodLabel: closingPeriodLabel(year),
  };
}

export type CloseGuard = { ok: true } | { ok: false; reason: string };

/** Whether "Close FY" may run: the year must be over and not already closed. */
export function canCloseYear(year: number, today: string, alreadyClosed: boolean): CloseGuard {
  if (alreadyClosed) return { ok: false, reason: `${fyLabel(year)} is already closed — a closing journal exists.` };
  if (today <= yearEndDate(year)) return { ok: false, reason: `${fyLabel(year)} ends on 30 Sep ${year + 1}; it can be closed from 1 Oct ${year + 1}.` };
  return { ok: true };
}

/** Masonic years from the earliest ledger/period date up to the current year, newest first. */
export function yearEndYears(periodDates: string[], today: string): number[] {
  return masonicYearOptions(masonicYearOf(today), periodDates);
}
