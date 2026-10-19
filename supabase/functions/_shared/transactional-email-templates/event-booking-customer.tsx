import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { firstNameFromContact } from '../greeting.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

export interface EventBookingData {
  stage?: 'booked' | 'paid' | 'deposit' | 'balance_paid' | 'reminder' | 'choices' | 'link'
  reminderKind?: string | null
  deposit?: boolean
  amountPaid?: string
  balanceDue?: string | null
  balanceDueDate?: string | null
  balanceUrl?: string | null
  eventTitle?: string
  eventDate?: string
  venue?: string
  bookerName?: string
  bookerEmail?: string
  bookerPhone?: string
  lodgeLabel?: string
  guests?: { name?: string; age?: number | null; isChild?: boolean; dietary?: string | null; menu?: string | null }[]
  preOrders?: string[]
  adults?: number
  children?: number
  total?: string
  subtotal?: string
  cardFee?: string | null
  feeLabel?: string
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
        {g.menu ? ` — Menu: ${g.menu}` : ''}
      </Text>
    ))}
  </>
)

/** Heading, preview and intro for each stage; booked/paid wording is unchanged. */
export function stageCopy(d: EventBookingData) {
  const paid = d.stage === 'paid' || d.stage === 'balance_paid' || d.paymentStatus === 'Paid'
  switch (d.stage) {
    case 'deposit': return { heading: 'Deposit received — your places are held', preview: `Deposit received — ${d.eventTitle}`,
      intro: `We have received your deposit for ${d.eventTitle}. Your places are held.${d.balanceDue ? ` The balance of ${d.balanceDue} is due by ${d.balanceDueDate}.` : ''}` }
    case 'balance_paid': return { heading: 'Balance received — you’re paid in full', preview: `Balance received — ${d.eventTitle}`,
      intro: `We have received your balance payment for ${d.eventTitle}. Your booking is now paid in full. We look forward to welcoming you.` }
    case 'reminder': return { heading: 'Balance reminder', preview: `Balance due ${d.balanceDueDate} — ${d.eventTitle}`,
      intro: `This is a reminder that the balance of ${d.balanceDue} for ${d.eventTitle} is due by ${d.balanceDueDate}. You can pay securely using the link below.` }
    case 'choices': return { heading: 'Please choose your menu', preview: `Menu choices — ${d.eventTitle}`,
      intro: `Some guests on your booking for ${d.eventTitle} still need to choose their dishes. Please use the link below to make your choices.` }
    case 'link': return { heading: 'Your booking link', preview: `Your booking link — ${d.eventTitle}`,
      intro: d.balanceDue ? `Here is your secure link to pay the balance of ${d.balanceDue} for ${d.eventTitle}, due by ${d.balanceDueDate}.` : `Here is your secure link for your booking for ${d.eventTitle}.` }
    default: return paid
      ? { heading: 'Payment received — you’re booked!', preview: `Payment received — ${d.eventTitle}`, intro: `We have received your payment for ${d.eventTitle}. We look forward to welcoming you.` }
      : { heading: 'Thank you for your booking', preview: `Booking received — ${d.eventTitle}`, intro: `We have received your booking for ${d.eventTitle}. Your place is held while we await payment.` }
  }
}

const Email = (d: EventBookingData) => {
  const paid = d.stage === 'paid' || d.stage === 'balance_paid' || d.stage === 'deposit' || d.paymentStatus === 'Paid' || d.paymentStatus === 'Deposit paid'
  const copy = stageCopy(d)
  const first = firstNameFromContact(d.bookerName)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Crest />
          <Heading style={h1}>{copy.heading}</Heading>
          <Text style={p}>Dear {first || 'guest'},</Text>
          <Text style={p}>{copy.intro}</Text>
          {d.balanceUrl && (
            <Section style={notice}>
              {d.balanceDue && <Text style={{ ...noticeText, fontSize: '16px', margin: '0 0 8px' }}>Balance due: {d.balanceDue}{d.balanceDueDate ? ` by ${d.balanceDueDate}` : ''}</Text>}
              <Text style={noticeText}><Link href={d.balanceUrl} style={link}>{d.balanceDue ? 'Pay your balance' : 'Open your booking'}</Link></Text>
              <Text style={{ ...small, margin: '8px 0 0' }}>This link is personal to your booking. Please keep it safe.</Text>
            </Section>
          )}
          <Section style={card}>
            <Row label="Event" value={d.eventTitle} />
            <Row label="Date" value={d.eventDate} />
            <Row label="Venue" value={d.venue} />
            <Row label="Reference" value={d.reference} />
            <Hr style={hr} />
            <GuestList guests={d.guests} />
            {!!d.preOrders?.length && (<><Text style={label}>Pre-orders</Text>{d.preOrders.map((p, i) => <Text key={i} style={guestLine}>{p}</Text>)}</>)}
            <Hr style={hr} />
            {d.cardFee && <Row label="Subtotal" value={d.subtotal} />}
            {d.cardFee && <Row label={d.feeLabel || "Fee"} value={d.cardFee} />}
            <Row label={d.deposit ? 'Order total' : 'Total'} value={d.deposit ? d.subtotal : d.total} />
            {d.deposit && <Row label="Paid so far" value={d.amountPaid} />}
            {d.deposit && d.balanceDue && <Row label="Balance due" value={`${d.balanceDue}${d.balanceDueDate ? ` by ${d.balanceDueDate}` : ''}`} />}
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
              <Section style={notice}>
                <Text style={{ ...noticeText, fontSize: '16px', margin: '0 0 8px' }}>Amount to transfer: {d.total}</Text>
                <Text style={noticeText}>Please use the payment reference exactly as shown so we can match your payment. We will email you when it arrives.</Text>
              </Section>
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
  subject: (d: any) => {
    const t = d?.eventTitle || 'your booking'
    switch (d?.stage) {
      case 'paid': return `Payment received — ${t}`
      case 'deposit': return `Deposit received — ${t}`
      case 'balance_paid': return `Balance received — ${t}`
      case 'reminder': return `Balance due ${d?.balanceDueDate || ''} — ${t}`
      case 'choices': return `Please choose your menu — ${t}`
      case 'link': return `Your booking link — ${t}`
      default: return `Booking received — ${t} (${d?.reference || ''})`
    }
  },
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
export const notice = { backgroundColor: BRAND.bg, border: `2px solid ${BRAND.gold}`, borderRadius: '4px', padding: '14px 16px', margin: '16px 0 0' }
export const noticeText = { color: BRAND.navy, fontSize: '14px', fontWeight: 'bold' as const, lineHeight: '1.5', margin: '0' }
export const link = { color: BRAND.navy, textDecoration: 'underline' }
const brand = { color: BRAND.navy, fontSize: '24px', margin: '12px 0 0', letterSpacing: '0.5px' }
const brandSub = { color: BRAND.gold, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 12px' }
