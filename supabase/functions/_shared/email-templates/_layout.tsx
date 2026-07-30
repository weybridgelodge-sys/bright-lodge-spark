/// <reference types="npm:@types/react@18.3.1" />

// Shared branded layout for auth emails, matching the transactional
// templates (crest + "Weybridge Lodge" + "No. 6787 — Province of Surrey").
import * as React from 'npm:react@18.3.1'
import { Heading, Img, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  BRAND,
  LOGO_HEIGHT,
  LOGO_URL,
  LOGO_WIDTH,
  brandStyles,
} from '../transactional-email-templates/_brand.ts'

export { BRAND, brandStyles }

export const BrandHeader = () => (
  <Section style={brandStyles.crestWrap}>
    <Img
      src={LOGO_URL}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      alt="Weybridge Lodge crest"
      style={{ margin: '0 auto', display: 'block' }}
    />
    <Heading style={brandStyles.brand}>Weybridge Lodge</Heading>
    <Text style={brandStyles.brandSub}>No. 6787 — Province of Surrey</Text>
  </Section>
)

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
