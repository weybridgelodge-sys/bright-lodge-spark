import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

interface Props {
  meetingDateLabel?: string
  meetingNumber?: number | string
  pdfUrl?: string
  secretaryName?: string
  secretaryTitle?: string
  secretaryOffice?: string
  isTest?: boolean
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

const Email = ({
  meetingDateLabel,
  meetingNumber,
  pdfUrl,
  secretaryName,
  secretaryTitle,
  secretaryOffice,
  isTest,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isTest ? '[TEST] ' : ''}Summons for the next meeting of Weybridge Lodge No. 6787
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src={LOGO_URL}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            alt="Weybridge Lodge crest"
            style={logo}
          />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

        <Section style={card}>
          {isTest && (
            <Text style={testBanner}>
              TEST DELIVERY — this is a preview of the summons distribution email.
            </Text>
          )}
          <Heading as="h2" style={h2}>
            {meetingNumber
              ? `Summons for our ${meetingNumber}${ordinalSuffix(Number(meetingNumber))} Meeting`
              : 'Summons for our next Meeting'}
          </Heading>
          <Text style={p}>Brethren,</Text>
          <Text style={p}>
            The Summons for our next meeting
            {meetingDateLabel ? ` on ${meetingDateLabel}` : ''} is available to download below.
          </Text>
          <Text style={p}>
            Remember to forward it to any guests that you wish to invite.
          </Text>

          {pdfUrl && (
            <Section style={{ textAlign: 'center', margin: '20px 0 8px' }}>
              <Button href={pdfUrl} style={btn}>
                Download Summons (PDF)
              </Button>
              <Text style={small}>
                Link valid for 30 days. If the button does not work, copy and
                paste this URL into your browser:
                <br />
                <span style={{ wordBreak: 'break-all' }}>{pdfUrl}</span>
              </Text>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={signOff}>Best wishes</Text>
          <Text style={signOff}>S&amp;F</Text>
          <Text style={signName}>
            {[secretaryTitle, secretaryName].filter(Boolean).join(' ') || 'The Secretary'}
          </Text>
          <Text style={signOffice}>{secretaryOffice || 'Secretary'}</Text>
          <Text style={signOffice}>Weybridge Lodge No. 6787</Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Weybridge Lodge No. 6787 · Consecrated 1949 · Guildford, Surrey
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Props) =>
    `${data.isTest ? '[TEST] ' : ''}Summons — Weybridge Lodge No. 6787${
      data.meetingDateLabel ? ` — ${data.meetingDateLabel}` : ''
    }`,
  displayName: 'Summons distribution',
  previewData: {
    meetingDateLabel: 'Saturday 12 September 2026',
    meetingNumber: 385,
    pdfUrl: 'https://example.com/summons.pdf',
    secretaryTitle: 'W Bro.',
    secretaryName: 'Richard Smith',
    secretaryOffice: 'Secretary',
    isTest: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const header = { textAlign: 'center' as const, padding: '16px 0 24px' }
const logo = { margin: '0 auto 12px', display: 'block' }
const brand = { color: '#1B2A4A', fontSize: '28px', margin: 0, letterSpacing: '0.5px' }
const brandSub = { color: '#C9A432', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px 28px 22px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const small = { color: '#666', fontSize: '12px', lineHeight: '1.5', margin: '8px 0 0', fontFamily: 'Arial, sans-serif' }
const footer = { textAlign: 'center' as const, padding: '20px 0' }
const footerText = { color: '#888', fontSize: '11px', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
const btn = { backgroundColor: '#C9A432', color: '#1B2A4A', padding: '12px 24px', borderRadius: '4px', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const testBanner = { backgroundColor: '#fff3cd', border: '1px solid #ffe69c', color: '#664d03', padding: '8px 12px', borderRadius: '4px', fontFamily: 'Arial, sans-serif', fontSize: '13px', margin: '0 0 14px' }
