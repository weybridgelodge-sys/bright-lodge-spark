import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

export interface EventBookingData {
  stage?: 'booked' | 'paid'
  eventTitle?: string
  eventDate?: string
  venue?: string
  bookerName?: string
  bookerEmail?: string
  bookerPhone?: string
  lodgeLabel?: string
  guests?: { name?: string; age?: number | null; isChild?: boolean; dietary?: string | null }[]
  adults?: number
  children?: number
  total?: string
  paymentMethod?: string
  paymentStatus?: string
  reference?: string
  bank?: { account_holder_name?: string; sort_code?: string; account_number?: string; reference?: string } | null
  eventUrl?: string
  adminUrl?: string
}

export const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Text style={row}><strong style={{ color: BRAND.navy }}>{label}: </strong><span style={{ color: BRAND.body }}>{value || '—'}</span></Text>
)

export const Crest = () => (
  <Section style={{ textAlign: 'center', padding: '8px 0 16px' }}>
    <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
    <Heading style={brand}>Weybridge Lodge</Heading>
    <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
  </Section>
)

export const GuestList = ({ guests = [] }: { guests?: EventBookingData['guests'] }) => (
  <>
    <Text style={label}>Guests ({guests.length})</Text>
    {guests.map((g, i) => (
      <Text key={i} style={guestLine}>
        {g.name || `Guest ${i + 1}`}{g.isChild ? ` (child${g.age != null ? `, ${g.age}` : ''})` : ''}
        {g.dietary ? ` — Dietary: ${g.dietary}` : ''}
      </Text>
    ))}
  </>
)

const Email = (d: EventBookingData) => {
  const paid = d.stage === 'paid' || d.paymentStatus === 'Paid'
  const first = (d.bookerName || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{paid ? `Payment received — ${d.eventTitle}` : `Booking received — ${d.eventTitle}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Crest />
          <Heading style={h1}>{paid ? 'Payment received — you’re booked!' : 'Thank you for your booking'}</Heading>
          <Text style={p}>Dear {first || 'guest'},</Text>
          <Text style={p}>
            {paid
              ? `We have received your payment for ${d.eventTitle}. We look forward to welcoming you.`
              : `We have received your booking for ${d.eventTitle}. Your place is held while we await payment.`}
          </Text>
          <Section style={card}>
            <Row label="Event" value={d.eventTitle} />
            <Row label="Date" value={d.eventDate} />
            <Row label="Venue" value={d.venue} />
            <Row label="Reference" value={d.reference} />
            <Hr style={hr} />
            <GuestList guests={d.guests} />
            <Hr style={hr} />
            <Row label="Total" value={d.total} />
            <Row label="Payment method" value={d.paymentMethod} />
            <Row label="Payment status" value={d.paymentStatus} />
          </Section>
          {!paid && d.bank && (
            <Section style={{ ...card, marginTop: '16px', borderColor: BRAND.gold }}>
              <Text style={label}>Bank transfer details</Text>
              <Row label="Account name" value={d.bank.account_holder_name} />
              <Row label="Sort code" value={d.bank.sort_code} />
              <Row label="Account number" value={d.bank.account_number} />
              <Row label="Payment reference" value={d.bank.reference} />
              <Text style={small}>Please use the payment reference exactly as shown so we can match your payment. We will email you when it arrives.</Text>
            </Section>
          )}
          {d.eventUrl && <Text style={small}>Event details: <Link href={d.eventUrl} style={link}>{d.eventUrl}</Link></Text>}
          <Text style={small}>Questions? Simply reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => (d?.stage === 'paid' ? `Payment received — ${d?.eventTitle || 'your booking'}` : `Booking received — ${d?.eventTitle || 'your booking'} (${d?.reference || ''})`),
  displayName: 'Event booking (customer)',
  previewData: {
    stage: 'booked', eventTitle: 'Joint Christmas Party at Guildford Masonic Centre', eventDate: 'Saturday 19 December 2026',
    venue: 'Guildford Masonic Centre, Hitherbury Close, Guildford GU2 4DR', bookerName: 'John Smith', reference: 'XMAS26-0001',
    guests: [{ name: 'John Smith' }, { name: 'Amy Smith', isChild: true, age: 8, dietary: 'Nut allergy' }],
    total: '£0.00', paymentMethod: 'Bank transfer', paymentStatus: 'Awaiting payment',
    bank: { account_holder_name: 'Example', sort_code: '00-00-00', account_number: '00000000', reference: 'EXAMPLE' },
  },
} satisfies TemplateEntry

export const main = { backgroundColor: BRAND.bg, fontFamily: BRAND.fontStack, margin: 0, padding: 0 }
export const container = { maxWidth: BRAND.containerMaxWidth, margin: '0 auto', padding: '24px' }
export const h1 = { color: BRAND.navy, fontSize: '22px', margin: '0 0 12px' }
export const p = { color: BRAND.body, fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px' }
export const card = { backgroundColor: BRAND.panel, border: `1px solid ${BRAND.hairline}`, borderRadius: '4px', padding: '20px' }
export const row = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0' }
export const label = { color: BRAND.navy, fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 4px' }
export const guestLine = { color: BRAND.body, fontSize: '14px', lineHeight: '1.5', margin: '2px 0' }
export const hr = { borderColor: BRAND.hairline, margin: '14px 0' }
export const small = { color: BRAND.muted, fontSize: '13px', margin: '16px 0 0' }
export const link = { color: BRAND.navy, textDecoration: 'underline' }
const brand = { color: BRAND.navy, fontSize: '24px', margin: '12px 0 0', letterSpacing: '0.5px' }
const brandSub = { color: BRAND.gold, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 12px' }
