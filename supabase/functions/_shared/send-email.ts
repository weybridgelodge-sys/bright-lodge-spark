// Shared helper for server-side app email sends.
//
// Sends go directly through Lovable's managed email API (see
// ./transactional-email-templates/send-email.ts). Suppression, retries and
// rate limits are enforced by Lovable server-side; this wrapper keeps the
// project's own email_send_log history and the tolerant
// `{ ok, status, result }` return shape used across the edge functions.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'

export interface SendEmailPayload {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  replyTo?: string
  templateData?: Record<string, unknown>
}

function logClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

async function writeLog(
  status: 'sent' | 'suppressed' | 'failed',
  payload: SendEmailPayload,
  errorMessage?: string,
) {
  const supabase = logClient()
  if (!supabase) return
  const { error } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: payload.templateName,
    recipient_email: payload.recipientEmail,
    status,
    ...(errorMessage ? { error_message: errorMessage.slice(0, 1000) } : {}),
  })
  if (error) {
    console.error('email_send_log insert failed', {
      code: error.code,
      message: error.message,
      status,
    })
  }
}

export async function sendTransactionalEmail(
  payload: SendEmailPayload,
): Promise<{ ok: boolean; status: number; result: unknown; error?: unknown }> {
  try {
    const result = await sendTemplateEmail(payload.templateName, payload.recipientEmail, {
      templateData: payload.templateData as Record<string, any> | undefined,
      idempotencyKey: payload.idempotencyKey,
      replyTo: payload.replyTo,
    })

    if (result.sent) {
      await writeLog('sent', payload)
      return { ok: true, status: 200, result: { success: true } }
    }

    await writeLog('suppressed', payload)
    return {
      ok: true,
      status: 200,
      result: { success: false, reason: 'email_suppressed' },
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('send email failed', payload.templateName, message)
    await writeLog('failed', payload, message)
    return { ok: false, status: 500, result: null, error: message }
  }
}
