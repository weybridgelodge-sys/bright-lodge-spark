// Almoner Auto-Log evaluator (pure, dependency-free; shared by the daily
// edge function and the app's unit tests).
//
// Tier 1 (established members): 2 consecutive unexplained misses, or 3
//   unexplained misses in one lodge year (Oct–Sep). "Unexplained" is judged
//   per meeting: an apology only excuses the meeting it was given for.
// Tier 2 (within 12 months of initiation): any single missed meeting,
//   apologised or not.
// Each escalation has a stable key so re-running against the same unresolved
// gap never produces a second entry.

export const AUTO_LOG_FROM = '2026-02-18'

export type AutoLogMeeting = { id: string; meeting_date: string; meeting_type: string }
export type AutoLogAttendance = { member_id: string | null; meeting_id: string; attendance_status: string }
export type AutoLogMember = { id: string; initiation_date: string | null }

export type AutoLogEscalation = {
  member_id: string
  key: string
  tier: 1 | 2
  /** Date of the meeting that triggered the escalation. */
  trigger_date: string
  meeting_dates: string[]
  reason: string
}

const PRESENT = new Set(['attended', 'booked'])

const fmt = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function lodgeYearOf(date: string): number {
  const [y, m] = date.split('-').map(Number)
  return m >= 10 ? y : y - 1
}

function addYear(date: string): string {
  const [y, m, d] = date.split('-')
  return `${Number(y) + 1}-${m}-${d}`
}

export function evaluateAutoLog(
  meetings: AutoLogMeeting[],
  attendance: AutoLogAttendance[],
  members: AutoLogMember[],
  today: string,
  from: string = AUTO_LOG_FROM,
): AutoLogEscalation[] {
  const recorded = new Set(attendance.map((a) => a.meeting_id))
  const usable = meetings
    .filter((m) => m.meeting_type === 'regular' && m.meeting_date >= from && m.meeting_date <= today && recorded.has(m.id))
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
  if (usable.length === 0) return []

  const status = new Map<string, string>()
  for (const a of attendance) if (a.member_id) status.set(`${a.member_id}|${a.meeting_id}`, a.attendance_status)

  const out: AutoLogEscalation[] = []
  for (const mem of members) {
    let streak: AutoLogMeeting[] = []
    let streakLogged = false
    const yearMisses = new Map<number, AutoLogMeeting[]>()
    for (const mt of usable) {
      // Not yet a member at this meeting.
      if (mem.initiation_date && mt.meeting_date < mem.initiation_date) continue
      const st = status.get(`${mem.id}|${mt.meeting_id ?? mt.id}`)
      const isNew = !!mem.initiation_date && mt.meeting_date < addYear(mem.initiation_date)
      const present = !!st && PRESENT.has(st)

      if (isNew) {
        if (!present) {
          out.push({
            member_id: mem.id, key: `t2:${mt.id}`, tier: 2, trigger_date: mt.meeting_date,
            meeting_dates: [mt.meeting_date],
            reason: `System: new member (first year) not at the meeting on ${fmt(mt.meeting_date)}${st === 'apologies' ? ' — apology given' : ''}. Friendly check-in suggested.`,
          })
        }
        // New-member meetings don't feed Tier 1 counters.
        streak = []; streakLogged = false
        continue
      }

      const unexplained = !present && st !== 'apologies'
      if (!unexplained) { streak = []; streakLogged = false; continue }

      streak.push(mt)
      if (streak.length >= 2 && !streakLogged) {
        streakLogged = true
        const dates = streak.map((s) => s.meeting_date)
        out.push({
          member_id: mem.id, key: `t1c:${streak[0].id}`, tier: 1, trigger_date: mt.meeting_date,
          meeting_dates: dates,
          reason: `System: missed without apology — ${dates.map(fmt).join(', ')} (2 consecutive meetings).`,
        })
      }
      const ly = lodgeYearOf(mt.meeting_date)
      const list = yearMisses.get(ly) ?? []
      list.push(mt)
      yearMisses.set(ly, list)
      if (list.length === 3) {
        const dates = list.map((s) => s.meeting_date)
        out.push({
          member_id: mem.id, key: `t1y:${ly}`, tier: 1, trigger_date: mt.meeting_date,
          meeting_dates: dates,
          reason: `System: missed without apology — ${dates.map(fmt).join(', ')} (3 meetings this lodge year).`,
        })
      }
    }
  }
  return out
}
