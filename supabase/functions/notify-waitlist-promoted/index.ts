// Sweeps bookings that were promoted from the waitlist but haven't yet had a
// notification sent. Sends the waitlist-promoted email and stamps
// promotion_notified_at. Invoked from the admin "promote now" client action
// and by a scheduled cron every 15 minutes as a backstop for
// trigger-driven promotions (Secretary marks a booking as apologies).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let targetId: string | null = null
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (typeof body?.booking_id === 'string') targetId = body.booking_id
    }
  } catch { /* ignore */ }

  const query = supabase
    .from('bookings')
    .select('id, contact_name, contact_email, event_label, event_key, meeting_id, details')
    .eq('promoted_from_waitlist', true)
    .eq('payment_status', 'confirmed')
    .is('promotion_notified_at', null)
    .limit(50)
  if (targetId) query.eq('id', targetId)

  const { data: rows, error } = await query
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const bookings = rows ?? []

  let sent = 0
  for (const b of bookings) {
    // Fetch event date for nicer email
    let eventDate = ''
    try {
      if (b.meeting_id) {
        const { data: m } = await supabase
          .from('festive_board_meetings').select('meeting_date').eq('id', b.meeting_id).maybeSingle()
        if (m?.meeting_date) {
          eventDate = new Date(m.meeting_date).toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
          })
        }
      }
    } catch { /* ignore */ }

    const firstName = (b.contact_name || '').trim().split(/\s+/)[0] || undefined
    try {
      const res = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'waitlist-promoted',
          recipientEmail: b.contact_email,
          idempotencyKey: `waitlist-promoted-${b.id}`,
          templateData: {
            firstName,
            eventLabel: b.event_label,
            eventDate,
            bookingRef: b.id.slice(0, 8),
          },
        },
      })
      if (res.error) { console.error('promoted email failed', b.id, res.error); continue }
      await supabase.from('bookings')
        .update({ promotion_notified_at: new Date().toISOString() })
        .eq('id', b.id)
      sent++
    } catch (e) {
      console.error('promoted email exception', b.id, e)
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: bookings.length, sent }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
