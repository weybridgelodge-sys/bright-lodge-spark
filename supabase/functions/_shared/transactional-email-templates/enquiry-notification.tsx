import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

interface Props {
  name?: string
  email?: string
  phone?: string
  reason?: string
  submittedAt?: string
  source?: string
}

const Email = ({ name, email, phone, reason, submittedAt, source }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New membership enquiry from {name || 'website visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <Img
            src={LOGO_URL}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            alt="Weybridge Lodge crest"
            style={{ margin: '0 auto', display: 'block' }}
          />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>
        <Heading style={h1}>New Membership Enquiry</Heading>
        <Text style={meta}>Source: {source || 'join-us'} · {submittedAt || ''}</Text>

        <Section style={card}>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Phone" value={phone || '—'} />
          <Hr style={hr} />
          <Text style={labelStyle}>Reason for enquiry</Text>
          <Text style={reasonStyle}>{reason}</Text>
        </Section>

        <Text style={footerText}>
          Reply directly to {email || 'the enquirer'} to make contact.
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Text style={rowStyle}>
    <strong style={{ color: '#1B2A4A' }}>{label}: </strong>
    <span style={{ color: '#2a2a2a' }}>{value || '—'}</span>
  </Text>
)

export const template = {
  component: Email,
  subject: (d: any) => `New Lodge enquiry — ${d?.name || 'website visitor'}`,
  displayName: 'Enquiry notification (secretary)',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '07000 000000',
    reason: 'I would like to learn more about Freemasonry.',
    submittedAt: new Date().toISOString(),
    source: 'join-us',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const h1 = { color: '#1B2A4A', fontSize: '22px', margin: '0 0 6px' }
const meta = { color: '#888', fontSize: '12px', margin: '0 0 18px' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '20px' }
const rowStyle = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0' }
const labelStyle = { color: '#1B2A4A', fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 4px' }
const reasonStyle = { color: '#2a2a2a', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e8e3d3', margin: '14px 0' }
const footerText = { color: '#666', fontSize: '12px', margin: '18px 0 0' }
const brand = { color: '#1B2A4A', fontSize: '24px', margin: '12px 0 0', letterSpacing: '0.5px' }
const brandSub = { color: '#C9A432', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 12px' }
