const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Partial date of birth: year may be unknown. */
export function formatPartialDob(day: number | null, month: number | null, year: number | null): string {
  if (!day || !month) return "—";
  const base = `${day} ${MONTHS[month - 1] ?? "?"}`;
  return year ? `${base} ${year}` : `${base} (year unknown)`;
}

/** Age only when the year is known. */
export function partialDobAge(day: number | null, month: number | null, year: number | null, today = new Date()): number | null {
  if (!day || !month || !year) return null;
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1;
  if (m < month || (m === month && today.getDate() < day)) age--;
  return age;
}

/** Valid partial date: day+month real (29 Feb allowed when year unknown). */
export function isValidPartialDob(day: number | null, month: number | null, year: number | null): boolean {
  if (day == null && month == null) return year == null;
  if (!day || !month || month < 1 || month > 12 || day < 1) return false;
  const y = year ?? 2000;
  const d = new Date(Date.UTC(y, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

const toUtcDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export type ContactDue = { dueDate: string; overdue: boolean; daysUntil: number };

/** Next contact due = last contact (or date added) + interval days. */
export function computeContactDue(
  lastContactDate: string | null,
  createdAt: string,
  intervalDays: number,
  today = new Date(),
): ContactDue {
  const base = toUtcDay(lastContactDate ?? createdAt);
  const due = base + intervalDays * 86400000;
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = Math.round((due - t) / 86400000);
  return { dueDate: new Date(due).toISOString().slice(0, 10), overdue: daysUntil < 0, daysUntil };
}
