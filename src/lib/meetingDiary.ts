// KPI dashboard / Members — Meeting diary rules (pure, no I/O).
// Meetings live in festive_board_meetings; this module only plans changes so
// the screen and tests share one rule set.
import {
  getMasonicYearRange, nthWeekdayOfMonth,
  type InstallationConfig, type MasonicYearRange,
} from "../../supabase/functions/_shared/masonicYear";

export type MeetingType = "regular" | "installation" | "emergency";
export type Ordinal = "1" | "2" | "3" | "4" | "last";

export type DiaryMeeting = {
  id: string;
  meeting_date: string;
  meeting_type: MeetingType;
  cancelled_at: string | null;
};

export type SeriesRule = { ordinal: Ordinal; weekday: number; months: number[] };

export type Dependencies = {
  attendance: number; bookings: number; summonses: number; dining_invoices: number; booking_page: number;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const ORDINALS: { value: Ordinal; label: string }[] = [
  { value: "1", label: "1st" }, { value: "2", label: "2nd" }, { value: "3", label: "3rd" }, { value: "4", label: "4th" }, { value: "last", label: "Last" },
];

/**
 * Dates for one season of a repeating series. The first listed month opens the
 * season in `startYear`; any later-listed month that is numerically earlier
 * falls in the following calendar year (e.g. Oct, Nov … Apr, May).
 */
export function generateSeriesDates(rule: SeriesRule, startYear: number): string[] {
  if (!rule.months.length) return [];
  const first = rule.months[0];
  return rule.months
    .map((m) => nthWeekdayOfMonth(m >= first ? startYear : startYear + 1, m, rule.ordinal, rule.weekday))
    .sort();
}

/** Generated dates split into those to add and those already in the diary (any non-cancelled meeting that day). */
export function planSeries(rule: SeriesRule, startYear: number, meetings: DiaryMeeting[]) {
  const taken = new Set(meetings.filter((m) => !m.cancelled_at).map((m) => m.meeting_date));
  const dates = generateSeriesDates(rule, startYear);
  return { toAdd: dates.filter((d) => !taken.has(d)), existing: dates.filter((d) => taken.has(d)) };
}

export type MovePlan =
  | { ok: false; error: string }
  | { ok: true; installationOverride: { year: number; date: string } | null };

/** Validate moving a meeting; an Installation move also moves the stored override. */
export function planMove(meetings: DiaryMeeting[], id: string, newDate: string): MovePlan {
  const m = meetings.find((x) => x.id === id);
  if (!m) return { ok: false, error: "Meeting not found." };
  if (m.cancelled_at) return { ok: false, error: "Restore the meeting before moving it." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return { ok: false, error: "Enter a real date." };
  if (newDate === m.meeting_date) return { ok: false, error: "Choose a different date." };
  if (meetings.some((x) => x.id !== id && !x.cancelled_at && x.meeting_date === newDate)) {
    return { ok: false, error: "Another meeting is already on that date." };
  }
  return {
    ok: true,
    installationOverride: m.meeting_type === "installation" ? { year: Number(newDate.slice(0, 4)), date: newDate } : null,
  };
}

/** Plain-language warnings before dropping or moving a meeting with history. */
export function dependencyWarnings(d: Dependencies | null): string[] {
  if (!d) return [];
  const out: string[] = [];
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  if (d.attendance) out.push(n(d.attendance, "attendance record", "attendance records"));
  if (d.bookings) out.push(n(d.bookings, "booking", "bookings"));
  if (d.summonses) out.push(n(d.summonses, "summons", "summonses"));
  if (d.dining_invoices) out.push(n(d.dining_invoices, "dining invoice", "dining invoices"));
  if (d.booking_page) out.push("a booking page");
  return out;
}

/** Masonic years either side of an Installation date change, before and after. */
export function installationEffect(cfg: InstallationConfig, year: number, newDate: string | null) {
  const after: InstallationConfig = { rule: cfg.rule, stored: { ...cfg.stored } };
  if (newDate) after.stored[year] = newDate; else delete after.stored[year];
  const pick = (c: InstallationConfig): { previous: MasonicYearRange | null; next: MasonicYearRange | null } => ({
    previous: getMasonicYearRange(year - 1, c),
    next: getMasonicYearRange(year, c),
  });
  return { before: pick(cfg), after: pick(after) };
}
