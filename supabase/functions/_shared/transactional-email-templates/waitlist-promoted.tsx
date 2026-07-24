import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

interface Props {
  firstName?: string
  eventLabel?: string
  eventDate?: string
  bookingRef?: string
  secretaryName?: string
  secretaryOffice?: string
}

const Email = ({ firstName, eventLabel, eventDate, bookingRef, secretaryName, secretaryOffice }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Good news — a place has opened up for {eventLabel || 'your event'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto 12px', display: 'block' }} />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>A place has opened up</Heading>
          <Text style={p}>{firstName ? `Dear ${firstName},` : 'Dear Brother / Guest,'}</Text>
          <Text style={p}>
            Good news — a seat has become available for <strong>{eventLabel || 'your event'}</strong>
            {eventDate ? ` on ${eventDate}` : ''}, and your waitlist booking has been promoted to a confirmed seat.
          </Text>
          <Text style={p}>
            No further payment is needed — your original payment now secures your place. We look forward to welcoming you.
          </Text>
          {bookingRef && (
            <>
              <Hr style={hr} />
              <Text style={row}><strong style={{ color: '#1B2A4A' }}>Reference: </strong>{bookingRef}</Text>
            </>
          )}
          <Hr style={hr} />
          <Text style={signOff}>Yours sincerely,</Text>
          <Text style={signName}>{secretaryName || 'The Secretary'}</Text>
          <Text style={signOffice}>{secretaryOffice || 'Lodge Secretary'}</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>Weybridge Lodge No. 6787 · Consecrated 1949 · Guildford, Surrey</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => `A place has opened up — ${d?.eventLabel || 'Weybridge Lodge'}`,
  displayName: 'Waitlist promoted',
  previewData: {
    firstName: 'John',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
    bookingRef: '0e0fb8f3',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const header = { textAlign: 'center' as const, padding: '16px 0 24px' }
const brand = { color: '#1B2A4A', fontSize: '28px', margin: 0, letterSpacing: '0.5px' }
const brandSub = { color: '#C9A432', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const row = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0', fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
const footer = { textAlign: 'center' as const, padding: '20px 0' }
const footerText = { color: '#888', fontSize: '11px', margin: 0, fontFamily: 'Arial, sans-serif' }
