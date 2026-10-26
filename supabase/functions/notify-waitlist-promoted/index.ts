// Sweeps bookings that were promoted from the waitlist but haven't yet had a
// notification sent. Sends the waitlist-promoted email and stamps
// promotion_notified_at. Invoked from the admin "promote now" client action
// and by a scheduled cron every 15 minutes as a backstop for
// trigger-driven promotions (Secretary marks a booking as apologies).
// Runs once per lodge (JOB CI); a booking's own unit_id decides its lodge.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTransactionalEmail } from '../_shared/send-email.ts'
import { loadLodgeSettingsStrict } from "../_shared/lodgeSettings.ts";
import { forEachUnit, listActiveUnits, recordUnit } from "../_shared/units.ts";
import { runUnit } from "./run.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let targetId: string | null = null
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (typeof body?.booking_id === 'string') targetId = body.booking_id
    }
  } catch { /* ignore */ }

  try {
    let units: string[]
    if (targetId) {
      const { data: b } = await supabase.from('bookings').select('unit_id').eq('id', targetId).maybeSingle()
      const u = recordUnit(b?.unit_id)
      if (!b) return json({ ok: true, processed: 0, sent: 0, units: [] })
      if (!u) return json({ ok: true, processed: 0, sent: 0, units: [], skipped_no_unit: 1 })
      units = [u]
    } else {
      units = await listActiveUnits(supabase)
    }
    const outcomes = await forEachUnit(units, async (unitId) => {
      const lodge = await loadLodgeSettingsStrict(unitId)
      return runUnit({ db: supabase, send: sendTransactionalEmail as any }, unitId, lodge, targetId)
    }, 'notify-waitlist-promoted')
    // Pending notices with no lodge are never sent under a guessed lodge.
    const { count: skippedNoUnit } = targetId ? { count: 0 } : await supabase.from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('promoted_from_waitlist', true).eq('payment_status', 'confirmed').is('promotion_notified_at', null).eq('unit_id', '')
    const processed = outcomes.reduce((n, o) => n + (o.ok ? o.result.processed : 0), 0)
    const sent = outcomes.reduce((n, o) => n + (o.ok ? o.result.sent : 0), 0)
    return json({ ok: true, processed, sent, skipped_no_unit: skippedNoUnit ?? 0, units: outcomes })
  } catch (e) {
    console.error('notify-waitlist-promoted error', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
