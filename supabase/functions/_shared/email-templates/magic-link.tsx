/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Weybridge Lodge sign-in link and code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandEyebrow}>WEYBRIDGE LODGE · No. 6787</Text>
          <Heading style={h1}>Members Portal Sign-In</Heading>
        </Section>

        <Text style={text}>
          Use the button below to sign in to the {siteName} Members Portal.
          This link will expire shortly and can only be used once.
        </Text>

        <Section style={{ textAlign: 'center' as const, margin: '24px 0 32px' }}>
          <Button style={button} href={confirmationUrl}>
            Sign In to the Portal
          </Button>
        </Section>

        {token ? (
          <>
            <Hr style={hr} />
            <Text style={codeIntro}>
              <strong>Using the mobile app?</strong> Enter this code on the
              "Check your inbox" screen instead of tapping the link above:
            </Text>
            <Section style={codeWrap}>
              <Text style={codeStyle}>{token}</Text>
            </Section>
            <Text style={codeHint}>
              This code expires with the link above. Do not share it with
              anyone — Lodge officers will never ask for it.
            </Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          If you didn't request this sign-in, you can safely ignore this
          email — no changes have been made to your account.
        </Text>
        <Text style={footerBrand}>
          Weybridge Lodge No. 6787 · Guildford, Surrey
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const NAVY = '#1B2A4A'
const GOLD = '#C9A432'

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
}
const container = {
  padding: '32px 28px',
  maxWidth: '560px',
}
const header = {
  borderBottom: `2px solid ${GOLD}`,
  paddingBottom: '16px',
  marginBottom: '24px',
}
const brandEyebrow = {
  fontSize: '11px',
  letterSpacing: '0.22em',
  color: GOLD,
  fontWeight: 700 as const,
  margin: '0 0 6px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: NAVY,
  margin: '0',
  fontFamily: 'Georgia, "Times New Roman", serif',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.55',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: NAVY,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '4px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '28px 0 20px',
}
const codeIntro = {
  fontSize: '14px',
  color: '#374151',
  lineHeight: '1.5',
  margin: '0 0 12px',
}
const codeWrap = {
  backgroundColor: '#f8f6ef',
  border: `1px solid ${GOLD}`,
  borderRadius: '4px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  margin: '0 0 12px',
}
const codeStyle = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: NAVY,
  letterSpacing: '0.4em',
  margin: '0',
  paddingLeft: '0.4em', // visually re-centre after letter-spacing
}
const codeHint = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '0 0 8px',
}
const footer = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '0 0 12px',
}
const footerBrand = {
  fontSize: '11px',
  color: '#9ca3af',
  letterSpacing: '0.08em',
  margin: '4px 0 0',
}
