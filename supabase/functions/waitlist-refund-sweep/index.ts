// Daily-scheduled sweep: for any meeting whose date has passed (or is marked
// completed), refund every still-waitlisted booking that captured payment,
// mark it as waitlisted_refunded, and email the booker.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createStripeClient, type StripeEnv } from '../_shared/stripe.ts'

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

  // Meetings that have passed or are marked completed
  const today = new Date().toISOString().slice(0, 10)
  const { data: meetings, error: mErr } = await supabase
    .from('festive_board_meetings')
    .select('id, meeting_date, status, event_key')
    .or(`status.eq.completed,meeting_date.lt.${today}`)
  if (mErr) {
    return new Response(JSON.stringify({ error: mErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const meetingIds = (meetings ?? []).map((m: any) => m.id)
  if (meetingIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, refunded: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: waitlisted } = await supabase
    .from('bookings')
    .select('id, contact_name, contact_email, event_label, meeting_id, total_pence, stripe_payment_intent_id, environment, waitlist_refunded_at')
    .in('meeting_id', meetingIds)
    .eq('payment_status', 'waitlisted')

  let refunded = 0
  const failures: any[] = []
  for (const b of waitlisted ?? []) {
    if (b.waitlist_refunded_at) continue
    if (!b.stripe_payment_intent_id) {
      // Nothing paid — just mark as refunded/no-op and move on
      await supabase.from('bookings').update({
        payment_status: 'waitlisted_refunded',
        waitlist_refunded_at: new Date().toISOString(),
      }).eq('id', b.id)
      continue
    }
    try {
      const stripe = createStripeClient(b.environment as StripeEnv)
      const refund = await stripe.refunds.create({ payment_intent: b.stripe_payment_intent_id })
      await supabase.from('bookings').update({
        payment_status: 'waitlisted_refunded',
        waitlist_refunded_at: new Date().toISOString(),
        stripe_refund_id: refund.id,
      }).eq('id', b.id)

      // Send apology + refund confirmation
      const firstName = (b.contact_name || '').trim().split(/\s+/)[0] || undefined
      const totalAmount = b.total_pence
        ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(b.total_pence / 100)
        : undefined
      const meetingRow = (meetings ?? []).find((m: any) => m.id === b.meeting_id)
      const eventDate = meetingRow?.meeting_date
        ? new Date(meetingRow.meeting_date).toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
          })
        : ''
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'waitlist-refunded',
          recipientEmail: b.contact_email,
          idempotencyKey: `waitlist-refund-${b.id}`,
          templateData: {
            firstName, eventLabel: b.event_label, eventDate, totalAmount,
            bookingRef: b.id.slice(0, 8),
          },
        },
      })
      refunded++
    } catch (e) {
      console.error('refund failed', b.id, e)
      failures.push({ id: b.id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return new Response(JSON.stringify({ ok: true, refunded, failures }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
