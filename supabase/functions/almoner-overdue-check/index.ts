// Daily scheduled edge function: computes overdue Almoner follow-ups and
// members who missed their last two meetings, then emails a digest to the
// current Almoner via send-transactional-email.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

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
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10,
  )
  if (londonHour !== 6) {
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

    // ---- Run independent reads in parallel ----
    // 1) active members, 2) open welfare logs, 3) last two past meetings.
    const [membersRes, logsRes, meetingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,full_name,preferred_name,first_name,last_name,title,status')
        .eq('status', 'active'),
      supabase
        .from('welfare_log_entries')
        .select('member_id,contact_date,follow_up_date')
        .is('deleted_at', null)
        .order('contact_date', { ascending: false }),
      supabase
        .from('festive_board_meetings')
        .select('id,meeting_date')
        .lte('meeting_date', today)
        .order('meeting_date', { ascending: false })
        .limit(2),
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

    // ---- Missed last 2 meetings ----
    const meetingIds = ((meetingsRes.data as any[]) ?? []).map((m) => m.id)
    const absentFlags: Record<string, boolean> = {}
    if (meetingIds.length >= 2) {
      const { data: att } = await supabase
        .from('festive_board_attendance')
        .select('member_id,meeting_id,attendance_status')
        .in('meeting_id', meetingIds)
      const present = new Map<string, Set<string>>()
      for (const a of ((att as any[]) ?? [])) {
        // Count both "booked" and "attended" as present (mirrors headcount logic).
        if ((a.attendance_status === 'attended' || a.attendance_status === 'booked') && a.member_id) {
          if (!present.has(a.member_id)) present.set(a.member_id, new Set())
          present.get(a.member_id)!.add(a.meeting_id)
        }
      }
      for (const m of members as any[]) {
        const s = present.get(m.id) ?? new Set()
        if (!s.has(meetingIds[0]) && !s.has(meetingIds[1])) absentFlags[m.id] = true
      }
    }

    // ---- Build flagged list ----
    const flaggedIds = new Set<string>([...Object.keys(overdue), ...Object.keys(absentFlags)])
    const flagged = Array.from(flaggedIds)
      .map((id) => {
        const m = memberById.get(id)
        if (!m) return null
        return {
          name: displayName(m),
          overdueFollowUp: overdue[id] ?? null,
          missedMeetings: !!absentFlags[id],
          portalUrl: PORTAL_URL,
        }
      })
      .filter(Boolean) as Array<{ name: string; overdueFollowUp: string | null; missedMeetings: boolean; portalUrl: string }>

    if (flagged.length === 0) {
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

    // ---- Resolve Almoner email ----
    const lodgeYear =
      new Date().getMonth() + 1 >= 10 ? new Date().getFullYear() : new Date().getFullYear() - 1

    let almonerEmail: string | null = null
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
      }
    }

    if (!almonerEmail) {
      console.warn('almoner-overdue-check: no almoner appointment or role holder found; flagged=', flagged.length)
      return new Response(
        JSON.stringify({ ok: false, error: 'no_almoner_recipient', flagged: flagged.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Invoke send-transactional-email ----
    const reportDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    const idempotencyKey = `almoner-overdue-${today}`

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
