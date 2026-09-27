import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { verifyTurnstile } from '../_shared/verify-turnstile.ts'
import { sendTransactionalEmail } from '../_shared/send-email.ts'

const SECRETARY_EMAIL = 'secretary@weybridgelodge.org.uk'
const MEMBERSHIP_CC_EMAIL = 'membershipsecretary@weybridgelodge.org.uk'
const GUIDE_URL = 'https://weybridgelodge.org.uk/downloads/information-for-prospective-members.pdf?v=2'

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
  const notifRes = await sendTransactionalEmail({
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
  })
  if (notifRes.error) console.error('Notification email failed', notifRes.error)

  // Look up who signs the enquirer's confirmation (Secretary) and who is
  // named in the body as the caller (Membership Officer)
  const now = new Date()
  const lodgeYear = now.getUTCMonth() + 1 >= 10 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  const secretary = await lookupOfficer(supabase, 'secretary', lodgeYear, 'Lodge Secretary')
  const membershipOfficer = await lookupOfficer(supabase, 'membership_officer', lodgeYear, 'Membership Officer')
  console.log('Confirmation sign-off:', secretary, '| Body caller:', membershipOfficer)

  // 2) Confirmation to the enquirer
  const confData = {
    name: full_name.split(' ')[0] || full_name,
    secretaryName: secretary.name,
    secretaryOffice: secretary.office,
    membershipOfficerName: membershipOfficer.name,
    guideUrl: GUIDE_URL,
  }
  const confRes = await sendTransactionalEmail({
      templateName: 'enquiry-confirmation',
      recipientEmail: email,
      idempotencyKey: `enquiry-confirm-${row.id}`,
      templateData: confData,
  })
  if (confRes.error) console.error('Confirmation email failed', confRes.error)

  // 3) Identical copy to the Membership Officer (email service has no CC field)
  const ccRes = await sendTransactionalEmail({
      templateName: 'enquiry-confirmation',
      recipientEmail: MEMBERSHIP_CC_EMAIL,
      idempotencyKey: `enquiry-confirm-cc-${row.id}`,
      replyTo: email || undefined,
      templateData: confData,
  })
  if (ccRes.error) console.error('Membership officer copy failed', ccRes.error)

  return json({ success: true, id: row.id }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function lookupOfficer(
  supabase: ReturnType<typeof createClient>,
  positionKey: string,
  lodgeYear: number,
  fallbackLabel: string,
): Promise<{ name: string; office: string }> {
  let name = ''
  let office = fallbackLabel
  try {
    const { data: appts, error } = await supabase
      .from('officer_appointments')
      .select('member_id')
      .eq('position_key', positionKey)
      .eq('lodge_year', lodgeYear)
      .limit(1)
    if (error) console.error(`${positionKey} appt lookup error`, error)
    const memberId = (appts as any)?.[0]?.member_id
    if (!memberId) {
      console.warn(`No ${positionKey} appointment for lodge year`, lodgeYear)
      return { name, office }
    }
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name, is_past_master')
      .eq('id', memberId)
      .maybeSingle()
    if (prof) {
      const p = prof as any
      const fallback = `${p.is_past_master ? 'W Bro. ' : 'Bro. '}${[p.first_name, p.last_name].filter(Boolean).join(' ')}`.trim()
      name = (p.full_name && p.full_name.trim()) || fallback
    }
    const { data: pos } = await supabase
      .from('officer_positions')
      .select('label')
      .eq('key', positionKey)
      .maybeSingle()
    if ((pos as any)?.label) office = (pos as any).label
  } catch (e) {
    console.error(`${positionKey} lookup failed`, e)
  }
  return { name, office }
}
