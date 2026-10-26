// Daily scheduled edge function: computes overdue Almoner follow-ups and
// absence flags and creates system Welfare Log entries EVERY day, but emails
// the summary to the current Almoner only on DIGEST_WEEKDAY (Monday). Runs
// once per lodge (JOB CI); the per-lodge logic lives in run.ts.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTransactionalEmail } from '../_shared/send-email.ts'
import { loadLodgeSettingsStrict } from "../_shared/lodgeSettings.ts";
import { forEachUnit, listActiveUnits } from "../_shared/units.ts";
import { runUnit } from "./run.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Only proceed at 06:00 Europe/London; ?force=1 / ?dry_run=1 need the service key.
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === '1'
  const force = url.searchParams.get('force') === '1' || dryRun
  if (force) {
    const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!(!!expected && token === expected)) return json({ error: 'Unauthorized' }, 401)
  }
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date()),
    10,
  )
  if (!force && londonHour !== 6) return json({ ok: true, skipped: true, londonHour })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)
  const push = (body: Record<string, unknown>) =>
    fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(body),
    })
  const testDate = url.searchParams.get('test_date')

  try {
    const units = await listActiveUnits(supabase)
    const singleUnit = units.length === 1
    const outcomes = await forEachUnit(units, async (unitId) => {
      const lodge = await loadLodgeSettingsStrict(unitId)
      return runUnit({ db: supabase, send: sendTransactionalEmail as any, push }, unitId, lodge, { dryRun, force, testDate, singleUnit })
    }, 'almoner-overdue-check')
    return json({ ok: true, dry_run: dryRun || undefined, units: outcomes })
  } catch (err) {
    console.error('almoner-overdue-check error', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
