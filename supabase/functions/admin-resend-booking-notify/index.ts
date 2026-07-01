// One-off admin utility: resend booking notification for a given booking id
// to an overridden recipient. Requires service_role Authorization.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendBookingEmails } from '../_shared/send-booking-emails.ts'

function decodeJwtRole(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const parts = authHeader.slice(7).split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))).role ?? null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const auth = req.headers.get('Authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const isService = decodeJwtRole(auth) === 'service_role' || (bearer && bearer === serviceKey)
  if (!isService) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { bookingId, notifyEmail, stage } = await req.json()
  if (!bookingId || !notifyEmail) {
    return new Response(JSON.stringify({ error: 'bookingId and notifyEmail required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  await sendBookingEmails(bookingId, {
    stage: stage || 'paid',
    overrideNotifyEmail: notifyEmail,
  })
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
