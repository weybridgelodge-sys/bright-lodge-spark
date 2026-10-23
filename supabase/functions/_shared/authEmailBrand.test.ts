/// <reference types="npm:@types/react@18.3.1" />
// Job AS-1: render-time lookup for sign-in email headers. Run: deno test (no network).
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { createAuthBrandLookup, keepAlive } from './authEmailBrand.ts'
import { setAuthEmailBrand } from './email-templates/_layout.tsx'
import { SignupEmail } from './email-templates/signup.tsx'
import { InviteEmail } from './email-templates/invite.tsx'
import { MagicLinkEmail } from './email-templates/magic-link.tsx'
import { RecoveryEmail } from './email-templates/recovery.tsx'
import { EmailChangeEmail } from './email-templates/email-change.tsx'
import { ReauthenticationEmail } from './email-templates/reauthentication.tsx'

const TEXT_ONLY = { lodgeName: 'Textonly Lodge', lodgeNumber: '99' }
const SETTINGS = { lodgeName: 'Testbury Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire', crestImageUrl: 'https://cdn.example.test/crest.png' }
const URL_ = 'https://example.test/auth/v1/verify?token=abc123&type=magiclink'
const CASES: [string, React.ComponentType<any>, Record<string, unknown>, string][] = [
  ['signup', SignupEmail, { siteName: 'S', siteUrl: 'https://example.test', recipient: 'a@example.test', confirmationUrl: URL_ }, URL_],
  ['invite', InviteEmail, { siteName: 'S', siteUrl: 'https://example.test', confirmationUrl: URL_ }, URL_],
  ['magiclink', MagicLinkEmail, { siteName: 'S', confirmationUrl: URL_, token: '654321' }, URL_],
  ['recovery', RecoveryEmail, { siteName: 'S', confirmationUrl: URL_ }, URL_],
  ['email_change', EmailChangeEmail, { siteName: 'S', oldEmail: 'a@example.test', email: 'a@example.test', newEmail: 'b@example.test', confirmationUrl: URL_ }, URL_],
  ['reauthentication', ReauthenticationEmail, { token: '987654' }, '987654'],
]
const has = (html: string, a: string) => html.includes(a) || html.includes(a.replace(/&/g, '&amp;'))

// Mirrors the hook's render step: wait for the lookup (capped), then build the element.
async function renderWith(lookup: ReturnType<typeof createAuthBrandLookup>, C: React.ComponentType<any>, props: Record<string, unknown>) {
  const b = await lookup.get()
  setAuthEmailBrand(b ?? TEXT_ONLY)
  return await renderAsync(React.createElement(C, props))
}

for (const [name, C, props, action] of CASES) {
  Deno.test(`${name}: lookup resolved -> crest header, action kept`, async () => {
    const l = createAuthBrandLookup({ load: async () => SETTINGS, warn: () => {} })
    const html = await renderWith(l, C, props)
    assert(has(html, action))
    assert(html.includes('https://cdn.example.test/crest.png') && html.includes('No. 1234 — Province of Testshire'))
  })
  Deno.test(`${name}: lookup rejecting -> text-only, still renders`, async () => {
    const warns: string[] = []
    const l = createAuthBrandLookup({ load: () => Promise.reject(new Error('boom')), warn: (m) => warns.push(m) })
    const html = await renderWith(l, C, props)
    assert(has(html, action) && html.includes('Textonly Lodge') && !/<img/i.test(html))
    assertEquals(warns.length, 1)
  })
  Deno.test(`${name}: lookup never resolving -> text-only within ~1.6s`, async () => {
    const warns: string[] = []
    const l = createAuthBrandLookup({ load: () => new Promise(() => {}), warn: (m) => warns.push(m) })
    const t0 = performance.now()
    const html = await renderWith(l, C, props)
    const ms = performance.now() - t0
    assert(ms < 1600 && ms >= 1450, `took ${ms}ms`)
    assert(has(html, action) && !/<img/i.test(html))
    assert(warns.some((w) => w.includes('timed out')))
  })
}

Deno.test('one shared lookup; cache reused for 5 minutes', async () => {
  let calls = 0; let t = 0
  const l = createAuthBrandLookup({ load: async () => { calls++; return SETTINGS }, now: () => t, warn: () => {} })
  l.start(); await l.get(); await l.get()
  assertEquals(calls, 1)
  t = 5 * 60_000 + 1; await l.get()
  assertEquals(calls, 2)
})

Deno.test('missing identity warns with reason, no personal data', async () => {
  const warns: string[] = []
  const l = createAuthBrandLookup({ load: async () => ({ lodgeName: '' }), missingReason: () => 'settings missing', warn: (m) => warns.push(m) })
  assertEquals(await l.get(), null)
  assert(warns[0].includes('settings missing'))
})

Deno.test('load throwing synchronously still resolves null', async () => {
  const l = createAuthBrandLookup({ load: () => { throw new Error('x') }, warn: () => {} })
  assertEquals(await l.get(), null)
})

Deno.test('keepAlive is a no-op without EdgeRuntime and uses waitUntil when present', () => {
  keepAlive(Promise.resolve())
  let got = 0
  ;(globalThis as any).EdgeRuntime = { waitUntil: () => { got++ } }
  try { keepAlive(Promise.resolve()) } finally { delete (globalThis as any).EdgeRuntime }
  assertEquals(got, 1)
})
