// Monthly scheduled edge function: emails the current Secretary a list of
// active initiated members whose Grand Lodge Reference Number is still blank.
//
// Same pattern as almoner-overdue-check: hourly UTC cron, DST-safe
// Europe/London guard (07:00 on the 1st), silent when nothing to report,
// recipient = current_officer_holder('secretary') with a 'secretary' role
// fallback, shared branded template pipeline.
//
// PII: ugle_reg_number is read server-side with the service role only and is
// used solely for the blank check. It never appears in the email or logs.
//
// Manual runs: ?force=1 bypasses the date/time guard and sends now;
// ?dry_run=1 returns the count and recipient without sending.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTransactionalEmail } from '../_shared/send-email.ts'
import { isSendWindow } from './logic.ts'
import { loadLodgeSettingsStrict } from "../_shared/lodgeSettings.ts";
import { forEachUnit, listActiveUnits } from "../_shared/units.ts";
import { runUnit } from "./run.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const londonToday = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const dryRun = url.searchParams.get('dry_run') === '1'
  if (force || dryRun) {
    const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!(!!expected && token === expected)) return json({ error: 'Unauthorized' }, 401)
  }
  if (!force && !dryRun && !isSendWindow(new Date())) {
    return json({ ok: true, skipped: true })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  try {
    const today = londonToday()
    const units = await listActiveUnits(supabase)
    const outcomes = await forEachUnit(units, async (unitId) => {
      const lodge = await loadLodgeSettingsStrict(unitId)
      const r = await runUnit({ db: supabase, send: sendTransactionalEmail as any }, unitId, lodge, { force, dryRun, today })
      // Public endpoint on dry runs: counts only, no names, emails or numbers.
      return dryRun ? { ...r, recipient: undefined } : r
    }, 'secretary-ugle-reminder')
    return json({ ok: true, dry_run: dryRun || undefined, units: outcomes })
  } catch (err) {
    console.error('secretary-ugle-reminder error', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
