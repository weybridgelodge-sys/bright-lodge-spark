import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createAuthEmailHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { loadLodgeSettingsStrict } from '../_shared/lodgeSettings.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { authRenderContext, createUnitBrandLookups, within, type AuthRenderContext, NEUTRAL_SITE_NAME, NEUTRAL_SAMPLE_URL } from '../_shared/authEmailBrand.ts'
import { recipientOf, resolveRecipientUnit } from '../_shared/authRecipientUnit.ts'
import { EMAIL_DOMAINS } from '../_shared/emailDomains.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Configuration: deployment-level domains (verified email DNS), see _shared/emailDomains.ts.
const SENDER_DOMAIN = EMAIL_DOMAINS.senderDomain
const FROM_DOMAIN = EMAIL_DOMAINS.fromDomain
// Default site link = the recipient's lodge Unit Setup site_url; root-domain link only if unknown.
const LAST_RESORT_SITE_URL = `https://${EMAIL_DOMAINS.rootDomain}`
const BRAND_TIMEOUT_MS = 1500

// Per-lodge identity (JOB CJ): the lodge of the person the email is for, one
// cached lookup per lodge (immutable cache values, keyed by unit). Each send
// builds its own render context and handler, so concurrent sends for
// different lodges never share header, name, link or sender state.
const brandLookups = createUnitBrandLookups({ load: (unitId) => loadLodgeSettingsStrict(unitId), timeoutMs: BRAND_TIMEOUT_MS })

function serviceDb() {
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  return url && key ? createClient(url, key) : null
}

/** Never throws; whole lookup (lodge of recipient + its identity) capped at 1500ms. */
async function contextFor(req: Request): Promise<AuthRenderContext> {
  const neutral = authRenderContext(null, LAST_RESORT_SITE_URL)
  try {
    const payload = await req.clone().json().catch(() => null)
    const db = serviceDb()
    if (!payload || !db) return neutral
    return await within((async () => {
      const { unitId, source } = await resolveRecipientUnit(db, recipientOf(payload))
      // Unit id and source only (never the address), to learn the real payload shape.
      console.log(`auth-email-hook: lodge source=${source} unit=${unitId || '-'}`)
      return authRenderContext(await brandLookups.get(unitId), LAST_RESORT_SITE_URL)
    })(), BRAND_TIMEOUT_MS, neutral)
  } catch {
    return neutral
  }
}

// Template mapping for preview mode
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Sample data for preview mode ONLY (not used in actual email sending).
// Sample URL = Unit Setup site_url at preview time, else a neutral placeholder.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_EMAIL = "user@example.test"
const sampleData = (SAMPLE_PROJECT_URL: string): Record<string, object> => ({
  signup: {
    siteName: NEUTRAL_SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: NEUTRAL_SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: NEUTRAL_SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: NEUTRAL_SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: NEUTRAL_SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    siteName: NEUTRAL_SITE_NAME,
    token: '123456',
  },
})

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Preview has no recipient, so no lodge: neutral sample link and text-only header.
  const sample = sampleData(NEUTRAL_SAMPLE_URL)[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sample))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Extract the `client` hint (app|web) from the confirmation URL's redirect_to,
// so the magic-link template can render app-only or web-only content.
function extractClientHint(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const confirmUrl = new URL(url)
    const redirectTo = confirmUrl.searchParams.get('redirect_to')
    if (redirectTo) {
      const c = new URL(redirectTo).searchParams.get('client')
      if (c) return c
    }
    const c = confirmUrl.searchParams.get('client')
    if (c) return c
  } catch (_) {
    // fall through — leave undefined so the template falls back to both
  }
  return undefined
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
// The SDK fixes `from` per handler, so each send gets its own handler built from
// that send's context (sender display name from the recipient's lodge).
function handlerFor(ctx: AuthRenderContext) {
  const name = ctx.senderName
  return createAuthEmailHandler({
    apiKey: Deno.env.get('LOVABLE_API_KEY')!,
    from: `${name} <noreply@${FROM_DOMAIN}>`,
    senderDomain: SENDER_DOMAIN,
    sendUrl: Deno.env.get('LOVABLE_SEND_URL'),
    emails: authEmails(ctx),
  })
}

function authEmails(ctx: AuthRenderContext): Parameters<typeof createAuthEmailHandler>[0]['emails'] {
  const { brand, siteName, siteUrl } = ctx
  return {
    signup: {
      subject: 'Confirm your email',
      render: async (data) => React.createElement(SignupEmail, { brand, siteName, siteUrl, recipient: data.email, confirmationUrl: data.url }),
    },
    invite: {
      subject: "You've been invited",
      render: async (data) => React.createElement(InviteEmail, { brand, siteName, siteUrl, confirmationUrl: data.url }),
    },
    magiclink: {
      subject: 'Your login link',
      render: async (data) => React.createElement(MagicLinkEmail, { brand, siteName, confirmationUrl: data.url, token: data.token, client: extractClientHint(data.url) }),
    },
    recovery: {
      subject: 'Reset your password',
      render: async (data) => React.createElement(RecoveryEmail, { brand, siteName, confirmationUrl: data.url }),
    },
    email_change: {
      subject: 'Confirm your new email',
      render: async (data) => React.createElement(EmailChangeEmail, { brand, siteName, oldEmail: data.old_email ?? '', email: data.email, newEmail: data.new_email ?? '', confirmationUrl: data.url }),
    },
    reauthentication: {
      subject: 'Your verification code',
      render: async (data) => React.createElement(ReauthenticationEmail, { brand, token: data.token ?? '', siteName }),
    },
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  return handlerFor(await contextFor(req))(req)
})
