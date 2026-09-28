/**
 * Pure period-range helpers for the Treasurer reports (Income & Expenditure, Balance Sheet)
 * and the account drill-down. No Supabase or PDF imports so they stay unit-testable.
 * Masonic/treasurer year = 1 Oct – 30 Sep; `year` is the starting year.
 */
export type DateRange = { start: string; end: string; label: string };
export type IEKind = "month" | "ytd" | "year" | "custom";
export type BSKind = "month" | "year" | "custom";
export type CompareBasis = "previous" | "last_year";

const yearBounds = (y: number) => ({ start: `${y}-10-01`, end: `${y + 1}-09-30`, label: `${y}/${y + 1}` });
export const masonicYearOf = (iso: string) => {
  const y = Number(iso.slice(0, 4));
  return iso.slice(0, 10) >= `${y}-10-01` ? y : y - 1;
};

export const ymOf = (iso: string) => iso.slice(0, 7);

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function monthLabel(ym: string): string {
  return new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export const monthRange = (ym: string): DateRange => ({ start: `${ym}-01`, end: monthEnd(ym), label: monthLabel(ym) });

export function ytdRange(ym: string): DateRange {
  const b = yearBounds(masonicYearOf(`${ym}-01`));
  return { start: b.start, end: monthEnd(ym), label: `YTD ${b.label} to ${monthLabel(ym)}` };
}

export function yearRange(y: number): DateRange {
  const b = yearBounds(y);
  return { start: b.start, end: b.end, label: `Masonic year ${b.label}` };
}

const shiftDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const dayBefore = (iso: string) => shiftDays(iso, -1);
export const shiftYear = (iso: string, n = -1) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
};

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export const customRange = (start: string, end: string): DateRange => ({ start, end, label: `${fmt(start)} – ${fmt(end)}` });

export type IESelection = { kind: IEKind; ym: string; year: number; customStart: string; customEnd: string };

export function ieRange(s: IESelection): DateRange {
  switch (s.kind) {
    case "month": return monthRange(s.ym);
    case "ytd": return ytdRange(s.ym);
    case "year": return yearRange(s.year);
    default: return customRange(s.customStart, s.customEnd);
  }
}

export function ieComparative(s: IESelection, basis: CompareBasis): DateRange {
  switch (s.kind) {
    case "month": return monthRange(addMonths(s.ym, basis === "previous" ? -1 : -12));
    case "ytd": return ytdRange(addMonths(s.ym, -12)); // prior year to the same month either way
    case "year": return yearRange(s.year - 1);
    default: {
      if (basis === "last_year") return customRange(shiftYear(s.customStart), shiftYear(s.customEnd));
      const days = Math.round((Date.parse(s.customEnd) - Date.parse(s.customStart)) / 86400000);
      const end = dayBefore(s.customStart);
      return customRange(shiftDays(end, -days), end);
    }
  }
}

export const defaultBasis = (kind: IEKind | BSKind): CompareBasis => (kind === "month" ? "previous" : "last_year");

export type BSSelection = { kind: BSKind; ym: string; year: number; customDate: string };
export type AsAt = { date: string; label: string };

export function bsAsAt(s: BSSelection): AsAt {
  if (s.kind === "month") return { date: monthEnd(s.ym), label: `Month end ${fmt(monthEnd(s.ym))}` };
  if (s.kind === "year") {
    const b = yearBounds(s.year);
    return { date: b.end, label: `Year end ${b.label} (${fmt(b.end)})` };
  }
  return { date: s.customDate, label: fmt(s.customDate) };
}

export function bsComparative(s: BSSelection, basis: CompareBasis): AsAt {
  if (s.kind === "month") {
    const ym = addMonths(s.ym, basis === "previous" ? -1 : -12);
    return { date: monthEnd(ym), label: `Month end ${fmt(monthEnd(ym))}` };
  }
  if (s.kind === "year") return bsAsAt({ ...s, year: s.year - 1 });
  if (basis === "last_year") return { date: shiftYear(s.customDate), label: fmt(shiftYear(s.customDate)) };
  const d = monthEnd(addMonths(ymOf(s.customDate), -1));
  return { date: d, label: fmt(d) };
}

/** The 12 month keys of a masonic year, Oct → Sep. */
export const monthsOfYear = (y: number) => Array.from({ length: 12 }, (_, i) => addMonths(`${y}-10`, i));

