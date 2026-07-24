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
  question?: string
  options?: string[]
  dashboardUrl?: string
  closesAt?: string | null
  liveResults?: boolean
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
  dashboardUrl = 'https://weybridgelodge.org.uk/members/dashboard',
  closesAt,
  liveResults,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A new poll is open: {question}</Preview>
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

        <Heading style={brandStyles.h1}>A new poll is open</Heading>
        <Text style={brandStyles.meta}>
          {closesAt ? `Voting closes ${fmt(closesAt)}` : 'Open until closed by the Secretary'}
          {' · '}
          {liveResults ? 'Live results visible to members' : 'Results revealed on close'}
        </Text>

        <Text style={brandStyles.body}>Brethren,</Text>
        <Text style={brandStyles.body}>
          A new poll has been opened for the members of Weybridge Lodge. Your view is invited on the
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

        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={dashboardUrl} style={ctaLink}>Cast your vote on the Dashboard →</Link>
        </Text>

        <Hr style={brandStyles.hr} />
        <Text style={brandStyles.footerText}>
          You are receiving this because you are an active member of Weybridge Lodge No. 6787.
        </Text>
      </Container>
    </Body>
  </Html>
)

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
    dashboardUrl: 'https://weybridgelodge.org.uk/members/dashboard',
    closesAt: null,
    liveResults: true,
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
  display: 'inline-block',
  padding: '10px 18px',
  border: `1px solid ${BRAND.gold}`,
  borderRadius: '4px',
}
