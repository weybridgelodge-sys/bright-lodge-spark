// Shared date rule for manually added Almoner life events (weddings,
// bereavements, other). Used by the Life Events panel and the Almoner's Report.
// Dates are built from Y/M/D parts in local time so no day can shift.

export const LIFE_EVENT_HORIZON_DAYS = 92; // ~3 months
export const LIFE_EVENT_PAST_GRACE_DAYS = 1; // yesterday still shows

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Parse "YYYY-MM-DD" (or an ISO timestamp) into a local-midnight Date. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function onYear(month: number, day: number, year: number): Date {
  if (month === 1 && day === 29 && !isLeap(year)) return new Date(year, 1, 28);
  return new Date(year, month, day);
}

/** Next occurrence (today or later) for recurring events; stored date otherwise. */
export function nextOccurrence(iso: string, recurring: boolean, today: Date = new Date()): Date {
  const d = parseLocalDate(iso);
  if (!recurring) return d;
  const t = startOfDay(today);
  let next = onYear(d.getMonth(), d.getDate(), t.getFullYear());
  if (next < t) next = onYear(d.getMonth(), d.getDate(), t.getFullYear() + 1);
  return next;
}

/** Whole calendar days from today to `d` (negative = past). */
export function daysUntil(d: Date, today: Date = new Date()): number {
  const a = startOfDay(today), b = startOfDay(d);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
}

export function inLifeEventWindow(days: number): boolean {
  return days >= -LIFE_EVENT_PAST_GRACE_DAYS && days <= LIFE_EVENT_HORIZON_DAYS;
}

/** The date to show for a manual event, or null when it falls outside the window. */
export function upcomingManualDate(iso: string, recurring: boolean, today: Date = new Date()): Date | null {
  const when = nextOccurrence(iso, recurring, today);
  return inLifeEventWindow(daysUntil(when, today)) ? when : null;
}

/** Local YYYY-MM-DD key for sorting. */
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
