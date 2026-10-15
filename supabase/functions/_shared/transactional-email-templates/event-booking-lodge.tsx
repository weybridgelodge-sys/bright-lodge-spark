import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { card, container, Crest, type EventBookingData, GuestList, guestLine, h1, hr, label, link, main, Row, small } from './event-booking-customer.tsx'

const Email = (d: EventBookingData) => {
  const paid = d.stage === 'paid'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{paid ? `Payment received — ${d.reference}` : `New booking — ${d.bookerName} for ${d.eventTitle}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Crest />
          <Heading style={h1}>{paid ? 'Event payment received' : 'New event booking'}</Heading>
          <Section style={card}>
            <Row label="Event" value={d.eventTitle} />
            <Row label="Reference" value={d.reference} />
            <Row label="Booker" value={d.bookerName} />
            <Row label="Email" value={d.bookerEmail} />
            <Row label="Phone" value={d.bookerPhone} />
            <Row label="Lodge" value={d.lodgeLabel} />
            <Row label="Adults / children" value={`${d.adults ?? 0} / ${d.children ?? 0}`} />
            <Hr style={hr} />
            <GuestList guests={d.guests} />
            {!!d.preOrders?.length && (<><Text style={label}>Pre-orders</Text>{d.preOrders.map((p, i) => <Text key={i} style={guestLine}>{p}</Text>)}</>)}
            <Hr style={hr} />
            {d.cardFee && <Row label="Subtotal" value={d.subtotal} />}
            {d.cardFee && <Row label={d.feeLabel || "Fee"} value={d.cardFee} />}
            <Row label="Total" value={d.total} />
            <Row label="Payment method" value={d.paymentMethod} />
            <Row label="Payment status" value={d.paymentStatus} />
          </Section>
          {d.adminUrl && <Text style={small}>Open in Event Accounts: <Link href={d.adminUrl} style={link}>{d.adminUrl}</Link></Text>}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => (d?.stage === 'paid' ? `Payment received — ${d?.reference} (${d?.eventTitle})` : `New booking — ${d?.bookerName} for ${d?.eventTitle} (${d?.reference})`),
  displayName: 'Event booking (lodge notification)',
  previewData: {
    stage: 'booked', eventTitle: 'Joint Christmas Party at Guildford Masonic Centre', reference: 'XMAS26-0001', bookerName: 'John Smith',
    bookerEmail: 'john@example.com', lodgeLabel: 'Astolat', adults: 1, children: 1,
    guests: [{ name: 'John Smith' }, { name: 'Amy Smith', isChild: true, age: 8, dietary: 'Nut allergy' }],
    total: '£0.00', paymentMethod: 'Card', paymentStatus: 'Paid',
  },
} satisfies TemplateEntry
