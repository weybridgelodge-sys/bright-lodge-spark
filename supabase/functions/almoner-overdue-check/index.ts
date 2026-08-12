// Daily scheduled edge function: computes overdue Almoner follow-ups and
// members who missed their last two meetings, then emails a digest to the
// current Almoner via send-transactional-email.
//
// It also detects "memorable dates" (birthdays and years-as-a-Freemason
// anniversaries) for the day and, when there are any, sends the Almoner a push
// notification per celebration whose tap target is a pre-filled WhatsApp
// deep link. The same celebrations are repeated in the digest email as a
// backup in case the push is missed.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { detectCelebrations, londonToday } from './celebrations.ts'

const SITE_URL = 'https://weybridgelodge.org.uk'
const PORTAL_URL = `${SITE_URL}/members/almoner`


const displayName = (m: any): string => {
  const first = (m.preferred_name?.trim() || m.first_name?.trim() || '').trim()
  const last = (m.last_name?.trim() || '').trim()
  const composed = [first, last].filter(Boolean).join(' ').trim()
  return composed || (m.full_name?.trim() || 'Unnamed member')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only proceed at 06:00 Europe/London wall-clock time. The cron fires hourly
  // in UTC; the DST-aware guard below keeps the send at 6am local year-round.
  // Manual re-triggers can bypass the guard via ?force=1 (used by ops when a
  // scheduled run failed and the digest still needs to go out today).
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10,
  )
  if (!force && londonHour !== 6) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, londonHour }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }



  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const today = new Date().toISOString().slice(0, 10)
    // Celebrations use Europe/London wall-clock so a birthday never lands a
    // day early/late. `?test_date=YYYY-MM-DD` lets us rehearse a future date.
    const testDate = url.searchParams.get('test_date')
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
        .eq('status', 'active'),

      supabase
        .from('welfare_log_entries')
        .select('member_id,contact_date,follow_up_date')
        .is('deleted_at', null)
        .order('contact_date', { ascending: false }),
      supabase
        .from('festive_board_meetings')
        .select('id,meeting_date,meeting_type')
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
    for (const l of (logsRes.data ?? []) as any[]) {
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
          if (!s.has(meetingIds[0]) && !s.has(meetingIds[1])) absentFlags[m.id] = true
        }
      }

      // (b) Soft flag: pattern of not being around at Regular meetings.
      // Any non-"Attended" status counts equally; only "attended" (and
      // "booked" for future meetings) breaks a streak.
      const recorded = new Set(rows.map((a: any) => a.meeting_id))
      const regular = allMeetings
        .filter((m) => m.meeting_type === 'regular' && recorded.has(m.id))
        .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))
      const statusBy = new Map<string, Map<string, string>>()
      for (const a of rows) {
        if (!a.member_id) continue
        if (!statusBy.has(a.member_id)) statusBy.set(a.member_id, new Map())
        statusBy.get(a.member_id)!.set(a.meeting_id, a.attendance_status)
      }
      const lyStart = new Date().getMonth() + 1 >= 10 ? new Date().getFullYear() : new Date().getFullYear() - 1
      const yStart = `${lyStart}-10-01`
      const yEnd = `${lyStart + 1}-09-30`
      const breaks = new Set(['attended', 'booked'])
      for (const m of members as any[]) {
        const own = statusBy.get(m.id) ?? new Map<string, string>()
        let consecutive = 0
        for (const mt of regular) {
          const st = own.get(mt.id)
          if (st && breaks.has(st)) break
          consecutive += 1
        }
        let yearMissed = 0
        for (const mt of regular) {
          if (mt.meeting_date < yStart || mt.meeting_date > yEnd) continue
          const st = own.get(mt.id)
          if (!st || !breaks.has(st)) yearMissed += 1
        }
        if (consecutive >= 2) {
          checkInFlags[m.id] = `Not at the last ${consecutive} meetings — worth a call?`
        } else if (yearMissed >= 3) {
          checkInFlags[m.id] = `Missed ${yearMissed} meetings this lodge year — worth a call?`
        }
      }
    }

    // ---- Build flagged list ----
    const flaggedIds = new Set<string>([
      ...Object.keys(overdue),
      ...Object.keys(absentFlags),
      ...Object.keys(checkInFlags),
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
          portalUrl: PORTAL_URL,
        }
      })
      .filter(Boolean) as Array<{ name: string; overdueFollowUp: string | null; missedMeetings: boolean; checkIn: string | null; portalUrl: string }>

    // ---- Memorable dates (birthdays / years as a Freemason) ----
    const celebrations = detectCelebrations(members as any[], celebrationDay)

    if (flagged.length === 0 && celebrations.length === 0) {
      console.log('almoner-overdue-check: nothing to report')
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'nothing_flagged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Stable sort: overdue first, then by name
    flagged.sort((a, b) => {
      const ao = a.overdueFollowUp ? 0 : 1
      const bo = b.overdueFollowUp ? 0 : 1
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })


    // ---- Resolve Almoner (email + member id for push) ----
    const lodgeYear =
      new Date().getMonth() + 1 >= 10 ? new Date().getFullYear() : new Date().getFullYear() - 1

    let almonerEmail: string | null = null
    let almonerId: string | null = null
    const { data: appt } = await supabase
      .from('officer_appointments')
      .select('member_id')
      .eq('position_key', 'almoner')
      .eq('lodge_year', lodgeYear)
      .limit(1)
      .maybeSingle()

    if (appt?.member_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', appt.member_id)
        .maybeSingle()
      almonerEmail = prof?.email ?? null
      if (almonerEmail) almonerId = appt.member_id
    }

    if (!almonerEmail) {
      // Fallback: anyone with 'almoner' role
      const { data: rr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'almoner')
        .limit(1)
        .maybeSingle()
      if (rr?.user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', rr.user_id)
          .maybeSingle()
        almonerEmail = prof?.email ?? null
        if (almonerEmail) almonerId = rr.user_id
      }
    }

    // ---- Push notifications: one per celebration, tap opens WhatsApp ----
    // Deliberately separate notifications so multiple matches on the same day
    // stay individually shareable rather than squashed into one message.
    let pushSent = 0
    const pushErrors: string[] = []
    if (almonerId && celebrations.length > 0) {
      for (const c of celebrations) {
        try {
          const pr = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
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
            }),
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

    if (!almonerEmail) {
      console.warn('almoner-overdue-check: no almoner appointment or role holder found; flagged=', flagged.length)
      return new Response(
        JSON.stringify({ ok: false, error: 'no_almoner_recipient', flagged: flagged.length, celebrations: celebrations.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }


    // ---- Invoke send-transactional-email ----
    const reportDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    const idempotencyKey = force
      ? `almoner-overdue-${today}-force-${Date.now()}`
      : `almoner-overdue-${today}`


    const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: 'almoner-overdue-digest',
        recipientEmail: almonerEmail,
        idempotencyKey,
        templateData: {
          members: flagged,
          reportDate,
          portalUrl: PORTAL_URL,
        },
      }),
    })
    const sendResult = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      console.error('send-transactional-email failed', resp.status, sendResult)
      return new Response(
        JSON.stringify({ ok: false, error: 'send_failed', detail: sendResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log('almoner-overdue-check: enqueued digest', { recipient: almonerEmail, flagged: flagged.length })
    return new Response(
      JSON.stringify({ ok: true, sent: true, recipient: almonerEmail, flagged: flagged.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('almoner-overdue-check error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
