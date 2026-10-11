// Pure helpers for the weekly Almoner digest. Detection runs daily; only the
// email send is gated to one weekday, covering everything since the last send.

/** 0 = Sunday … 6 = Saturday. Monday by default; change here to move the send day. */
export const DIGEST_WEEKDAY = 1
export const DEFAULT_LOOKBACK_DAYS = 7
export const MAX_LOOKBACK_DAYS = 35

/** Weekday of a YYYY-MM-DD calendar date (timezone-free). */
export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay()
}

export function isDigestDay(londonDate: string, weekday = DIGEST_WEEKDAY): boolean {
  return weekdayOf(londonDate) === weekday
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Start (inclusive, ISO timestamp) of the "since last email" window.
 * No previous send → 7 days back; a very old last send is capped at 35 days.
 */
export function digestWindowStart(lastSentAt: string | null, now: Date): string {
  const nowMs = now.getTime()
  const floor = nowMs - MAX_LOOKBACK_DAYS * 86400000
  if (!lastSentAt) return new Date(nowMs - DEFAULT_LOOKBACK_DAYS * 86400000).toISOString()
  const t = Date.parse(lastSentAt)
  if (!Number.isFinite(t) || t > nowMs) return new Date(nowMs - DEFAULT_LOOKBACK_DAYS * 86400000).toISOString()
  return new Date(Math.max(t, floor)).toISOString()
}

/** Every calendar date from `from` to `to` inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}
