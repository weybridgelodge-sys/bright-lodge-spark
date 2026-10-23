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
  bookingRef?: string
  secretaryName?: string
  secretaryOffice?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({ firstName, eventLabel, eventDate, bookingRef, secretaryName, secretaryOffice, crestUrl, lodgeName, lodgeNumber, provinceName, }: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Good news — a place has opened up for {eventLabel || 'your event'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandHeader {...id} />
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
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => `A place has opened up — ${d?.eventLabel || brandHeaderLines(d).name || 'the Lodge'}`,
  displayName: 'Waitlist promoted',
  previewData: {
    firstName: 'John',
    eventLabel: 'Regular Meeting & Festive Board',
    eventDate: 'Thursday 8 January 2026',
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
