// Monthly scheduled edge function: emails the current Secretary a list of
// active initiated members whose Grand Lodge Reference Number is still blank.
//
// Same pattern as almoner-overdue-check: hourly UTC cron, DST-safe
// Europe/London guard (07:00 on the 1st), silent when nothing to report,
// recipient = current_officer_holder('secretary') with a 'secretary' role
// fallback, shared branded template pipeline.
//
// PII: ugle_reg_number is read server-side with the service role only and is
// used solely for the blank check. It never appears in the email or logs.
//
// Manual runs: ?force=1 bypasses the date/time guard and sends now;
// ?dry_run=1 returns the count and recipient without sending.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTransactionalEmail } from '../_shared/send-email.ts'
import { findMissing, idempotencyKey, isSendWindow } from './logic.ts'

const SITE_URL = 'https://weybridgelodge.org.uk'
const ADMIN_URL = `${SITE_URL}/members/admin`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const londonToday = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const dryRun = url.searchParams.get('dry_run') === '1'
  if (force || dryRun) {
    const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const ok = !!expected && token === expected
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }
  if (!force && !dryRun && !isSendWindow(new Date())) {
    return json({ ok: true, skipped: true })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const { data: rows, error } = await supabase
      .from('profiles')
      .select('id,full_name,preferred_name,first_name,last_name,title,status,initiation_date,ugle_reg_number')
      .eq('status', 'active')
      .not('initiation_date', 'is', null)
    if (error) throw error

    const missing = findMissing((rows ?? []) as any[])
    if (missing.length === 0) {
      console.log('secretary-ugle-reminder: nothing outstanding')
      return json({ ok: true, sent: false, reason: 'nothing_outstanding' })
    }

    // ---- Resolve the current Secretary (same as the Almoner digest) ----
    let secretaryEmail: string | null = null
    const { data: holder } = await supabase.rpc('current_officer_holder', { _position_key: 'secretary' })
    if (holder) {
      const { data: prof } = await supabase.from('profiles').select('email').eq('id', holder as string).maybeSingle()
      secretaryEmail = prof?.email ?? null
    }
    if (!secretaryEmail) {
      const { data: rr } = await supabase
        .from('user_roles').select('user_id').eq('role', 'secretary').limit(1).maybeSingle()
      if (rr?.user_id) {
        const { data: prof } = await supabase.from('profiles').select('email').eq('id', rr.user_id).maybeSingle()
        secretaryEmail = prof?.email ?? null
      }
    }
    if (!secretaryEmail) {
      console.warn('secretary-ugle-reminder: no secretary recipient found; missing=', missing.length)
      return json({ ok: false, error: 'no_secretary_recipient', missing: missing.length })
    }

    if (dryRun) {
      return json({
        ok: true,
        dry_run: true,
        // Public endpoint: counts only, no names, emails or numbers.
        recipient_found: true,
        missing: missing.length,
      })
    }

    const today = londonToday()
    const key = force ? `secretary-ugle-${today}-force-${Date.now()}` : idempotencyKey(today, missing)
    const resp = await sendTransactionalEmail({
      templateName: 'secretary-ugle-missing',
      recipientEmail: secretaryEmail,
      idempotencyKey: key,
      templateData: {
        members: missing.map((m) => ({
          name: m.name,
          initiationLabel: m.initiationLabel,
          url: `${ADMIN_URL}#member-${m.id}`,
        })),
        adminUrl: ADMIN_URL,
      },
    })
    if (!resp.ok) {
      console.error('secretary-ugle-reminder send failed', resp.status, resp.error)
      return json({ ok: false, error: 'send_failed', detail: resp.error }, 500)
    }
    console.log('secretary-ugle-reminder: sent', { recipient: secretaryEmail, missing: missing.length })
    return json({ ok: true, sent: true, recipient: secretaryEmail, missing: missing.length })
  } catch (err) {
    console.error('secretary-ugle-reminder error', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
