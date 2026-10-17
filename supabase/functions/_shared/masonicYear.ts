// KPI dashboard / Members — Masonic year helper (pure, dependency-free).
//
// A Masonic year runs from one Installation meeting to the day before the
// next. The Installation day itself belongs to the NEW year. Dates come from
// the unit's installation rule (settings, never constants); a stored
// officer_installation_dates row for a year always overrides the rule.
// All dates are ISO YYYY-MM-DD strings handled in UTC to avoid DST shifts.

export type InstallationRule = {
  mode: 'weekday_rule' | 'fixed_date'
  installation_month: number // 1–12
  installation_ordinal: '1' | '2' | '3' | '4' | 'last' | null
  installation_weekday: number | null // 0 = Sunday … 6 = Saturday
  fixed_day: number | null
  applies_from_year: number | null
}

export type InstallationConfig = {
  rule: InstallationRule | null
  /** Stored installation dates keyed by the year of that installation. */
  stored: Record<number, string>
}

export type MasonicYearRange = {
  startYear: number
  start: string
  /** Day before the next installation, or null when it cannot be known yet. */
  end: string | null
  label: string
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function ruleDateFor(year: number, rule: InstallationRule | null): string | null {
  if (!rule) return null
  if (rule.applies_from_year != null && year < rule.applies_from_year) return null
  const m = rule.installation_month - 1
  if (rule.mode === 'fixed_date') {
    if (!rule.fixed_day) return null
    const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
    return iso(new Date(Date.UTC(year, m, Math.min(rule.fixed_day, last))))
  }
  if (rule.installation_weekday == null || !rule.installation_ordinal) return null
  const wd = rule.installation_weekday
  if (rule.installation_ordinal === 'last') {
    const d = new Date(Date.UTC(year, m + 1, 0))
    while (d.getUTCDay() !== wd) d.setUTCDate(d.getUTCDate() - 1)
    return iso(d)
  }
  const d = new Date(Date.UTC(year, m, 1))
  while (d.getUTCDay() !== wd) d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCDate(d.getUTCDate() + 7 * (Number(rule.installation_ordinal) - 1))
  return iso(d)
}

/** Stored date for that year if present, otherwise the rule's date. */
export function installationDateFor(year: number, cfg: InstallationConfig): string | null {
  return cfg.stored[year] ?? ruleDateFor(year, cfg.rule)
}

function dayBefore(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return iso(new Date(Date.UTC(y, m - 1, d - 1)))
}

export function formatRangeDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function getMasonicYearRange(startYear: number, cfg: InstallationConfig): MasonicYearRange | null {
  const start = installationDateFor(startYear, cfg)
  if (!start) return null
  const next = installationDateFor(startYear + 1, cfg)
  return { startYear, start, end: next ? dayBefore(next) : null, label: `${startYear}/${startYear + 1}` }
}

/** The Masonic year containing `date`: latest installation on or before it. */
export function getMasonicYear(date: string, cfg: InstallationConfig): MasonicYearRange | null {
  const y = Number(date.slice(0, 4))
  for (const candidate of [y, y - 1, y - 2]) {
    const inst = installationDateFor(candidate, cfg)
    if (inst && inst <= date) return getMasonicYearRange(candidate, cfg)
  }
  return null
}

export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
