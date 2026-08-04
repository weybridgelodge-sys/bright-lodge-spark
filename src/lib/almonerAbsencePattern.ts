// Soft "check-in nudge" pattern detection for the Almoner.
//
// Deliberately gentler than the existing unexplained-no-show alert: any
// non-"Attended" status counts equally (No Show, Apologies Given,
// Cancelled — Refunded, or no record at all). Only "Attended" — and "Booked"
// for meetings that have not happened yet — breaks a streak.

export type PatternMeeting = { id: string; meeting_date: string; meeting_type: string };
export type PatternAttendance = { member_id: string | null; meeting_id: string; attendance_status: string };

export type CheckInFlag = {
  /** Count of consecutive most-recent regular meetings not attended. */
  consecutive: number;
  /** Non-attended regular meetings in the current lodge year (Oct–Sep). */
  yearMissed: number;
  reason: "consecutive" | "frequency";
  label: string;
};

/** Lodge year runs Oct–Sep; returns the starting calendar year. */
export function lodgeYearStart(d = new Date()): number {
  return d.getMonth() + 1 >= 10 ? d.getFullYear() : d.getFullYear() - 1;
}

export function lodgeYearRange(d = new Date()): { start: string; end: string } {
  const y = lodgeYearStart(d);
  return { start: `${y}-10-01`, end: `${y + 1}-09-30` };
}

const BREAKS_STREAK = new Set(["attended", "booked"]);

/**
 * @param meetings past Regular meetings, any order (filtered internally)
 * @param attendance attendance rows for those meetings
 * @param memberIds active members to evaluate
 */
export function computeCheckInFlags(
  meetings: PatternMeeting[],
  attendance: PatternAttendance[],
  memberIds: string[],
  today = new Date()
): Record<string, CheckInFlag> {
  const todayStr = today.toISOString().slice(0, 10);
  const regular = meetings
    .filter((m) => m.meeting_type === "regular" && m.meeting_date <= todayStr)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  // Only consider meetings that actually have attendance recorded, so an
  // un-registered meeting doesn't flag the whole lodge.
  const recorded = new Set(attendance.map((a) => a.meeting_id));
  const usable = regular.filter((m) => recorded.has(m.id));
  if (usable.length === 0) return {};

  const statusByMember = new Map<string, Map<string, string>>();
  for (const a of attendance) {
    if (!a.member_id) continue;
    if (!statusByMember.has(a.member_id)) statusByMember.set(a.member_id, new Map());
    statusByMember.get(a.member_id)!.set(a.meeting_id, a.attendance_status);
  }

  const { start, end } = lodgeYearRange(today);
  const out: Record<string, CheckInFlag> = {};

  for (const id of memberIds) {
    const own = statusByMember.get(id) ?? new Map<string, string>();

    let consecutive = 0;
    for (const m of usable) {
      const st = own.get(m.id);
      if (st && BREAKS_STREAK.has(st)) break;
      consecutive += 1;
    }

    let yearMissed = 0;
    for (const m of usable) {
      if (m.meeting_date < start || m.meeting_date > end) continue;
      const st = own.get(m.id);
      if (!st || !BREAKS_STREAK.has(st)) yearMissed += 1;
    }

    if (consecutive >= 2) {
      out[id] = {
        consecutive,
        yearMissed,
        reason: "consecutive",
        label: `Not at last ${consecutive} meetings — worth a call?`,
      };
    } else if (yearMissed >= 3) {
      out[id] = {
        consecutive,
        yearMissed,
        reason: "frequency",
        label: `Missed ${yearMissed} meetings this lodge year — worth a call?`,
      };
    }
  }

  return out;
}
