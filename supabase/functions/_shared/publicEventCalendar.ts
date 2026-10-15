/** Pure public-calendar rules shared by the website and subscription feed. */
export type PublicCalendarRow = {
  id: string; slug: string; public_title: string; name?: string;
  event_date: string; start_time: string | null; end_time: string | null;
  venue: string | null; intro_copy?: string | null;
  is_public?: boolean; archived_at?: string | null;
};

export function londonToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function upcomingPublicCalendarRows<T extends PublicCalendarRow>(rows: T[], now = new Date()): T[] {
  const today = londonToday(now);
  return rows.filter((r) => r.is_public !== false && !r.archived_at && !!r.slug?.trim() && r.event_date >= today);
}

const normalTitle = (value: string) => value.toLowerCase().replace(/^(meeting|social):\s*/, "").replace(/[^a-z0-9]/g, "");

/** Same-day matching only: a recurring title on another date is a separate event. */
export function matchesPublicCalendarEvent(row: PublicCalendarRow, existing: { date: string; title: string; slug?: string }): boolean {
  return row.event_date === existing.date && (
    row.slug === existing.slug || [row.public_title, row.name].some((title) => !!title && normalTitle(title) === normalTitle(existing.title))
  );
}

export function publicCalendarTimes(row: PublicCalendarRow): { start: string; end: string | null } {
  const startTime = (row.start_time || "00:00:00").slice(0, 8).padEnd(8, ":00");
  const endTime = row.end_time?.slice(0, 8).padEnd(8, ":00");
  let endDate = row.event_date;
  if (endTime && endTime <= startTime) {
    const next = new Date(`${row.event_date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    endDate = next.toISOString().slice(0, 10);
  }
  return { start: `${row.event_date}T${startTime}`, end: endTime ? `${endDate}T${endTime}` : null };
}