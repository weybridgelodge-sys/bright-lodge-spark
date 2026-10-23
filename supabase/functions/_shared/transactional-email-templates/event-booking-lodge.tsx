import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { card, container, Crest, Footer, type EventBookingData, GuestList, guestLine, h1, hr, label, link, main, Row, small } from './event-booking-customer.tsx'

const Email = (d: EventBookingData) => {
  const paid = d.stage === 'paid' || d.stage === 'deposit' || d.stage === 'balance_paid'
  const headline = d.stage === 'deposit' ? 'Event deposit received' : d.stage === 'balance_paid' ? 'Event balance received' : 'Event payment received'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{paid ? `Payment received — ${d.reference}` : `New booking — ${d.bookerName} for ${d.eventTitle}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Crest d={d} />
          <Heading style={h1}>{paid ? headline : 'New event booking'}</Heading>
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
            {d.deposit && <Row label="Paid so far" value={d.amountPaid} />}
            {d.deposit && d.balanceDue && <Row label="Balance due" value={`${d.balanceDue}${d.balanceDueDate ? ` by ${d.balanceDueDate}` : ''}`} />}
            <Row label="Payment method" value={d.paymentMethod} />
            <Row label="Payment status" value={d.paymentStatus} />
          </Section>
          {d.adminUrl && <Text style={small}>Open in Event Accounts: <Link href={d.adminUrl} style={link}>{d.adminUrl}</Link></Text>}
          <Footer d={d} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => (d?.stage === 'deposit' ? `Deposit received — ${d?.reference} (${d?.eventTitle})` : d?.stage === 'balance_paid' ? `Balance received — ${d?.reference} (${d?.eventTitle})` : d?.stage === 'paid' ? `Payment received — ${d?.reference} (${d?.eventTitle})` : `New booking — ${d?.bookerName} for ${d?.eventTitle} (${d?.reference})`),
  displayName: 'Event booking (lodge notification)',
  previewData: {
    stage: 'booked', eventTitle: 'Joint Christmas Party at Example Hall', reference: 'XMAS26-0001', bookerName: 'John Smith',
    bookerEmail: 'john@example.com', lodgeLabel: 'Astolat', adults: 1, children: 1,
    guests: [{ name: 'John Smith' }, { name: 'Amy Smith', isChild: true, age: 8, dietary: 'Nut allergy' }],
    total: '£0.00', paymentMethod: 'Card', paymentStatus: 'Paid',
    crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
  },
} satisfies TemplateEntry
