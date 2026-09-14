// Daily scheduled edge function: finds draft secretary returns that are
// overdue or falling due within 14 days and emails a digest to whoever
// currently holds the Secretary office.
//
// Follows exactly the same pattern as almoner-overdue-check: hourly UTC cron,
// DST-safe 06:00 Europe/London guard, silent when there is nothing to report,
// recipient resolved from officer_appointments (falling back to the
// 'secretary' role), and the shared branded email template pipeline.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTransactionalEmail } from '../_shared/send-email.ts'

const SITE_URL = 'https://weybridgelodge.org.uk'
const PORTAL_URL = `${SITE_URL}/members/admin/returns`

const TYPE_LABELS: Record<string, string> = {
  form_p: 'Form P',
  lp_a5_certificate: 'LP&A5 certificate application',
  candidate_letter: 'Candidate letter',
  clearance_letter: 'Clearance letter',
  change_of_status: 'Change of status',
  installation_return: 'Installation Return',
  provincial_return: 'Provincial Return',
  other: 'Other',
}

// Europe/London wall-clock date (YYYY-MM-DD), DST-safe.
const londonToday = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const yearLabel = (y: number | null): string =>
  typeof y === 'number' ? `${y}/${y + 1}` : '—'

const personName = (m: any, c: any): string => {
  const from = (p: any) => {
    if (!p) return ''
    const first = (p.preferred_name?.trim() || p.first_name?.trim() || '').trim()
    const last = (p.last_name?.trim() || '').trim()
    const composed = [first, last].filter(Boolean).join(' ').trim()
    return composed || (p.full_name?.trim() || '')
  }
  return from(m) || from(c) || ''
}

const DEFAULT_LEAD_DAYS = 14
// Widest window we ever need to pull from the database; per-row lead times are
// applied in code afterwards.
const MAX_LEAD_DAYS = 3650

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Cron fires hourly in UTC; this guard keeps the send at 06:00 UK local
  // year-round. `?force=1` lets ops re-trigger a missed run manually.
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
    return new Response(JSON.stringify({ ok: true, skipped: true, londonHour }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const today = londonToday()
    const horizon = addDays(today, MAX_LEAD_DAYS)

    const { data: rows, error } = await supabase
      .from('secretary_returns')
      .select(
        'id,return_type,masonic_year,date_due,member_id,candidate_id,reminder_lead_days,' +
          'member:profiles!secretary_returns_member_id_fkey(full_name,preferred_name,first_name,last_name),' +
          'candidate:candidates!secretary_returns_candidate_id_fkey(first_name,last_name)',
      )
      .eq('status', 'draft')
      .not('date_due', 'is', null)
      .lte('date_due', horizon)
      .order('date_due', { ascending: true })
    if (error) throw error

    // Per-row lead time: a row is in scope when its due date falls within its
    // own reminder_lead_days (default 14) of today, or is already overdue.
    const all = (rows ?? []).filter((r: any) => {
      const lead =
        typeof r.reminder_lead_days === 'number' && r.reminder_lead_days >= 0
          ? r.reminder_lead_days
          : DEFAULT_LEAD_DAYS
      return r.date_due <= addDays(today, lead)
    }) as any[]
    const daysBetween = (from: string, to: string) =>
      Math.round(
        (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000,
      )
    // Lodge-level returns are not tied to a candidate or member.
    const LODGE_LEVEL = new Set(['installation_return', 'provincial_return'])
    const shape = (r: any) => ({
      typeLabel: TYPE_LABELS[r.return_type] ?? r.return_type,
      masonicYear: yearLabel(r.masonic_year),
      dateDue: r.date_due,
      daysUntil: daysBetween(today, r.date_due),
      showPerson: !LODGE_LEVEL.has(r.return_type),
      person: personName(r.member, r.candidate),
      personLabel: r.member_id ? 'Member' : 'Candidate',
    })
    const overdue = all.filter((r) => r.date_due < today).map(shape)
    const dueSoon = all.filter((r) => r.date_due >= today).map(shape)

    if (overdue.length === 0 && dueSoon.length === 0) {
      console.log('secretary-returns-reminder: nothing outstanding')
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: 'nothing_outstanding' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Resolve the current Secretary ----
    const lodgeYear =
      new Date().getMonth() + 1 >= 10 ? new Date().getFullYear() : new Date().getFullYear() - 1

    let secretaryEmail: string | null = null
    const { data: appt } = await supabase
      .from('officer_appointments')
      .select('member_id')
      .eq('position_key', 'secretary')
      .eq('lodge_year', lodgeYear)
      .limit(1)
      .maybeSingle()

    if (appt?.member_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', appt.member_id)
        .maybeSingle()
      secretaryEmail = prof?.email ?? null
    }

    if (!secretaryEmail) {
      const { data: rr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'secretary')
        .limit(1)
        .maybeSingle()
      if (rr?.user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', rr.user_id)
          .maybeSingle()
        secretaryEmail = prof?.email ?? null
      }
    }

    if (!secretaryEmail) {
      console.warn('secretary-returns-reminder: no secretary recipient found')
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'no_secretary_recipient',
          overdue: overdue.length,
          due_soon: dueSoon.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const reportDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const idempotencyKey = force
      ? `secretary-returns-${today}-force-${Date.now()}`
      : `secretary-returns-${today}-o${overdue.length}-s${dueSoon.length}`

    const resp = await sendTransactionalEmail({
      templateName: 'secretary-returns-digest',
      recipientEmail: secretaryEmail,
      idempotencyKey,
      templateData: { overdue, dueSoon, reportDate, portalUrl: PORTAL_URL },
    })
    if (!resp.ok) {
      console.error('secretary returns digest send failed', resp.status, resp.error)
      return new Response(JSON.stringify({ ok: false, error: 'send_failed', detail: resp.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('secretary-returns-reminder: sent', {
      recipient: secretaryEmail,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
    })
    return new Response(
      JSON.stringify({
        ok: true,
        sent: true,
        recipient: secretaryEmail,
        overdue: overdue.length,
        due_soon: dueSoon.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('secretary-returns-reminder error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
