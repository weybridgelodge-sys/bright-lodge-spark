// Daily scheduled edge function: finds draft secretary returns that are
// overdue or falling due within 14 days and emails a digest to whoever
// currently holds the Secretary office.
//
// Follows exactly the same pattern as almoner-overdue-check: hourly UTC cron,
// DST-safe 06:00 Europe/London guard, silent when there is nothing to report,
// recipient resolved from officer_appointments (falling back to the
// 'secretary' role), and the shared branded email template pipeline.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTransactionalEmail } from '../_shared/send-email.ts'
import { loadLodgeSettingsStrict } from "../_shared/lodgeSettings.ts";
import { forEachUnit, listActiveUnits } from "../_shared/units.ts";
import { runUnit } from "./run.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Europe/London wall-clock date (YYYY-MM-DD), DST-safe.
const londonToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Cron fires hourly in UTC; this guard keeps the send at 06:00 UK local
  // year-round. `?force=1` lets ops re-trigger a missed run manually.
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date()),
    10,
  )
  if (!force && londonHour !== 6) return json({ ok: true, skipped: true, londonHour })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  try {
    const today = londonToday()
    const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const units = await listActiveUnits(supabase)
    const singleUnit = units.length === 1
    const outcomes = await forEachUnit(units, async (unitId) => {
      const lodge = await loadLodgeSettingsStrict(unitId)
      return runUnit({ db: supabase, send: sendTransactionalEmail as any }, unitId, lodge, { force, today, reportDate, singleUnit })
    }, 'secretary-returns-reminder')
    return json({ ok: true, units: outcomes })
  } catch (err) {
    console.error('secretary-returns-reminder error', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
