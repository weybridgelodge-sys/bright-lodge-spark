// KPI dashboard / Members — Meeting diary rules (pure, no I/O).
// Meetings live in festive_board_meetings; this module only plans changes so
// the screen and tests share one rule set.
import {
  getMasonicYearRange, nthWeekdayOfMonth,
  type InstallationConfig, type MasonicYearRange,
} from "../../supabase/functions/_shared/masonicYear";

export type MeetingType = "regular" | "installation" | "emergency" | "dispensation";
/** Only these types follow the per-month schedule; others are one-off meetings. */
export const SCHEDULED_TYPES: MeetingType[] = ["regular", "installation"];
export const isOneOff = (t: string) => !SCHEDULED_TYPES.includes(t as MeetingType);
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

// ---- Per-month meeting schedule (Year Book "meeting schedule per month") ----
export type ScheduleMonth = { month: number; ordinal: Ordinal; weekday: number; meeting_type: MeetingType };
export type ScheduleMeeting = DiaryMeeting & { status?: string };

const pad = (n: number) => String(n).padStart(2, "0");
const parts = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Week ordinal of a date: 1st–4th, or "last" for a 5th occurrence. */
export function ordinalOf(iso: string): Ordinal {
  const n = Math.ceil(parts(iso).d / 7);
  return n >= 5 ? "last" : (String(n) as Ordinal);
}

/**
 * Infer the schedule from dated, non-cancelled meetings. The unit's usual
 * weekday is the most common one; meetings on another weekday (one-off drafts)
 * are ignored. Each month takes its most common week; Installation wins the type.
 */
export function inferSchedule(meetings: ScheduleMeeting[]): ScheduleMonth[] {
  const live = meetings.filter((m) => !m.cancelled_at && !isOneOff(m.meeting_type));
  if (!live.length) return [];
  const count = <T,>(xs: T[]) => { const c = new Map<T, number>(); xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1)); return [...c.entries()].sort((a, b) => b[1] - a[1]); };
  const wd = count(live.map((m) => parts(m.meeting_date).wd))[0][0];
  const out: ScheduleMonth[] = [];
  for (let month = 1; month <= 12; month++) {
    const inMonth = live.filter((m) => parts(m.meeting_date).m === month && parts(m.meeting_date).wd === wd);
    if (!inMonth.length) continue;
    out.push({
      month, weekday: wd,
      ordinal: count(inMonth.map((m) => ordinalOf(m.meeting_date)))[0][0],
      meeting_type: inMonth.some((m) => m.meeting_type === "installation") ? "installation" : "regular",
    });
  }
  return out;
}

/** Season dates: months from `startMonth` in `startYear` through the month before it next year. */
export function scheduleDates(schedule: ScheduleMonth[], startYear: number, startMonth: number) {
  return schedule
    .map((s) => ({ ...s, date: nthWeekdayOfMonth(s.month >= startMonth ? startYear : startYear + 1, s.month, s.ordinal, s.weekday) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type PlanRow = { date: string; meeting_type: MeetingType; status: "existing" | "new" | "moved"; existingDate?: string; warning?: string };

/** Preview a season: skip dates already in the diary (date + type), flag months whose meeting sits on another date. */
export function planSchedule(schedule: ScheduleMonth[], startYear: number, startMonth: number, meetings: ScheduleMeeting[]): PlanRow[] {
  const all = meetings.filter((m) => !m.cancelled_at);
  const live = all.filter((m) => !isOneOff(m.meeting_type));
  return scheduleDates(schedule, startYear, startMonth).map(({ date, meeting_type }) => {
    const warning = bankHoliday(date) ?? (all.some((m) => m.meeting_date === date && m.meeting_type !== meeting_type) ? "Another meeting is on this date" : undefined);
    if (live.some((m) => m.meeting_date === date && m.meeting_type === meeting_type)) return { date, meeting_type, status: "existing", warning: undefined };
    const sameMonth = live.find((m) => m.meeting_date.slice(0, 7) === date.slice(0, 7) && m.meeting_type === meeting_type);
    if (sameMonth) return { date, meeting_type, status: "moved", existingDate: sameMonth.meeting_date, warning };
    return { date, meeting_type, status: "new", warning };
  });
}

/** One-off meetings (dispensation, emergency): never governed by the schedule. */
export const oneOffMeetings = <T extends ScheduleMeeting>(meetings: T[]) => meetings.filter((m) => !m.cancelled_at && isOneOff(m.meeting_type));

/** Diary meetings that do not match the schedule (kept and editable, never removed). */
export function outsideSchedule(schedule: ScheduleMonth[], meetings: ScheduleMeeting[]) {
  return meetings.filter((m) => {
    if (m.cancelled_at || isOneOff(m.meeting_type)) return false;
    const p = parts(m.meeting_date);
    const s = schedule.find((x) => x.month === p.m);
    return !s || nthWeekdayOfMonth(p.y, p.m, s.ordinal, s.weekday) !== m.meeting_date;
  });
}

function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}
/** Warning only: England & Wales bank holidays (substitute days not modelled). */
export function bankHoliday(iso: string): string | undefined {
  const { y, m, d } = parts(iso);
  const t = Date.UTC(y, m - 1, d), day = 86400000, e = easter(y);
  if (t === e - 2 * day) return "Good Friday";
  if (t === e + day) return "Easter Monday";
  if (m === 1 && d === 1) return "New Year's Day";
  if (m === 12 && (d === 25 || d === 26)) return d === 25 ? "Christmas Day" : "Boxing Day";
  const nth = (mo: number, o: Ordinal) => nthWeekdayOfMonth(y, mo, o, 1);
  const iso2 = `${y}-${pad(m)}-${pad(d)}`;
  if (iso2 === nth(5, "1") || iso2 === nth(5, "last") || iso2 === nth(8, "last")) return "Bank holiday";
  void daysIn;
  return undefined;
}
