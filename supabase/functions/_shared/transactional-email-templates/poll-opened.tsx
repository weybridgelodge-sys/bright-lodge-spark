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
  question?: string
  options?: string[]
  dashboardUrl?: string
  closesAt?: string | null
  liveResults?: boolean
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const fmt = (s?: string | null) => {
  if (!s) return ''
  try {
    return new Date(s).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return s
  }
}

const Email = ({
  question = '',
  options = [],
  dashboardUrl = '',
  closesAt,
  liveResults,
  crestUrl, lodgeName, lodgeNumber, provinceName,
}: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  const name = brandHeaderLines(id).name
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A new poll is open: {question}</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <EmailBrandHeader {...id} />

        <Heading style={brandStyles.h1}>A new poll is open</Heading>
        <Text style={brandStyles.meta}>
          {closesAt ? `Voting closes ${fmt(closesAt)}` : 'Open until closed by the Secretary'}
          {' · '}
          {liveResults ? 'Live results visible to members' : 'Results revealed on close'}
        </Text>

        <Text style={brandStyles.body}>Brethren,</Text>
        <Text style={brandStyles.body}>
          A new poll has been opened for the members of {name || 'the Lodge'}. Your view is invited on the
          question below.
        </Text>

        <Section style={brandStyles.card}>
          <Text style={questionStyle}>{question}</Text>
          {options.length > 0 && (
            <div style={{ margin: '4px 0 6px' }}>
              {options.map((opt, i) => (
                <Text key={i} style={optionStyle}>
                  • {opt}
                </Text>
              ))}
            </div>
          )}
        </Section>

        {dashboardUrl && (
          <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
            <Link href={dashboardUrl} style={ctaLink}>Cast your vote on the Dashboard →</Link>
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
  subject: (d: any) => {
    const q = (d?.question || '').toString().trim()
    return q ? `New poll: ${q}` : 'A new lodge poll is open'
  },
  displayName: 'Poll opened — member notification',
  previewData: {
    question: 'Which charity should we support next?',
    options: ['Surrey 2030 Festival', 'SANDS', 'The TLC Trust'],
    dashboardUrl: 'https://example.org/members',
    closesAt: null,
    liveResults: true,
    crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
  },
} satisfies TemplateEntry

const questionStyle = {
  color: BRAND.navy,
  fontSize: '16px',
  fontWeight: 'bold' as const,
  margin: '6px 0 10px',
}
const optionStyle = {
  color: BRAND.body,
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '2px 0',
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
