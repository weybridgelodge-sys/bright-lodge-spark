// Pure logic for the monthly "missing Grand Lodge number" digest. No Deno or
// network imports so it can be unit-tested from vitest.

export interface MemberRow {
  id: string
  full_name?: string | null
  preferred_name?: string | null
  first_name?: string | null
  last_name?: string | null
  title?: string | null
  status?: string | null
  initiation_date?: string | null
  ugle_reg_number?: string | null
}

export interface MissingEntry {
  id: string
  name: string
  initiationDate: string // ISO YYYY-MM-DD
  initiationLabel: string // e.g. 13 May 2026
}

export const isBlank = (v: string | null | undefined): boolean => !v || v.trim() === ''

export const displayName = (m: MemberRow): string => {
  const first = (m.preferred_name?.trim() || m.first_name?.trim() || '').trim()
  const last = (m.last_name?.trim() || '').trim()
  const composed = [first, last].filter(Boolean).join(' ').trim()
  const title = m.title?.trim()
  const base = composed || m.full_name?.trim() || 'Unnamed member'
  return composed && title ? `${title}. ${base}` : base
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

/** 2026-05-13 -> "13 May 2026" (no timezone drift). */
export const ukDate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`
}

/** Active, initiated members with a blank Grand Lodge number, oldest first. */
export const findMissing = (rows: MemberRow[]): MissingEntry[] =>
  rows
    .filter((r) => r.status === 'active' && !isBlank(r.initiation_date) && isBlank(r.ugle_reg_number))
    .map((r) => ({
      id: r.id,
      name: displayName(r),
      initiationDate: (r.initiation_date as string).slice(0, 10),
      initiationLabel: ukDate(r.initiation_date as string),
    }))
    .sort((a, b) => a.initiationDate.localeCompare(b.initiationDate) || a.name.localeCompare(b.name))

/** Content-based key: same list in the same month dedupes; a changed list sends. */
export const idempotencyKey = (londonDate: string, entries: MissingEntry[]): string => {
  const ids = entries.map((e) => e.id).sort().join(',')
  let h = 5381
  for (let i = 0; i < ids.length; i++) h = ((h << 5) + h + ids.charCodeAt(i)) >>> 0
  return `secretary-ugle-${londonDate.slice(0, 7)}-n${entries.length}-${h.toString(36)}`
}

/** True only at 07:xx Europe/London on the 1st of the month. */
export const isSendWindow = (now: Date): boolean => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10)
  const hour = parseInt(parts.find((p) => p.type === 'hour')!.value, 10)
  return day === 1 && hour === 7
}
