import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.3.1'
import { TEMPLATES } from './registry.ts'
import { EMAIL_DOMAINS } from '../emailDomains.ts'
import { loadLodgeSettings } from '../lodgeSettings.ts'

// Server-only: reads LOVABLE_API_KEY. Import from edge functions only — never
// expose sending to the browser.

// Sending domains are deployment-level (verified email DNS); single source: _shared/emailDomains.ts.
const SENDER_DOMAIN = EMAIL_DOMAINS.senderDomain
const FROM_DOMAIN = EMAIL_DOMAINS.fromDomain

/** Header-safe sender display name; neutral "Your Lodge" when blank. */
export function defaultSenderName(formal: string | null | undefined): string {
  return (formal ?? '').replace(/[\r\n<>"\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'Your Lodge'
}

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
  /** Visible Cc addresses (the service caps To+Cc+Bcc at 5). Empty/omitted = no Cc. */
  cc?: string[]
  /** Optional From display name (e.g. from lodge settings); defaults to the Unit Setup formal sender name (fallback "Your Lodge"). */
  fromName?: string
}

/**
 * Renders a registered template and sends it through Lovable's managed email
 * API. Suppression, retries, and rate limits are enforced by Lovable
 * server-side. A suppressed recipient is an expected outcome
 * ({ sent: false }); any other failure throws — EmailAPIError exposes
 * .code and .status for branching.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: options.fromName
          ? `"${options.fromName.replace(/["\r\n<>]/g, '')}" <noreply@${FROM_DOMAIN}>`
          : `${defaultSenderName((await loadLodgeSettings()).formalSenderName)} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: options.idempotencyKey || crypto.randomUUID(),
        reply_to: options.replyTo,
        ...(options.cc && options.cc.length ? { cc: options.cc.slice(0, 4) } : {}),
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') }
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      return { sent: false, reason: 'recipient_suppressed' }
    }
    throw error
  }

  return { sent: true }
}
