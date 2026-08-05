// TEMPORARY one-off backfill: re-sends ONLY the internal notification emails
// for bookings/enquiries whose notifications were lost while function-to-function
// invoke() was broken. Never sends booker/enquirer-facing confirmations.
// Service-role callers only. Safe to delete after use.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendBookingEmails } from '../_shared/send-booking-emails.ts'
import { sendTransactionalEmail } from '../_shared/send-email.ts'

const SECRETARY_EMAIL = 'secretary@weybridgelodge.org.uk'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const oneOff = Deno.env.get('BACKFILL_ONEOFF_TOKEN') || ''
  let allowed = (bearer.length > 0 && bearer === serviceKey) ||
    (oneOff.length > 0 && req.headers.get('x-backfill-token') === oneOff)
  if (!allowed && bearer) {
    // Allow a signed-in admin to run the backfill from the portal/tooling.
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: userData } = await admin.auth.getUser(bearer)
    const uid = userData?.user?.id
    if (uid) {
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: uid, _role: 'admin' })
      allowed = isAdmin === true
    }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const bookingIds: string[] = Array.isArray(body.bookingIds) ? body.bookingIds : []
  const enquiryIds: string[] = Array.isArray(body.enquiryIds) ? body.enquiryIds : []

  const results: Record<string, unknown>[] = []

  for (const id of bookingIds) {
    try {
      await sendBookingEmails(id, { stage: 'backfill', notifyOnly: true })
      results.push({ type: 'booking', id, ok: true })
    } catch (e) {
      results.push({ type: 'booking', id, ok: false, error: String(e) })
    }
  }

  if (enquiryIds.length) {
    const supabase = createClient(supabaseUrl, serviceKey)
    for (const id of enquiryIds) {
      const { data: row } = await supabase
        .from('membership_enquiries')
        .select('id, full_name, email, phone, reason, source, created_at')
        .eq('id', id)
        .maybeSingle()
      if (!row) { results.push({ type: 'enquiry', id, ok: false, error: 'not found' }); continue }
      const r: any = row
      const res = await sendTransactionalEmail({
        templateName: 'enquiry-notification',
        recipientEmail: SECRETARY_EMAIL,
        idempotencyKey: `enquiry-notify-${r.id}-backfill`,
        replyTo: r.email || undefined,
        templateData: {
          name: r.full_name,
          email: r.email,
          phone: r.phone || '',
          reason: r.reason,
          submittedAt: new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' }),
          source: r.source || 'join-us',
        },
      })
      results.push({ type: 'enquiry', id, ok: res.ok, recipient: SECRETARY_EMAIL, error: res.error })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
