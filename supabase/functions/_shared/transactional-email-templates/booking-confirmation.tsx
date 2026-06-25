import * as React from 'npm:react@18.3.1'
import {
  Body,
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

interface Guest { name?: string; lodge?: string; dietary?: string }
interface Props {
  firstName?: string
  eventLabel?: string
  eventDate?: string
  meetingOptionLabel?: string
  lodgeName?: string
  guests?: Guest[]
  dietary?: string
  totalAmount?: string // pre-formatted "£35.00" or ""
  paymentMethodLabel?: string
  paymentStatusLabel?: string
  isApologies?: boolean
  bookingRef?: string
  secretaryName?: string
  secretaryOffice?: string
}

const Email = ({
  firstName,
  eventLabel,
  eventDate,
  meetingOptionLabel,
  lodgeName,
  guests = [],
  dietary,
  totalAmount,
  paymentMethodLabel,
  paymentStatusLabel,
  isApologies,
  bookingRef,
  secretaryName,
  secretaryOffice,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isApologies
        ? `Apologies received for ${eventLabel || 'your booking'}`
        : `Booking confirmed for ${eventLabel || 'your event'}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={logo} />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>
            {isApologies ? 'Apologies received' : 'Booking confirmed'}
          </Heading>
          <Text style={p}>
            {firstName ? `Dear ${firstName},` : 'Dear Brother / Guest,'}
          </Text>
          <Text style={p}>
            {isApologies
              ? `Thank you for letting us know that you are unable to attend ${eventLabel || 'this meeting'}. Your apologies have been recorded.`
              : `Thank you for your booking. The details below have been recorded — please keep this email for your reference.`}
          </Text>

          <Hr style={hr} />
          <Row label="Event" value={eventLabel} />
          <Row label="Date" value={eventDate} />
          {!isApologies && <Row label="Attending" value={meetingOptionLabel} />}
          {lodgeName && <Row label="Lodge" value={lodgeName} />}
          {bookingRef && <Row label="Reference" value={bookingRef} />}

          {!isApologies && guests.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={labelStyle}>Guests ({guests.length})</Text>
              {guests.map((g, i) => (
                <Text key={i} style={guestLine}>
                  {g.name || `Guest ${i + 1}`}
                  {g.lodge ? ` — ${g.lodge}` : ''}
                  {g.dietary ? ` (Dietary: ${g.dietary})` : ''}
                </Text>
              ))}
            </>
          )}

          {!isApologies && dietary && (
            <>
              <Hr style={hr} />
              <Row label="Dietary requirements" value={dietary} />
            </>
          )}

          {!isApologies && totalAmount && (
            <>
              <Hr style={hr} />
              <Row label="Total" value={totalAmount} />
              {paymentMethodLabel && <Row label="Payment method" value={paymentMethodLabel} />}
              {paymentStatusLabel && <Row label="Payment status" value={paymentStatusLabel} />}
            </>
          )}

          <Hr style={hr} />
          <Text style={signOff}>Yours sincerely,</Text>
          <Text style={signName}>{secretaryName || 'The Secretary'}</Text>
          <Text style={signOffice}>{secretaryOffice || 'Lodge Secretary'}</Text>

          <Hr style={hr} />
          <Text style={small}>
            If anything above is incorrect, please reply to this email and we will amend your booking.
          </Text>
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

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Text style={rowStyle}>
    <strong style={{ color: '#1B2A4A' }}>{label}: </strong>
    <span style={{ color: '#2a2a2a' }}>{value || '—'}</span>
  </Text>
)

export const template = {
  component: Email,
  subject: (d: any) =>
    d?.isApologies
      ? `Apologies received — ${d?.eventLabel || 'Weybridge Lodge'}`
      : `Booking confirmation — ${d?.eventLabel || 'Weybridge Lodge'}`,
  displayName: 'Booking confirmation',
  previewData: {
    firstName: 'John',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
    meetingOptionLabel: 'Meeting & Festive Board',
    lodgeName: 'Weybridge Lodge No. 6787',
    guests: [{ name: 'Bro. Guest One', lodge: 'Visiting Lodge' }],
    totalAmount: '£35.00',
    paymentMethodLabel: 'Card (Stripe)',
    paymentStatusLabel: 'Paid',
    bookingRef: '0e0fb8f3',
    secretaryName: 'W Bro. Richard Smith',
    secretaryOffice: 'Lodge Secretary',
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
const rowStyle = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0', fontFamily: 'Arial, sans-serif' }
const labelStyle = { color: '#1B2A4A', fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 4px', fontFamily: 'Arial, sans-serif' }
const guestLine = { color: '#2a2a2a', fontSize: '14px', lineHeight: '1.5', margin: '2px 0', fontFamily: 'Arial, sans-serif' }
const small = { color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0, fontFamily: 'Arial, sans-serif' }
const footer = { textAlign: 'center' as const, padding: '20px 0' }
const footerText = { color: '#888', fontSize: '11px', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
