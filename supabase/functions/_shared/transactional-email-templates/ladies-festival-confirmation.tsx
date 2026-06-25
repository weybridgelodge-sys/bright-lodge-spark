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

interface MenuGuest { name?: string; starter?: string; main?: string; dessert?: string }
interface LineItem { label?: string; qty?: number; unit_price_pence?: number }
interface DrinkItem { name?: string; category?: string; qty?: number; unit_price_pence?: number }

interface Props {
  firstName?: string
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
  secretaryName?: string
  secretaryOffice?: string
}

const formatPence = (p?: number) =>
  typeof p === 'number'
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p / 100)
    : ''

const Email = ({
  firstName,
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
  secretaryName,
  secretaryOffice,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Ladies Festival 2026 booking is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={logo} />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Ladies Festival booking confirmed</Heading>
          <Text style={p}>{firstName ? `Dear ${firstName},` : 'Dear Brother / Guest,'}</Text>
          <Text style={p}>
            Thank you for booking for our Ladies Festival 2026 — a black tie charity gala in aid of
            Action for Carers Surrey. We look forward to welcoming you and your guests.
          </Text>

          <Hr style={hr} />
          <Row label="Event" value={eventLabel || 'Ladies Festival 2026'} />
          <Row label="Date" value={eventDate || 'Saturday 22 August 2026'} />
          <Row label="Venue" value="Macdonald Frimley Hall Hotel & Spa" />
          <Row label="Dress" value="Black tie" />
          <Row label="Arrival" value="6.30 pm (carriages 1.00 am)" />
          {typeof guestCount === 'number' && <Row label="Party size" value={String(guestCount)} />}
          {bookingRef && <Row label="Reference" value={bookingRef} />}

          {guests.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={labelStyle}>Menu choices</Text>
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

          {(seatingPreference || dietary || message) && (
            <>
              <Hr style={hr} />
              {seatingPreference && <Row label="Seating preference" value={seatingPreference} />}
              {dietary && <Row label="Dietary requirements" value={dietary} />}
              {message && <Row label="Notes" value={message} />}
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

          {totalAmount && (
            <>
              <Hr style={hr} />
              <Row label="Total paid" value={totalAmount} />
              {paymentStatusLabel && <Row label="Payment status" value={paymentStatusLabel} />}
            </>
          )}

          <Hr style={hr} />
          <Text style={p}>
            A 20% discount on overnight rooms at Frimley Hall has been secured. The discount code
            and direct booking link will follow in a separate email closer to the event.
          </Text>

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
            Weybridge Lodge No. 6787 · Consecrated 1949 · In aid of Action for Carers Surrey
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
  subject: () => 'Ladies Festival 2026 — booking confirmation',
  displayName: 'Ladies Festival confirmation',
  previewData: {
    firstName: 'John',
    eventLabel: 'Ladies Festival 2026',
    eventDate: 'Saturday 22 August 2026',
    guestCount: 2,
    guests: [
      { name: 'John Smith', starter: 'Smoked salmon', main: 'Beef fillet', dessert: 'Chocolate fondant' },
      { name: 'Mrs Smith', starter: 'Goat cheese tart', main: 'Sea bass', dessert: 'Lemon posset' },
    ],
    seatingPreference: 'Near the Astolat table if possible',
    dietary: 'One nut allergy',
    lineItems: [
      { label: 'Ladies Festival 2026 — ticket', qty: 2, unit_price_pence: 7500 },
      { label: 'Prosecco', qty: 1, unit_price_pence: 2800 },
    ],
    totalAmount: '£178.00',
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
const lineRow = { fontSize: '14px', lineHeight: '1.6', margin: '2px 0', fontFamily: 'Arial, sans-serif', color: '#2a2a2a', display: 'block' as const, overflow: 'hidden' as const }
const labelStyle = { color: '#1B2A4A', fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 6px', fontFamily: 'Arial, sans-serif' }
const guestBlock = { margin: '0 0 10px', padding: '8px 10px', backgroundColor: '#ffffff', border: '1px solid #ece6d3', borderRadius: '3px' }
const guestName = { color: '#1B2A4A', fontSize: '14px', fontWeight: 600 as const, margin: '0 0 4px', fontFamily: 'Arial, sans-serif' }
const guestLine = { color: '#2a2a2a', fontSize: '13px', lineHeight: '1.45', margin: '1px 0', fontFamily: 'Arial, sans-serif' }
const small = { color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0, fontFamily: 'Arial, sans-serif' }
const footer = { textAlign: 'center' as const, padding: '20px 0' }
const footerText = { color: '#888', fontSize: '11px', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
