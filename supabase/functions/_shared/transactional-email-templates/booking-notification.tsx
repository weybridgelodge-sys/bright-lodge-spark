import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Link,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

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
  amountLines?: { label: string; value: string }[]
  totalAmount?: string
  paymentMethodLabel?: string
  paymentStatusLabel?: string
  isApologies?: boolean
  bookingRef?: string
  submittedAt?: string
  /** Host lodge identity (header/footer). `lodgeName` above is the booker's own lodge. */
  crestUrl?: string | null
  hostLodgeName?: string
  lodgeNumber?: string
  provinceName?: string
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
  amountLines,
  paymentMethodLabel,
  paymentStatusLabel,
  isApologies,
  bookingRef,
  submittedAt,
  crestUrl, hostLodgeName, lodgeNumber, provinceName,
}: Props) => {
  const id = { crestUrl, lodgeName: hostLodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isApologies
        ? `Apologies — ${bookerName || 'visitor'} for ${eventLabel || 'event'}`
        : `New booking — ${bookerName || 'visitor'} for ${eventLabel || 'event'}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandHeader {...id} />
        <Heading style={h1}>
          {isApologies ? 'Apologies received' : 'New booking received'}
        </Heading>
        <Text style={meta}>
          {eventLabel || 'Event'}{eventDate && !String(eventLabel || '').includes(eventDate) ? ` · ${eventDate}` : ''}
          {submittedAt ? ` · booked at ${submittedAt}` : ''}
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
          {totalAmount && (amountLines && amountLines.length ? amountLines.map((l) => <Row key={l.label} label={l.label} value={l.value} />) : <Row label="Total" value={totalAmount} />)}
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
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

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
      ? `Apologies — ${String(d?.bookerName || '').replace(/\s+/g, ' ').trim() || 'visitor'} for ${d?.eventLabel || 'event'}`
      : `New booking — ${String(d?.bookerName || '').replace(/\s+/g, ' ').trim() || 'visitor'} for ${d?.eventLabel || 'event'}`,
  displayName: 'Booking notification (assistant secretary)',
  previewData: {
    bookerName: 'John Smith',
    bookerEmail: 'john@example.com',
    bookerPhone: '07000 000000',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
    meetingOptionLabel: 'Meeting & Festive Board',
    lodgeName: 'Visiting Lodge No. 9999',
    totalAmount: '£35.00',
    paymentMethodLabel: 'Card (Stripe)',
    paymentStatusLabel: 'Paid',
    bookingRef: '0e0fb8f3',
    submittedAt: new Date().toLocaleString('en-GB'),
    crestUrl: 'https://placehold.co/240x240/png', hostLodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
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
