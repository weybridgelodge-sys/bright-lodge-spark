/// <reference types="npm:@types/react@18.3.1" />

// Shared layout for auth (sign-in) emails: the same EmailBrandHeader/EmailBrandFooter as the
// transactional emails. Identity is set once per function instance by auth-email-hook via
// setAuthEmailBrand (Unit Setup, loaded in the background); until then, or on any lookup
// failure, a text-only header is used. Rendering never waits for, or fails on, settings.
import * as React from 'npm:react@18.3.1'
import {
  BRAND,
  brandStyles,
  type BrandIdentity,
} from '../transactional-email-templates/_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from '../transactional-email-templates/_brandHeader.tsx'

export { BRAND, brandStyles }

let current: BrandIdentity = {}
export function setAuthEmailBrand(b: BrandIdentity | null | undefined) {
  current = { ...(b ?? {}) }
}
export function getAuthEmailBrand(): BrandIdentity {
  return current
}

export const BrandHeader = () => <EmailBrandHeader {...current} />
export const BrandFooter = () => <EmailBrandFooter {...current} />

export const main = brandStyles.main
export const container = brandStyles.container
export const h1 = brandStyles.h1
export const text = brandStyles.body
export const card = brandStyles.card
export const hr = brandStyles.hr
export const link = brandStyles.link

export const button = {
  backgroundColor: BRAND.navy,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '4px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const buttonWrap = { textAlign: 'center' as const, margin: '20px 0 24px' }

export const codeWrap = {
  backgroundColor: BRAND.panel,
  border: `1px solid ${BRAND.gold}`,
  borderRadius: '4px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  margin: '0 0 12px',
}

export const codeStyle = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: BRAND.navy,
  letterSpacing: '0.4em',
  margin: '0',
  paddingLeft: '0.4em',
}

export const footer = {
  fontSize: '12px',
  color: BRAND.muted,
  lineHeight: '1.5',
  margin: '0 0 12px',
}

export const footerBrand = {
  fontSize: '11px',
  color: '#9ca3af',
  letterSpacing: '0.08em',
  margin: '4px 0 0',
}
