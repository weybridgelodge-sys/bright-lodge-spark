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
  Link,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

interface Guest { name?: string; lodge?: string; dietary?: string }
interface Props {
  bookerName?: string
  bookerEmail?: string
  bookerPhone?: string
  eventLabel?: string
  eventDate?: string
  meetingOptionLabel?: string
  lodgeName?: string
  guests?: Guest[]
  dietary?: string
  totalAmount?: string
  paymentMethodLabel?: string
  paymentStatusLabel?: string
  isApologies?: boolean
  bookingRef?: string
  submittedAt?: string
}

const Email = ({
  bookerName,
  bookerEmail,
  bookerPhone,
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
  submittedAt,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isApologies
        ? `Apologies — ${bookerName || 'visitor'} for ${eventLabel || 'event'}`
        : `New booking — ${bookerName || 'visitor'} for ${eventLabel || 'event'}`}
    </Preview>
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
        <Heading style={h1}>
          {isApologies ? 'Apologies received' : 'New booking received'}
        </Heading>
        <Text style={meta}>
          {eventLabel || 'Event'}{eventDate ? ` · ${eventDate}` : ''}
          {submittedAt ? ` · submitted ${submittedAt}` : ''}
        </Text>

        <Section style={card}>
          <Row label="Booker" value={bookerName} />
          <Row label="Email" value={bookerEmail} />
          <Row label="Phone" value={bookerPhone || '—'} />
          {lodgeName && <Row label="Lodge" value={lodgeName} />}
          {bookingRef && <Row label="Booking ref" value={bookingRef} />}
          <Hr style={hr} />
          {!isApologies && <Row label="Attending" value={meetingOptionLabel} />}
          {dietary && <Row label="Dietary" value={dietary} />}
          {totalAmount && <Row label="Total" value={totalAmount} />}
          {paymentMethodLabel && <Row label="Payment method" value={paymentMethodLabel} />}
          {paymentStatusLabel && <Row label="Payment status" value={paymentStatusLabel} />}

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
        </Section>

        <Text style={footerText}>
          Reply directly to{' '}
          {bookerEmail ? (
            <Link href={`mailto:${bookerEmail}`} style={emailLink}>{bookerEmail}</Link>
          ) : (
            'the booker'
          )}{' '}
          to make contact.
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
  subject: (d: any) =>
    d?.isApologies
      ? `Apologies — ${d?.bookerName || 'visitor'} for ${d?.eventLabel || 'event'}`
      : `New booking — ${d?.bookerName || 'visitor'} for ${d?.eventLabel || 'event'}`,
  displayName: 'Booking notification (assistant secretary)',
  previewData: {
    bookerName: 'John Smith',
    bookerEmail: 'john@example.com',
    bookerPhone: '07000 000000',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
    meetingOptionLabel: 'Meeting & Festive Board',
    lodgeName: 'Weybridge Lodge No. 6787',
    totalAmount: '£35.00',
    paymentMethodLabel: 'Card (Stripe)',
    paymentStatusLabel: 'Paid',
    bookingRef: '0e0fb8f3',
    submittedAt: new Date().toLocaleString('en-GB'),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const h1 = { color: '#1B2A4A', fontSize: '22px', margin: '0 0 6px' }
const meta = { color: '#888', fontSize: '12px', margin: '0 0 18px' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '20px' }
const rowStyle = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0' }
const labelStyle = { color: '#1B2A4A', fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 4px' }
const guestLine = { color: '#2a2a2a', fontSize: '14px', lineHeight: '1.5', margin: '2px 0' }
const hr = { borderColor: '#e8e3d3', margin: '14px 0' }
const footerText = { color: '#666', fontSize: '12px', margin: '18px 0 0' }
const emailLink = { color: '#1B2A4A', textDecoration: 'underline', fontWeight: 600 as const }
const brand = { color: '#1B2A4A', fontSize: '24px', margin: '12px 0 0', letterSpacing: '0.5px' }
const brandSub = { color: '#C9A432', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 12px' }
