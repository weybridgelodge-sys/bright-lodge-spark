// Shared helper for server-to-server transactional email sends.
//
// IMPORTANT: do NOT use `supabase.functions.invoke('send-transactional-email')`
// from inside another edge function. Since the signing-keys change, invoke() no
// longer forwards a service-role Authorization header, so send-transactional-email
// rejects the call with 403 Forbidden and no email is ever queued. Always use
// this direct fetch with the service role key (the pattern proven working in
// almoner-overdue-check, send-summons-email, meeting-deadline-reminder).

export interface SendEmailPayload {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  replyTo?: string
  templateData?: Record<string, unknown>
}

export async function sendTransactionalEmail(
  payload: SendEmailPayload,
): Promise<{ ok: boolean; status: number; result: unknown; error?: unknown }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    const error = 'missing service credentials'
    console.error('sendTransactionalEmail:', error)
    return { ok: false, status: 0, result: null, error }
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    })
    const result = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      console.error('send-transactional-email failed', payload.templateName, resp.status, result)
      return { ok: false, status: resp.status, result, error: result }
    }
    return { ok: true, status: resp.status, result }
  } catch (e) {
    console.error('send-transactional-email exception', payload.templateName, e)
    return { ok: false, status: 0, result: null, error: e }
  }
}