/** Masonic years to offer: rolling 5 back from `current`, plus any year covered by periods or ledger dates. */
export function masonicYearOptions(current: number, dates: (string | null | undefined)[]): number[] {
  const set = new Set<number>([0, 1, 2, 3, 4].map((i) => current - i));
  const ys = dates.filter(Boolean).map((d) => masonicYearOf(d as string));
  if (ys.length) {
    const lo = Math.min(...ys), hi = Math.max(...ys);
    for (let y = lo; y <= hi; y++) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

// ---------- Account drill-down ----------

export type DrillSourceLine = {
  id: string;
  entry_id: string;
  entry_number: number | null;
  entry_date: string;
  entry_description: string;
  line_description: string;
  source_type: string | null;
  debit: number;
  credit: number;
};
export type DrillRow = DrillSourceLine & { amount: number; running: number; opening: boolean };

/** Same sign convention as signedBalance in reports.ts. */
export const signedAmount = (accountType: string, debit: number, credit: number) =>
  accountType === "expense" || accountType === "asset" ? debit - credit : credit - debit;

const isOpening = (l: DrillSourceLine) =>
  l.source_type === "opening_balance" || /opening balance|brought forward|b\/f/i.test(`${l.entry_description} ${l.line_description}`);

/** Sorted (date, then doc no.) with running signed balance and totals. */
export function buildAccountDrill(lines: DrillSourceLine[], accountType: string) {
  const sorted = [...lines].sort((a, b) =>
    a.entry_date.localeCompare(b.entry_date) || (a.entry_number ?? 0) - (b.entry_number ?? 0) || a.id.localeCompare(b.id));
  let running = 0;
  const rows: DrillRow[] = sorted.map((l) => {
    const amount = signedAmount(accountType, l.debit, l.credit);
    running += amount;
    return { ...l, amount, running, opening: isOpening(l) };
  });
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  return { rows, debit, credit, total: signedAmount(accountType, debit, credit) };
}

/** Signed net movement of lines with entry_date in [start, end] (start null = inception). */
export function sumForRange(lines: DrillSourceLine[], accountType: string, start: string | null, end: string) {
  return lines
    .filter((l) => (!start || l.entry_date >= start) && l.entry_date <= end)
    .reduce((s, l) => s + signedAmount(accountType, l.debit, l.credit), 0);
}

export const agreement = (total: number, expected: number) => ({ agrees: total === expected, difference: total - expected });

// ---------- Trial balance ----------

export type TBAccount = { id: string; code: string; name: string; account_type: string };
export type TBLine = { account_id: string; entry_date: string; debit: number; credit: number };
export type TBRow = TBAccount & { dr: number; cr: number; start: string | null };

/**
 * Per-account Dr/Cr as at `asAt`. Balance-sheet accounts are cumulative from inception;
 * income/expense accounts show the masonic year-to-date position. Prior years' income and
 * expense (never closed off) is returned as `priorSurplus` so the whole ledger still balances.
 * Every line up to asAt is counted exactly once.
 */
export function computeTrialBalance(accounts: TBAccount[], lines: TBLine[], asAt: string) {
  const yearStart = `${masonicYearOf(asAt)}-10-01`;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const net = new Map<string, number>(); // debit − credit
  let priorNet = 0; // debit − credit of prior-year I&E lines
  for (const l of lines) {
    if (l.entry_date > asAt) continue;
    const a = byId.get(l.account_id);
    const pl = a && (a.account_type === "income" || a.account_type === "expense");
    if (pl && l.entry_date < yearStart) { priorNet += l.debit - l.credit; continue; }
    net.set(l.account_id, (net.get(l.account_id) ?? 0) + l.debit - l.credit);
  }
  const rows: TBRow[] = [...accounts]
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((a) => {
      const n = net.get(a.id) ?? 0;
      const pl = a.account_type === "income" || a.account_type === "expense";
      return { ...a, dr: n > 0 ? n : 0, cr: n < 0 ? -n : 0, start: pl ? yearStart : null };
    });
  const priorSurplus = { dr: priorNet > 0 ? priorNet : 0, cr: priorNet < 0 ? -priorNet : 0 };
  const totalDr = rows.reduce((s, r) => s + r.dr, 0) + priorSurplus.dr;
  const totalCr = rows.reduce((s, r) => s + r.cr, 0) + priorSurplus.cr;
  return { rows, priorSurplus, yearStart, totalDr, totalCr, difference: totalDr - totalCr };
}
