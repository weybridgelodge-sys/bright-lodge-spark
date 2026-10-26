// Daily-scheduled sweep: for any meeting whose date has passed (or is marked
// completed), refund every still-waitlisted booking that captured payment,
// mark it as waitlisted_refunded, and email the booker.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createStripeClient, type StripeEnv } from '../_shared/stripe.ts'
import { sendTransactionalEmail } from '../_shared/send-email.ts'
import { loadLodgeSettingsStrict } from "../_shared/lodgeSettings.ts";
import { forEachUnit, listActiveUnits, recordUnit } from "../_shared/units.ts";
import { loadCallerUnit, noCallerUnitMessage, CROSS_UNIT_MESSAGE } from "../_shared/callerUnit.ts";
import { runUnit } from "./run.ts";

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

  // Optional manual trigger: { meeting_id } refunds a single meeting immediately,
  // bypassing the date-passed filter. Used by the Secretary "Close waitlist & refund now" action.
  let manualMeetingId: string | null = null
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (body && typeof body.meeting_id === 'string') manualMeetingId = body.meeting_id
    } catch { /* no body */ }
  }

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  let manualUnits: string[] | null = null
  if (manualMeetingId) {
    // Require authenticated Secretary/WM/Admin for on-demand refunds.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: userData, error: uErr } = await supabase.auth.getUser(token)
    if (uErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const uid = userData.user.id
    const { data: roles } = await supabase
      .from('user_roles').select('role').eq('user_id', uid)
    const allowed = (roles ?? []).some((r: any) =>
      ['admin', 'secretary', 'worshipful_master'].includes(r.role))
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Manual run acts on one meeting: only the caller's own lodge, and only that meeting's lodge.
    const callerUnit = await loadCallerUnit(supabase, uid)
    if (!callerUnit) return json({ error: noCallerUnitMessage('refund a waitlist') }, 403)
    const { data: mt } = await supabase.from('festive_board_meetings').select('unit_id').eq('id', manualMeetingId).maybeSingle()
    if (!mt) return json({ ok: true, units: [] })
    const mu = recordUnit(mt.unit_id)
    if (!mu) return json({ ok: true, units: [], skipped_no_unit: 1 })
    if (mu !== callerUnit) return json({ error: CROSS_UNIT_MESSAGE }, 403)
    manualUnits = [mu]
  }


  try {
    const today = new Date().toISOString().slice(0, 10)
    const units = manualUnits ?? await listActiveUnits(supabase)
    const refund = async (env: string, pi: string) => {
      const stripe = createStripeClient(env as StripeEnv)
      return await stripe.refunds.create({ payment_intent: pi })
    }
    const outcomes = await forEachUnit(units, async (unitId) => {
      const lodge = await loadLodgeSettingsStrict(unitId)
      return runUnit({ db: supabase, send: sendTransactionalEmail as any, refund }, unitId, lodge, { manualMeetingId, today })
    }, 'waitlist-refund-sweep')
    const refunded = outcomes.reduce((n, o) => n + (o.ok ? o.result.refunded : 0), 0)
    return json({ ok: true, refunded, units: outcomes })
  } catch (e) {
    console.error('waitlist-refund-sweep error', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
