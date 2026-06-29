import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { verifyTurnstile } from '../_shared/verify-turnstile.ts'

const SECRETARY_EMAIL = 'secretary@weybridgelodge.org.uk'

const BodySchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  reason: z.string().trim().min(10, 'Please tell us a little more').max(2000),
  source: z.string().trim().max(40).optional(),
  // Honeypot — must be empty
  website: z.string().max(0).optional().or(z.literal('')),
  turnstileToken: z.string().trim().max(4096).optional(),
})


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  let parsed
  try {
    parsed = BodySchema.safeParse(await req.json())
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (!parsed.success) {
    return json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors }, 400)
  }

  const { full_name, email, phone, reason, source, website, turnstileToken } = parsed.data
  if (website && website.length > 0) {
    // Honeypot tripped — pretend success.
    return json({ success: true }, 200)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ok = await verifyTurnstile(turnstileToken, ip)
  if (!ok) return json({ error: 'Verification failed. Please tick the verification box and try again.' }, 400)

  const supabase = createClient(supabaseUrl, serviceKey)


  const ua = req.headers.get('user-agent') || null

  const { data: row, error: insertErr } = await supabase
    .from('membership_enquiries')
    .insert({
      full_name,
      email: email.toLowerCase(),
      phone: phone || null,
      reason,
      source: source || 'join-us',
      ip_address: ip,
      user_agent: ua,
    })
    .select('id, created_at')
    .single()

  if (insertErr) {
    console.error('Failed to store enquiry', insertErr)
    return json({ error: 'Could not save your enquiry. Please try again or email the secretary directly.' }, 500)
  }

  const submittedAt = new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })

  // 1) Notification to secretary (recipient is hard-coded — no caller override)
  const notifyTo = SECRETARY_EMAIL
  const notifRes = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'enquiry-notification',
      recipientEmail: notifyTo,
      idempotencyKey: `enquiry-notify-${row.id}`,
      replyTo: email || undefined,
      templateData: {
        name: full_name,
        email,
        phone: phone || '',
        reason,
        submittedAt,
        source: source || 'join-us',
      },
    },
  })
  if (notifRes.error) console.error('Notification email failed', notifRes.error)

  // Look up current Lodge Secretary for signature
  let secretaryName = ''
  let secretaryOffice = 'Lodge Secretary'
  try {
    const now = new Date()
    const lodgeYear = now.getUTCMonth() + 1 >= 10 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
    const { data: appts, error: apptErr } = await supabase
      .from('officer_appointments')
      .select('member_id, position_key, lodge_year')
      .eq('position_key', 'secretary')
      .eq('lodge_year', lodgeYear)
      .limit(1)
    if (apptErr) console.error('Secretary appt lookup error', apptErr)
    const memberId = appts?.[0]?.member_id
    if (memberId) {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name, is_past_master')
        .eq('id', memberId)
        .maybeSingle()
      if (profErr) console.error('Secretary profile lookup error', profErr)
      if (prof) {
        const fallback = `${prof.is_past_master ? 'W Bro. ' : 'Bro. '}${[prof.first_name, prof.last_name].filter(Boolean).join(' ')}`.trim()
        secretaryName = (prof.full_name && prof.full_name.trim()) || fallback
      }
      const { data: posRow } = await supabase
        .from('officer_positions')
        .select('label')
        .eq('key', 'secretary')
        .maybeSingle()
      secretaryOffice = `Lodge ${posRow?.label || 'Secretary'}`
    } else {
      console.warn('No secretary appointment found for lodge year', lodgeYear)
    }
  } catch (e) {
    console.error('Secretary lookup failed', e)
  }
  console.log('Secretary signature:', { secretaryName, secretaryOffice })

  // 2) Confirmation to the enquirer
  const confRes = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'enquiry-confirmation',
      recipientEmail: email,
      idempotencyKey: `enquiry-confirm-${row.id}`,
      templateData: {
        name: full_name.split(' ')[0] || full_name,
        secretaryName,
        secretaryOffice,
      },
    },
  })
  if (confRes.error) console.error('Confirmation email failed', confRes.error)

  return json({ success: true, id: row.id }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
