// One unit's run of the Almoner check (JOB CI). Pure: db, email and push injected.
// Members, meetings and the Almoner are this unit's own; welfare rows (no
// unit column) belong to the unit through their member.
import { detectCelebrations, londonToday } from './celebrations.ts'
import { evaluateAutoLog } from '../_shared/almonerAutoLog.ts'
import { computeCheckInFlags } from '../_shared/almonerCheckIn.ts'
import { isDigestDay, digestWindowStart, datesBetween, addDays } from '../_shared/almonerDigestSchedule.ts'
import type { LodgeSettings } from '../_shared/lodgeSettingsResolve.ts'
import { brandFields, unitOfficerRecipient } from '../_shared/units.ts'

// deno-lint-ignore no-explicit-any
type Db = any
export interface Deps {
  db: Db
  send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>
  /** POST to send-push-notification; returns a fetch-like response. */
  push: (body: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>
  now?: () => number
}
export interface Opts { dryRun: boolean; force: boolean; testDate: string | null; singleUnit: boolean }

const displayName = (m: any): string => {
  const first = (m.preferred_name?.trim() || m.first_name?.trim() || '').trim()
  const last = (m.last_name?.trim() || '').trim()
  const composed = [first, last].filter(Boolean).join(' ').trim()
  return composed || (m.full_name?.trim() || 'Unnamed member')
}

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, o: Opts): Promise<Record<string, unknown>> {
  const supabase = deps.db
  const PORTAL_URL = lodge.configuredSiteUrl ? `${lodge.configuredSiteUrl}/members/almoner` : undefined
    const today = new Date().toISOString().slice(0, 10)
    // Celebrations use Europe/London wall-clock so a birthday never lands a
    // day early/late. `?test_date=YYYY-MM-DD` lets us rehearse a future date.
    const testDate = o.testDate
    const celebrationDay = /^\d{4}-\d{2}-\d{2}$/.test(testDate ?? '')
      ? (testDate as string)
      : londonToday()

    // ---- Run independent reads in parallel ----
    // 1) active members, 2) open welfare logs, 3) last two past meetings.
    const [membersRes, logsRes, meetingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id,full_name,preferred_name,first_name,last_name,title,status,date_of_birth,initiation_date',
        )
        .eq('status', 'active')
        .eq('unit_id', unitId),

      supabase
        .from('welfare_log_entries')
        .select('member_id,contact_date,follow_up_date')
        .is('deleted_at', null)
        .eq('is_system', false)
        .order('contact_date', { ascending: false }),
      supabase
        .from('festive_board_meetings')
        .select('id,meeting_date,meeting_type')
        .eq('unit_id', unitId)
        .is('cancelled_at', null)
        .lte('meeting_date', today)
        .order('meeting_date', { ascending: false })
        .limit(24),
    ])
    if (membersRes.error) throw membersRes.error
    if (logsRes.error) throw logsRes.error

    const members = membersRes.data ?? []
    const memberById = new Map<string, any>(members.map((m: any) => [m.id, m]))

    const last: Record<string, string> = {}
    const followUp: Record<string, string> = {}
    // welfare_log_entries has no unit: a log belongs to this lodge through its member.
    for (const l of ((logsRes.data ?? []) as any[]).filter((r) => memberById.has(r.member_id))) {
      if (!last[l.member_id]) last[l.member_id] = l.contact_date
      if (l.follow_up_date) {
        const existing = followUp[l.member_id]
        if (!existing || l.follow_up_date < existing) followUp[l.member_id] = l.follow_up_date
      }
    }
    const overdue: Record<string, string> = {}
    for (const [mid, dt] of Object.entries(followUp)) {
      if (dt < today) {
        const newest = last[mid]
        if (!newest || newest <= dt) overdue[mid] = dt
      }
    }

    // ---- Absence patterns ----
    const allMeetings = ((meetingsRes.data as any[]) ?? []) as Array<{ id: string; meeting_date: string; meeting_type: string }>
    const meetingIds = allMeetings.map((m) => m.id)
    const absentFlags: Record<string, boolean> = {}
    const checkInFlags: Record<string, string> = {}
    if (meetingIds.length > 0) {
      const { data: att } = await supabase
        .from('festive_board_attendance')
        .select('member_id,meeting_id,attendance_status')
        .in('meeting_id', meetingIds)
      const rows = ((att as any[]) ?? [])

      // (a) Hard flag: unexplained absence from the last two meetings.
      // "booked"/"attended" count as present, "apologies" as explained.
      const present = new Map<string, Set<string>>()
      for (const a of rows) {
        if (
          (a.attendance_status === 'attended' ||
            a.attendance_status === 'booked' ||
            a.attendance_status === 'apologies') &&
          a.member_id
        ) {
          if (!present.has(a.member_id)) present.set(a.member_id, new Set())
          present.get(a.member_id)!.add(a.meeting_id)
        }
      }
      if (meetingIds.length >= 2) {
        for (const m of members as any[]) {
          const s = present.get(m.id) ?? new Set()
          const ack = last[m.id] ?? ''
          const fresh = allMeetings[0].meeting_date > ack || allMeetings[1].meeting_date > ack
          if (!s.has(meetingIds[0]) && !s.has(meetingIds[1]) && fresh) absentFlags[m.id] = true
        }
      }

      // (b) Soft flag: shared with the Welfare Board badge so they never drift.
      const flags = computeCheckInFlags(allMeetings, rows, (members as any[]).map((m) => m.id), new Date(), last)
      for (const [id, f] of Object.entries(flags)) checkInFlags[id] = f.label
    }

    // ---- Almoner Auto-Log: system Welfare Log entries for genuine disengagement ----
    const autoLogNew: Array<{ member_id: string; key: string; tier: 1 | 2; trigger_date: string; reason: string }> = []
    {
      const { data: autoMeetings, error: amErr } = await supabase
        .from('festive_board_meetings')
        .select('id,meeting_date,meeting_type')
        .eq('unit_id', unitId)
        .is('cancelled_at', null)
        .gte('meeting_date', '2026-02-18')
        .lte('meeting_date', today)
      if (amErr) throw amErr
      const ids = ((autoMeetings as any[]) ?? []).map((m) => m.id)
      let autoAtt: any[] = []
      if (ids.length) {
        const { data, error } = await supabase
          .from('festive_board_attendance')
          .select('member_id,meeting_id,attendance_status')
          .in('meeting_id', ids)
        if (error) throw error
        autoAtt = (data as any[]) ?? []
      }
      const { data: absRows, error: absErr } = await supabase
        .from('welfare_absences')
        .select('member_id,period_start,period_end,deleted_at')
      if (absErr) throw absErr
      const autoAbs = ((absRows as any[]) ?? []).filter((a) => !a.deleted_at && memberById.has(a.member_id))
      const escalations = evaluateAutoLog(
        (autoMeetings as any[]) ?? [],
        autoAtt,
        (members as any[]).map((m) => ({ id: m.id, initiation_date: m.initiation_date ?? null })),
        today,
        undefined,
        autoAbs,
        last,
      )
      // Existing keys, including dismissed (soft-deleted) ones, are never re-created.
      const { data: existing, error: exErr } = await supabase
        .from('welfare_log_entries')
        .select('member_id,system_key')
        .not('system_key', 'is', null)
      if (exErr) throw exErr
      const seen = new Set(((existing as any[]) ?? []).map((r) => `${r.member_id}|${r.system_key}`))
      for (const e of escalations) if (!seen.has(`${e.member_id}|${e.key}`)) autoLogNew.push(e)
      if (!o.dryRun && autoLogNew.length) {
        const { error: insErr } = await supabase.from('welfare_log_entries').insert(
          autoLogNew.map((e) => ({
            member_id: e.member_id,
            contact_date: e.trigger_date,
            contact_type: 'none',
            contact_nature: 'routine',
            notes: e.reason,
            is_system: true,
            system_reason: e.tier === 2 ? 'new_member_missed' : 'missed_without_apology',
            system_key: e.key,
            logged_by: null,
          })),
        )
        if (insErr) throw insErr
      }
    }
    // ---- Weekly email window: "since the last digest actually sent" ----
    // Detection above runs daily; only the email is weekly (DIGEST_WEEKDAY).
    const isDigest = isDigestDay(celebrationDay) || (o.force && !o.dryRun) || !!o.testDate
    // This lodge's last digest (send log tagged with the unit). Untagged rows
    // predate per-lodge sends and count only when exactly one lodge exists.
    const lastFor = (scope: (q: any) => any) => scope(supabase
      .from('email_send_log')
      .select('created_at')
      .eq('template_name', 'almoner-overdue-digest')
      .eq('status', 'sent'))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    let { data: lastSend } = await lastFor((q) => q.contains('metadata', { unit_id: unitId }))
    if (!lastSend && o.singleUnit) ({ data: lastSend } = await lastFor((q) => q.is('metadata', null)))
    const windowStart = digestWindowStart((lastSend as any)?.created_at ?? null, new Date())
    const windowStartDate = windowStart.slice(0, 10)

    // System entries created since the last email (dismissed ones excluded).
    const { data: sysRows, error: sysErr } = await supabase
      .from('welfare_log_entries')
      .select('member_id,notes,created_at')
      .eq('is_system', true)
      .is('deleted_at', null)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
    if (sysErr) throw sysErr
    const autoLogByMember: Record<string, string[]> = {}
    for (const r of (sysRows as any[]) ?? []) {
      if (!memberById.has(r.member_id)) continue
      const when = new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Europe/London' })
      ;(autoLogByMember[r.member_id] ??= []).push(`${String(r.notes ?? '').replace(/^System: /, '')} (logged ${when})`)
    }
    if (o.dryRun) {
      return {
          dry_run: true,
          digest_day: isDigestDay(celebrationDay),
          window_start: windowStart,
          auto_log_new: autoLogNew.map((e) => ({ member_id: e.member_id, key: e.key, tier: e.tier, trigger_date: e.trigger_date })),
          system_entries_since_last_email: Object.values(autoLogByMember).flat().length,
          open_flags: new Set([...Object.keys(overdue), ...Object.keys(absentFlags), ...Object.keys(checkInFlags)]).size,
        }
    }

    // ---- Build flagged list ----
    const flaggedIds = new Set<string>([
      ...Object.keys(overdue),
      ...Object.keys(absentFlags),
      ...Object.keys(checkInFlags),
      ...Object.keys(autoLogByMember),
    ])
    const flagged = Array.from(flaggedIds)
      .map((id) => {
        const m = memberById.get(id)
        if (!m) return null
        return {
          name: displayName(m),
          overdueFollowUp: overdue[id] ?? null,
          missedMeetings: !!absentFlags[id],
          checkIn: checkInFlags[id] ?? null,
          systemLogged: autoLogByMember[id] ?? [],
          portalUrl: PORTAL_URL,
        }
      })
      .filter(Boolean) as Array<{ name: string; overdueFollowUp: string | null; missedMeetings: boolean; checkIn: string | null; systemLogged: string[]; portalUrl: string }>

    // ---- Memorable dates ----
    // Today's drive the daily push; the weekly email lists those since the
    // last email plus the coming 7 days.
    const celebrations = detectCelebrations(members as any[], celebrationDay)
    const weekCelebrations = datesBetween(
      windowStartDate < celebrationDay ? addDays(windowStartDate, 1) : celebrationDay,
      addDays(celebrationDay, 7),
    ).flatMap((d) => detectCelebrations(members as any[], d).map((c) => ({ ...c, date: d })))

    if (!isDigest && celebrations.length === 0) {
      return { sent: false, reason: 'not_digest_day', auto_log_new: autoLogNew.length }
    }
    if (isDigest && flagged.length === 0 && weekCelebrations.length === 0 && celebrations.length === 0) {
      console.log('almoner-overdue-check: nothing to report')
      return { sent: false, reason: 'nothing_flagged' }
    }

    // Stable sort: overdue first, then by name
    flagged.sort((a, b) => {
      const ao = a.overdueFollowUp ? 0 : 1
      const bo = b.overdueFollowUp ? 0 : 1
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })


    // ---- Resolve Almoner (email + member id for push) ----
    // This lodge's Almoner only; none = skip, never another lodge's Almoner.
    const rec = await unitOfficerRecipient(supabase, 'almoner', 'almoner', unitId)
    const almonerEmail: string | null = rec?.email ?? null
    const almonerId: string | null = rec?.id ?? null

    // ---- Push notifications: one per celebration, tap opens WhatsApp ----
    // Deliberately separate notifications so multiple matches on the same day
    // stay individually shareable rather than squashed into one message.
    let pushSent = 0
    const pushErrors: string[] = []
    if (almonerId && celebrations.length > 0) {
      for (const c of celebrations) {
        try {
          const pr = await deps.push({
              title: c.type === 'birthday' ? '🎉 Birthday today' : '🎓 Masonic anniversary today',
              body: c.message,
              member_ids: [almonerId],
              data: {
                kind: 'almoner_celebration',
                celebration_type: c.type,
                member_id: c.memberId,
                message: c.message,
                // The native tap handler opens this URL.
                url: c.whatsappUrl,
              },
          })
          const pj = await pr.json().catch(() => ({}))
          if (!pr.ok) pushErrors.push(`${c.name}: HTTP ${pr.status}`)
          else pushSent += Number(pj.android_sent ?? 0) + Number(pj.ios_sent ?? 0)
        } catch (e) {
          pushErrors.push(`${c.name}: ${(e as Error).message}`)
        }
      }
      if (pushErrors.length) console.warn('celebration push failures', pushErrors)
    }

    // Non-digest days stop after the push: no email.
    if (!isDigest) {
      return { sent: false, reason: 'not_digest_day', push_sent: pushSent, push_errors: pushErrors }
    }
    if (flagged.length === 0 && weekCelebrations.length === 0) {
      return { sent: false, reason: 'nothing_flagged', push_sent: pushSent }
    }

    if (!almonerEmail) {
      console.warn('almoner-overdue-check: no almoner appointment or role holder found; flagged=', flagged.length)
      return { error: 'no_almoner_recipient', flagged: flagged.length, celebrations: celebrations.length }
    }


    // ---- Weekly email ----
    const fmtUk = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
    const reportDate = fmtUk(new Date().toISOString())
    const sinceDate = fmtUk(windowStart)
    // One email per week: a rerun on the same digest day is de-duplicated.
    const idempotencyKey = o.force || testDate
      ? `almoner-weekly-${unitId}-${today}-force-${(deps.now ?? Date.now)()}`
      : `almoner-weekly-${unitId}-${celebrationDay}`


    const resp = await deps.send({
      templateName: 'almoner-overdue-digest',
      recipientEmail: almonerEmail,
      unitId,
      idempotencyKey,
      templateData: {
        members: flagged,
        celebrations: weekCelebrations.map((c) => ({
          name: c.name,
          type: c.type,
          years: c.years,
          message: c.message,
          whatsappUrl: c.whatsappUrl,
          date: c.date,
          upcoming: c.date > celebrationDay,
        })),
        reportDate,
        sinceDate,
        portalUrl: PORTAL_URL,
        ...brandFields(lodge),
      },
    })
    if (!resp.ok) {
      console.error('almoner digest send failed', resp.status, resp.error)
      return { error: 'send_failed', detail: resp.error }
    }

    console.log('almoner-overdue-check: enqueued digest', {
      recipient: almonerEmail,
      flagged: flagged.length,
      celebrations: celebrations.length,
      pushSent,
    })
    return {
        sent: true,
        recipient: almonerEmail,
        flagged: flagged.length,
        celebrations,
        push_sent: pushSent,
        push_errors: pushErrors,
      }

}
