import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createAuthEmailHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { setAuthEmailBrand } from '../_shared/email-templates/_layout.tsx'
import { loadLodgeSettings } from '../_shared/lodgeSettings.ts'
import { createAuthBrandLookup, keepAlive, siteNameFor, senderDisplayName, NEUTRAL_SITE_NAME } from '../_shared/authEmailBrand.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Configuration
const SENDER_DOMAIN = "notify.email.weybridgelodge.org.uk"
const ROOT_DOMAIN = "email.weybridgelodge.org.uk"
const FROM_DOMAIN = "email.weybridgelodge.org.uk"
const SITE_URL = `https://${ROOT_DOMAIN}`

// Header/footer identity (layout only). Neutral text-only header unless Unit Setup is read in
// time: render uses the cached identity, else waits for ONE shared lookup for at most 1500ms.
// Timeout or any error keeps the text-only header; the lookup can never throw or fail a send.
const TEXT_ONLY_BRAND = { lodgeName: NEUTRAL_SITE_NAME, lodgeNumber: '' }
setAuthEmailBrand(TEXT_ONLY_BRAND)
const brandLookup = createAuthBrandLookup({
  load: () => loadLodgeSettings(),
  timeoutMs: 1500,
  missingReason: () =>
    !Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      ? 'settings missing'
      : 'no lodge identity: not exactly one unit or lodge name blank',
})
// Returns the body-text lodge name from the same lookup (neutral wording when unavailable).
async function applyAuthEmailBrand(): Promise<string> {
  try {
    const b = await brandLookup.get()
    setAuthEmailBrand(b ?? TEXT_ONLY_BRAND)
    return siteNameFor(b)
  } catch {
    try { setAuthEmailBrand(TEXT_ONLY_BRAND) } catch { /* keep current header */ }
    return NEUTRAL_SITE_NAME
  }
}
try { keepAlive(brandLookup.start()) } catch { /* never block boot */ }

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
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://bright-lodge-spark.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
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
}

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

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

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
// Sender display name comes from Unit Setup (senderDisplayName); the SDK fixes `from` per handler,
// so one handler is kept per display name. Address and domains unchanged.
const handlers = new Map<string, (req: Request) => Promise<Response>>()
function handlerFor(name: string) {
  let h = handlers.get(name)
  if (!h) {
    h = createAuthEmailHandler({
      apiKey: Deno.env.get('LOVABLE_API_KEY')!,
      from: `${name} <noreply@${FROM_DOMAIN}>`,
      senderDomain: SENDER_DOMAIN,
      sendUrl: Deno.env.get('LOVABLE_SEND_URL'),
      emails: AUTH_EMAILS,
    })
    handlers.set(name, h)
  }
  return h
}
// Same bounded lookup (cache, else ≤1500ms); never throws; neutral name on any failure.
async function currentSenderName(): Promise<string> {
  try { return senderDisplayName(await brandLookup.get()) } catch { return NEUTRAL_SITE_NAME }
}

const AUTH_EMAILS: Parameters<typeof createAuthEmailHandler>[0]['emails'] = {
    signup: {
      subject: 'Confirm your email',
      render: async (data) => {
        const siteName = await applyAuthEmailBrand()
        return React.createElement(SignupEmail, {
          siteName,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: data.url,
        })
      },
    },
    invite: {
      subject: "You've been invited",
      render: async (data) => {
        const siteName = await applyAuthEmailBrand()
        return React.createElement(InviteEmail, {
          siteName,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
        })
      },
    },
    magiclink: {
      subject: 'Your login link',
      render: async (data) => {
        const siteName = await applyAuthEmailBrand()
        return React.createElement(MagicLinkEmail, {
          siteName,
          confirmationUrl: data.url,
          token: data.token,
          client: extractClientHint(data.url),
        })
      },
    },
    recovery: {
      subject: 'Reset your password',
      render: async (data) => {
        const siteName = await applyAuthEmailBrand()
        return React.createElement(RecoveryEmail, {
          siteName,
          confirmationUrl: data.url,
        })
      },
    },
    email_change: {
      subject: 'Confirm your new email',
      render: async (data) => {
        const siteName = await applyAuthEmailBrand()
        return React.createElement(EmailChangeEmail, {
          siteName,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
        })
      },
    },
    reauthentication: {
      subject: 'Your verification code',
      render: async (data) => {
        const siteName = await applyAuthEmailBrand()
        return React.createElement(ReauthenticationEmail, { token: data.token ?? '', siteName })
      },
    },
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

  try { keepAlive(brandLookup.start()) } catch { /* never block a send */ }
  return handlerFor(await currentSenderName())(req)
})
