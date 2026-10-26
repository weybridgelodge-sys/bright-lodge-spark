/// <reference types="npm:@types/react@18.3.1" />
// Job AP: sign-in email layout. Every template keeps its action link/code and renders with
// settings missing (text-only header) or present (crest header). Run: deno test (no network).
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { SignupEmail } from './signup.tsx'
import { InviteEmail } from './invite.tsx'
import { MagicLinkEmail } from './magic-link.tsx'
import { RecoveryEmail } from './recovery.tsx'
import { EmailChangeEmail } from './email-change.tsx'
import { ReauthenticationEmail } from './reauthentication.tsx'

const URL_ = 'https://example.test/auth/v1/verify?token=abc123&type=magiclink&redirect_to=https%3A%2F%2Fexample.test%2Fmembers'
const CASES: [string, React.ComponentType<any>, Record<string, unknown>, string][] = [
  ['signup', SignupEmail, { siteName: 'S', siteUrl: 'https://example.test', recipient: 'a@example.test', confirmationUrl: URL_ }, URL_],
  ['invite', InviteEmail, { siteName: 'S', siteUrl: 'https://example.test', confirmationUrl: URL_ }, URL_],
  ['magiclink', MagicLinkEmail, { siteName: 'S', confirmationUrl: URL_, token: '654321' }, URL_],
  ['recovery', RecoveryEmail, { siteName: 'S', confirmationUrl: URL_ }, URL_],
  ['email_change', EmailChangeEmail, { siteName: 'S', oldEmail: 'a@example.test', email: 'a@example.test', newEmail: 'b@example.test', confirmationUrl: URL_ }, URL_],
  ['reauthentication', ReauthenticationEmail, { token: '987654' }, '987654'],
]
const enc = (s: string) => s.replace(/&/g, '&amp;')

for (const [name, C, props, action] of CASES) {
  Deno.test(`${name}: settings missing -> text-only header, action kept`, async () => {
    const html = await renderAsync(React.createElement(C, { ...props, brand: null }))
    assert(html.includes(enc(action)) || html.includes(action), 'action link/code present')
    assert(!/<img/i.test(html), 'no image when settings are missing')
  })
  Deno.test(`${name}: Unit Setup brand -> crest 120, name, province, footer`, async () => {
    const brand = { crestUrl: 'https://cdn.example.test/crest.png', lodgeName: 'Testbury Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire' }
    const html = await renderAsync(React.createElement(C, { ...props, brand }))
    assert(html.includes(enc(action)) || html.includes(action))
    assert(html.includes('https://cdn.example.test/crest.png') && /width="120"/.test(html))
    assert(html.includes('Testbury Lodge') && html.includes('No. 1234 — Province of Testshire') && html.includes('Testbury Lodge No. 1234'))
  })
}
if (CASES.length) {
  Deno.test('magic link app mode keeps the code', async () => {
    const html = await renderAsync(React.createElement(MagicLinkEmail, { siteName: 'S', confirmationUrl: URL_, token: '111222', client: 'app' }))
    assert(html.includes('111222'))
  })
}

Deno.test('body wording uses the given lodge name; neutral fallback has no lodge name', async () => {
  const { siteNameFor } = await import('../authEmailBrand.ts')
  const named = siteNameFor({ lodgeName: 'Testbury Lodge', lodgeNumber: '1234' })
  assert(named === 'Testbury Lodge No. 1234')
  assert(siteNameFor(null) === 'Members Portal' && siteNameFor({ lodgeName: ' ' }) === 'Members Portal')
  const strip = (h: string) => h.replace(/<!-- -->/g, '').replace(/\s+/g, ' ')
  const html = strip(await renderAsync(React.createElement(MagicLinkEmail, { siteName: named, confirmationUrl: URL_ })))
  assert(html.includes('sign in to the Testbury Lodge No. 1234') && html.includes('Your Testbury Lodge No. 1234 sign-in link'))
  const re = strip(await renderAsync(React.createElement(ReauthenticationEmail, { token: '1' })))
  assert(re.includes('Your Members Portal verification code') && !/Weybridge|6787/.test(re))
})
