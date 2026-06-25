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

interface MenuGuest { name?: string; starter?: string; main?: string; dessert?: string }
interface LineItem { label?: string; qty?: number; unit_price_pence?: number }
interface DrinkItem { name?: string; category?: string; qty?: number; unit_price_pence?: number }

interface Props {
  bookerName?: string
  bookerEmail?: string
  bookerPhone?: string
  eventLabel?: string
  eventDate?: string
  guestCount?: number
  guests?: MenuGuest[]
  seatingPreference?: string
  dietary?: string
  message?: string
  lineItems?: LineItem[]
  drinks?: DrinkItem[]
  totalAmount?: string
  paymentStatusLabel?: string
  bookingRef?: string
  submittedAt?: string
}

const formatPence = (p?: number) =>
  typeof p === 'number'
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p / 100)
    : ''

const Email = ({
  bookerName,
  bookerEmail,
  bookerPhone,
  eventLabel,
  eventDate,
  guestCount,
  guests = [],
  seatingPreference,
  dietary,
  message,
  lineItems = [],
  drinks = [],
  totalAmount,
  paymentStatusLabel,
  bookingRef,
  submittedAt,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Ladies Festival booking — {bookerName || 'visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

        <Heading style={h1}>New Ladies Festival booking</Heading>
        <Text style={meta}>
          {eventLabel || 'Ladies Festival 2026'}{eventDate ? ` · ${eventDate}` : ''}
          {submittedAt ? ` · submitted ${submittedAt}` : ''}
        </Text>

        <Section style={card}>
          <Row label="Booker" value={bookerName} />
          <Row label="Email" value={bookerEmail} />
          <Row label="Phone" value={bookerPhone || '—'} />
          {typeof guestCount === 'number' && <Row label="Party size" value={String(guestCount)} />}
          {bookingRef && <Row label="Booking ref" value={bookingRef} />}

          {totalAmount && (
            <>
              <Hr style={hr} />
              <Row label="Total" value={totalAmount} />
              {paymentStatusLabel && <Row label="Payment status" value={paymentStatusLabel} />}
            </>
          )}

          {(seatingPreference || dietary || message) && (
            <>
              <Hr style={hr} />
              {seatingPreference && <Row label="Seating preference" value={seatingPreference} />}
              {dietary && <Row label="Dietary" value={dietary} />}
              {message && <Row label="Notes" value={message} />}
            </>
          )}

          {guests.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={labelStyle}>Menu choices ({guests.length})</Text>
              {guests.map((g, i) => (
                <Section key={i} style={guestBlock}>
                  <Text style={guestName}>{g.name || `Guest ${i + 1}`}</Text>
                  {g.starter && <Text style={guestLine}>Starter: {g.starter}</Text>}
                  {g.main && <Text style={guestLine}>Main: {g.main}</Text>}
                  {g.dessert && <Text style={guestLine}>Dessert: {g.dessert}</Text>}
                </Section>
              ))}
            </>
          )}

          {lineItems.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={labelStyle}>Order summary</Text>
              {lineItems.map((li, i) => (
                <Text key={i} style={lineRow}>
                  <span>{li.qty || 1} × {li.label || ''}</span>
                  <span style={{ float: 'right' }}>
                    {formatPence((li.unit_price_pence || 0) * (li.qty || 1))}
                  </span>
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
  subject: (d: any) => `New Ladies Festival booking — ${d?.bookerName || 'visitor'}`,
  displayName: 'Ladies Festival notification',
  previewData: {
    bookerName: 'John Smith',
    bookerEmail: 'john@example.com',
    bookerPhone: '07000 000000',
    eventLabel: 'Ladies Festival 2026',
    eventDate: 'Saturday 22 August 2026',
    guestCount: 2,
    guests: [
      { name: 'John Smith', starter: 'Smoked salmon', main: 'Beef fillet', dessert: 'Chocolate fondant' },
      { name: 'Mrs Smith', starter: 'Goat cheese tart', main: 'Sea bass', dessert: 'Lemon posset' },
    ],
    lineItems: [
      { label: 'Ladies Festival 2026 — ticket', qty: 2, unit_price_pence: 7500 },
      { label: 'Prosecco', qty: 1, unit_price_pence: 2800 },
    ],
    totalAmount: '£178.00',
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
const lineRow = { fontSize: '14px', lineHeight: '1.6', margin: '2px 0', color: '#2a2a2a', display: 'block' as const, overflow: 'hidden' as const }
const labelStyle = { color: '#1B2A4A', fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 6px' }
const guestBlock = { margin: '0 0 10px', padding: '8px 10px', backgroundColor: '#ffffff', border: '1px solid #ece6d3', borderRadius: '3px' }
const guestName = { color: '#1B2A4A', fontSize: '14px', fontWeight: 600 as const, margin: '0 0 4px' }
const guestLine = { color: '#2a2a2a', fontSize: '13px', lineHeight: '1.45', margin: '1px 0' }
const hr = { borderColor: '#e8e3d3', margin: '14px 0' }
const footerText = { color: '#666', fontSize: '12px', margin: '18px 0 0' }
const emailLink = { color: '#1B2A4A', textDecoration: 'underline', fontWeight: 600 as const }
const brand = { color: '#1B2A4A', fontSize: '24px', margin: '12px 0 0', letterSpacing: '0.5px' }
const brandSub = { color: '#C9A432', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 12px' }
