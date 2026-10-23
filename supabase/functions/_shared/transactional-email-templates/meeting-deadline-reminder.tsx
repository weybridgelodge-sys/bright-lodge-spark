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
import { BRAND, BRAND_GOLD_DARK, brandHeaderLines, brandStyles } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  meetingDate?: string
  deadlineDate?: string
  bookingUrl?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const shortName = (d: Props) => brandHeaderLines(d).name.replace(/\s+Lodge$/i, '')
const titleFor = (d: Props) => {
  const n = shortName(d)
  return `Booking Deadline For ${n ? `${n} ` : ''}Meeting Approaching`
}

const Email = (props: Props) => {
  const { meetingDate = '', deadlineDate = '', bookingUrl = '', crestUrl, lodgeName, lodgeNumber, provinceName } = props
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  const title = titleFor(props)
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <EmailBrandHeader {...id} />

        <Heading style={brandStyles.h1}>{title}</Heading>

        <Text style={brandStyles.body}>Brethren,</Text>
        <Section style={brandStyles.card}>
          <Text style={highlight}>
            The deadline for our next meeting on {meetingDate} is approaching. Please book your space by{' '}
            {deadlineDate}.
          </Text>
        </Section>

        {bookingUrl && (
          <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
            <Link href={bookingUrl} style={ctaLink}>Book your place →</Link>
          </Text>
        )}

        <Hr style={brandStyles.hr} />
        <Text style={confidential}>
          STOP: Read before clicking below
        </Text>
        <Text style={confidential}>
          This is an automated lodge notification, not a personal subscription. Clicking unsubscribe below removes you from all future lodge emails entirely, not just this one. If you are unsure why you received this email, please contact the Lodge Secretary.
        </Text>
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => titleFor(d ?? {}),
  displayName: 'Regular meeting — booking deadline reminder',
  previewData: {
    meetingDate: '12th September',
    deadlineDate: '5th September',
    bookingUrl: 'https://example.org/bookings',
    crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
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
  color: BRAND_GOLD_DARK,
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
