// One-off admin utility (auth relaxed for a single manual resend).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendBookingEmails } from '../_shared/send-booking-emails.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
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
