import { createClient } from 'npm:@supabase/supabase-js@2'

// Core application tables in the public schema (no auth/storage internals).
const TABLES = [
  'almoner_reports', 'bookings', 'candidates', 'charity_annual_reports', 'charity_collections',
  'charity_donations', 'charity_festival_settings', 'charity_ledger', 'charity_periodic_reports',
  'charity_public_feed_metrics', 'dues_payments', 'dues_settings', 'dues_subscriptions',
  'email_unsubscribe_tokens', 'festive_board_attendance', 'festive_board_meetings',
  'lodge_development_reports', 'lodge_documents', 'lodge_event_courses', 'lodge_event_dining_options',
  'lodge_events', 'lodge_socials', 'lodge_template', 'lodge_visits', 'loi_attendance',
  'loi_part_assignments', 'loi_sessions', 'member_calendar_tokens', 'member_checklist_items',
  'member_development_records', 'member_engagement_log', 'member_external_appointments',
  'member_newsletter_opt_outs', 'member_notices', 'member_preceptor_notes', 'member_progression_status',
  'member_ritual_records', 'member_wm_terms', 'membership_enquiries', 'module_settings',
  'newsletter_broadcasts', 'newsletter_subscribers', 'officer_appointments', 'officer_positions',
  'poll_votes', 'polls', 'profiles', 'push_device_tokens', 'regular_meeting_reminders_sent',
  'ritual_documents', 'succession_risks', 'summons_email_log', 'summonses', 'suppressed_emails',
  'treasurer_periods', 'treasurer_transactions', 'user_roles', 'venues', 'visitor_attendances',
  'visitor_contacts', 'welfare_absences', 'welfare_correspondence', 'welfare_life_events',
  'welfare_log_entries', 'welfare_member_status', 'welfare_rmtgb_referrals',
  'working_group_activities', 'working_group_members', 'working_groups',
]

const BUCKET = 'db-backups'
const KEEP = 8
const PAGE = 1000

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }
  const claims = parseJwtClaims(authHeader.slice('Bearer '.length).trim())
  if (claims?.role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const startedAt = Date.now()
  const date = new Date().toISOString().slice(0, 10)
  const fileName = `backup-${date}.json`

  try {
    const snapshot: Record<string, unknown[]> = {}
    let rowCount = 0

    for (const table of TABLES) {
      const rows: unknown[] = []
      let from = 0
      // Page through so large tables don't hit the default row cap.
      for (;;) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
        if (error) throw new Error(`${table}: ${error.message}`)
        rows.push(...(data ?? []))
        if (!data || data.length < PAGE) break
        from += PAGE
      }
      snapshot[table] = rows
      rowCount += rows.length
    }

    const body = JSON.stringify({
      generated_at: new Date().toISOString(),
      schema: 'public',
      table_count: TABLES.length,
      row_count: rowCount,
      tables: snapshot,
    })
    const bytes = new TextEncoder().encode(body)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, bytes, { contentType: 'application/json', upsert: true })
    if (uploadError) throw new Error(`upload: ${uploadError.message}`)

    // Retention: keep only the newest KEEP snapshots.
    const deleted: string[] = []
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
    if (listError) {
      console.error('Failed to list backups for retention', listError)
    } else {
      const snapshots = (files ?? [])
        .filter((f) => f.name.startsWith('backup-') && f.name.endsWith('.json'))
        .map((f) => f.name)
        .sort()
        .reverse()
      const stale = snapshots.slice(KEEP)
      if (stale.length) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(stale)
        if (removeError) console.error('Failed to remove stale backups', removeError)
        else deleted.push(...stale)
      }
    }

    await supabase.from('backup_log').insert({
      status: 'success',
      file_name: fileName,
      table_count: TABLES.length,
      row_count: rowCount,
      size_bytes: bytes.byteLength,
      duration_ms: Date.now() - startedAt,
      deleted_files: deleted,
    })

    return new Response(
      JSON.stringify({ ok: true, file: fileName, rows: rowCount, bytes: bytes.byteLength, deleted }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Backup failed', message)
    await supabase.from('backup_log').insert({
      status: 'failed',
      file_name: fileName,
      duration_ms: Date.now() - startedAt,
      error_message: message.slice(0, 1000),
    })
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
