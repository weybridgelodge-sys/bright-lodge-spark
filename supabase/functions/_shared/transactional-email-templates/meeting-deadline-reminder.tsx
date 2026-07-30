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
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Props {
  meetingDate?: string
  deadlineDate?: string
  bookingUrl?: string
}

const Email = ({
  meetingDate = '',
  deadlineDate = '',
  bookingUrl = 'https://weybridgelodge.org.uk/bookings',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Booking Deadline For Weybridge Meeting Approaching</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img
            src={LOGO_URL}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            alt="Weybridge Lodge crest"
            style={{ margin: '0 auto', display: 'block' }}
          />
          <Heading style={brandStyles.brand}>Weybridge Lodge</Heading>
          <Text style={brandStyles.brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

        <Heading style={brandStyles.h1}>Booking Deadline For Weybridge Meeting Approaching</Heading>

        <Text style={brandStyles.body}>Brethren,</Text>
        <Section style={brandStyles.card}>
          <Text style={highlight}>
            The deadline for our next meeting on {meetingDate} is approaching. Please book your space by{' '}
            {deadlineDate}.
          </Text>
        </Section>

        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={bookingUrl} style={ctaLink}>Book your place →</Link>
        </Text>

        <Hr style={brandStyles.hr} />
        <Text style={confidential}>
          STOP: Read before clicking below
        </Text>
        <Text style={confidential}>
          This is an automated lodge notification, not a personal subscription. Clicking unsubscribe below removes you from all future lodge emails entirely, not just this one. If you are unsure why you received this email, please contact the Lodge Secretary.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Booking Deadline For Weybridge Meeting Approaching',
  displayName: 'Regular meeting — booking deadline reminder',
  previewData: {
    meetingDate: '12th September',
    deadlineDate: '5th September',
    bookingUrl: 'https://weybridgelodge.org.uk/bookings',
  },
} satisfies TemplateEntry

const highlight = {
  color: BRAND.navy,
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '6px 0',
}
const ctaLink = {
  ...brandStyles.link,
  display: 'inline-block',
  padding: '10px 18px',
  border: `1px solid ${BRAND.gold}`,
  borderRadius: '4px',
}
const confidential = {
  color: '#888',
  fontSize: '11px',
  fontStyle: 'italic' as const,
  textAlign: 'center' as const,
  margin: '4px 0',
}
