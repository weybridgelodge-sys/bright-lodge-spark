// Memorable-dates detection for the Almoner: birthdays and "years as a
// Freemason" anniversaries falling on a given day.
//
// Design notes:
//  - EVERY anniversary is celebrated, not just round numbers. A lodge marking
//    only 10/20/25 would stay silent for most brethren most years; the whole
//    point of the Almoner's role is regular, personal contact.
//  - Dates are compared on month/day in Europe/London wall-clock time.
//  - 29 February falls back to 28 February in non-leap years so leap-day
//    brethren are never skipped.

export interface CelebrationMember {
  id: string
  title?: string | null
  first_name?: string | null
  last_name?: string | null
  preferred_name?: string | null
  full_name?: string | null
  date_of_birth?: string | null
  initiation_date?: string | null
}

export interface Celebration {
  memberId: string
  name: string
  type: 'birthday' | 'anniversary'
  years: number
  /** The full message, ready to send to the lodge WhatsApp group. */
  message: string
  /** wa.me deep link with the message pre-filled. */
  whatsappUrl: string
}

/** Masonic titles render strictly as "W Bro." / "RW Bro." (space + period). */
export function celebrationName(m: CelebrationMember): string {
  const first = (m.preferred_name?.trim() || m.first_name?.trim() || '').trim()
  const last = (m.last_name?.trim() || '').trim()
  const person = [first, last].filter(Boolean).join(' ').trim() || (m.full_name?.trim() ?? '')
  const rawTitle = (m.title ?? '').trim().replace(/\.+$/, '')
  const title = rawTitle ? `${rawTitle}.` : ''
  return [title, person].filter(Boolean).join(' ').trim() || 'Our brother'
}

export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** YYYY-MM-DD for "today" in Europe/London, regardless of server timezone. */
export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/**
 * Does `iso` (a full date) have its anniversary on `today` (YYYY-MM-DD)?
 * Handles the 29 Feb -> 28 Feb fallback in non-leap years.
 */
export function matchesToday(iso: string, today: string): boolean {
  const md = iso.slice(5, 10)
  const todayMd = today.slice(5, 10)
  if (md === todayMd) return true
  const todayYear = Number(today.slice(0, 4))
  if (md === '02-29' && todayMd === '02-28' && !isLeapYear(todayYear)) return true
  return false
}

/** Whole years elapsed between `iso` and `today`. */
export function yearsSince(iso: string, today: string): number {
  return Number(today.slice(0, 4)) - Number(iso.slice(0, 4))
}

export function whatsappLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/** Build the celebration list for a single day. Empty array = stay silent. */
export function detectCelebrations(
  members: CelebrationMember[],
  today: string,
): Celebration[] {
  const out: Celebration[] = []

  for (const m of members) {
    const name = celebrationName(m)

    const dob = m.date_of_birth ?? null
    if (dob && matchesToday(dob, today)) {
      const years = yearsSince(dob, today)
      if (years > 0) {
        const message = `Wishing ${name} a very happy ${ordinal(years)} birthday today! 🎉`
        out.push({
          memberId: m.id,
          name,
          type: 'birthday',
          years,
          message,
          whatsappUrl: whatsappLink(message),
        })
      }
    }

    const init = m.initiation_date ?? null
    if (init && matchesToday(init, today)) {
      const years = yearsSince(init, today)
      if (years > 0) {
        const message = `Let's all congratulate ${name} on ${years} year${years === 1 ? '' : 's'} as a Freemason today!`
        out.push({
          memberId: m.id,
          name,
          type: 'anniversary',
          years,
          message,
          whatsappUrl: whatsappLink(message),
        })
      }
    }
  }

  // Birthdays first, then anniversaries; alphabetical within each group.
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'birthday' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return out
}
