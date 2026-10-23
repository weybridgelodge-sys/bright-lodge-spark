import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brandHeaderLines } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Guest { name?: string; lodge?: string; dietary?: string }
interface Props {
  firstName?: string
  eventLabel?: string
  eventDate?: string
  meetingOptionLabel?: string
  lodgeName?: string
  guests?: Guest[]
  dietary?: string
  amountLines?: { label: string; value: string }[]
  totalAmount?: string // pre-formatted "£35.00" or ""
  paymentMethodLabel?: string
  paymentStatusLabel?: string
  isApologies?: boolean
  bookingRef?: string
  secretaryName?: string
  secretaryOffice?: string
  summonsPdfUrl?: string
  summonsMeetingNumber?: number
  /** Host lodge identity (header/footer). `lodgeName` above is the booker's own lodge. */
  crestUrl?: string | null
  hostLodgeName?: string
  lodgeNumber?: string
  provinceName?: string
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
  amountLines,
  paymentMethodLabel,
  paymentStatusLabel,
  isApologies,
  bookingRef,
  secretaryName,
  secretaryOffice,
  summonsPdfUrl,
  summonsMeetingNumber,
  crestUrl, hostLodgeName, lodgeNumber, provinceName,
}: Props) => {
  const id = { crestUrl, lodgeName: hostLodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isApologies
        ? `Apologies received for ${eventLabel || 'your booking'}`
        : `Booking confirmed for ${eventLabel || 'your event'}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandHeader {...id} />

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

          {summonsPdfUrl && (
            <>
              <Hr style={hr} />
              <Text style={labelStyle}>Meeting Summons</Text>
              <Text style={small}>
                The finalised summons for this meeting is available to download below.
              </Text>
              <Link href={summonsPdfUrl} style={buttonStyle}>
                {summonsMeetingNumber
                  ? `Download Summons #${summonsMeetingNumber}`
                  : 'Download the Meeting Summons'}
              </Link>
            </>
          )}

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
              {amountLines && amountLines.length ? amountLines.map((l) => <Row key={l.label} label={l.label} value={l.value} />) : <Row label="Total" value={totalAmount} />}
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
      ? `Apologies received — ${d?.eventLabel || brandHeaderLines({ lodgeName: d?.hostLodgeName }).name || 'the Lodge'}`
      : `Booking confirmation — ${d?.eventLabel || brandHeaderLines({ lodgeName: d?.hostLodgeName }).name || 'the Lodge'}`,
  displayName: 'Booking confirmation',
  previewData: {
    firstName: 'John',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
    meetingOptionLabel: 'Meeting & Festive Board',
    lodgeName: 'Visiting Lodge No. 9999',
    guests: [{ name: 'Bro. Guest One', lodge: 'Visiting Lodge' }],
    totalAmount: '£35.00',
    paymentMethodLabel: 'Card (Stripe)',
    paymentStatusLabel: 'Paid',
    bookingRef: '0e0fb8f3',
    secretaryName: 'W Bro. Richard Smith',
    secretaryOffice: 'Lodge Secretary',
    crestUrl: 'https://placehold.co/240x240/png', hostLodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px 28px 22px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const rowStyle = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0', fontFamily: 'Arial, sans-serif' }
const labelStyle = { color: '#1B2A4A', fontWeight: 'bold' as const, fontSize: '14px', margin: '8px 0 4px', fontFamily: 'Arial, sans-serif' }
const guestLine = { color: '#2a2a2a', fontSize: '14px', lineHeight: '1.5', margin: '2px 0', fontFamily: 'Arial, sans-serif' }
const buttonStyle = { display: 'inline-block', backgroundColor: '#1B2A4A', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none', padding: '12px 22px', borderRadius: '3px', border: '1px solid #C9A432', margin: '10px 0 4px' }
const small = { color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
