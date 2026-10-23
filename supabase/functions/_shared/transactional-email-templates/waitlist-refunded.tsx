import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brandHeaderLines } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  firstName?: string
  eventLabel?: string
  eventDate?: string
  totalAmount?: string
  bookingRef?: string
  secretaryName?: string
  secretaryOffice?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({ firstName, eventLabel, eventDate, totalAmount, bookingRef, secretaryName, secretaryOffice, crestUrl, lodgeName, lodgeNumber, provinceName, }: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your waitlist booking for {eventLabel || 'the event'} has been refunded in full</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandHeader {...id} />
        <Section style={card}>
          <Heading as="h2" style={h2}>Waitlist refund issued</Heading>
          <Text style={p}>{firstName ? `Dear ${firstName},` : 'Dear Brother / Guest,'}</Text>
          <Text style={p}>
            Unfortunately no seat became available for <strong>{eventLabel || 'the event'}</strong>
            {eventDate ? ` on ${eventDate}` : ''} before it took place. Your waitlist payment has been refunded in full to the card used at checkout.
          </Text>
          <Text style={p}>
            Refunds typically appear in your account within 5–10 working days. We are sorry we couldn't seat you on this occasion and hope to welcome you at a future meeting.
          </Text>
          {(totalAmount || bookingRef) && (
            <>
              <Hr style={hr} />
              {totalAmount && <Text style={row}><strong style={{ color: '#1B2A4A' }}>Refunded: </strong>{totalAmount}</Text>}
              {bookingRef && <Text style={row}><strong style={{ color: '#1B2A4A' }}>Reference: </strong>{bookingRef}</Text>}
            </>
          )}
          <Hr style={hr} />
          <Text style={signOff}>Yours sincerely,</Text>
          <Text style={signName}>{secretaryName || 'The Secretary'}</Text>
          <Text style={signOffice}>{secretaryOffice || 'Lodge Secretary'}</Text>
        </Section>
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => `Refund issued — ${d?.eventLabel || brandHeaderLines(d).name || 'the Lodge'}`,
  displayName: 'Waitlist refund',
  previewData: {
    firstName: 'John',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
    totalAmount: '£35.00',
    bookingRef: '0e0fb8f3',
    crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const row = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0', fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
