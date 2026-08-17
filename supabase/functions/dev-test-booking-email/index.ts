// Temporary admin-only helper: re-send a booking confirmation to a test address
// without touching the real booker's record or sending duplicates/notifications.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendBookingEmails } from '../_shared/send-booking-emails.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${service}`) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
  const { bookingId, testEmail } = await req.json()
  await sendBookingEmails(bookingId, {
    stage: 'submitted',
    overrideBookerEmail: testEmail,
    skipNotify: true,
  })
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
