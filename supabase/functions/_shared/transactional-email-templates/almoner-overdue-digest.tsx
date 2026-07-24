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

interface FlaggedMember {
  name: string
  overdueFollowUp?: string | null // ISO date
  missedMeetings?: boolean
  portalUrl: string
}

interface Props {
  members?: FlaggedMember[]
  reportDate?: string
  portalUrl?: string
}

const fmt = (s?: string | null) => {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return s
  }
}

const Email = ({ members = [], reportDate, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {members.length} member{members.length === 1 ? '' : 's'} need Almoner follow-up
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandStyles.crestWrap}>
          <Img
            src={LOGO_URL}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            alt="Weybridge Lodge crest"
            style={{ margin: '0 auto', display: 'block' }}
          />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>


        <Heading style={h1}>Almoner — daily welfare digest</Heading>
        <Text style={meta}>
          {reportDate ? `Report for ${reportDate}` : ''} · {members.length} member
          {members.length === 1 ? '' : 's'} flagged
        </Text>

        <Text style={intro}>
          The following members require your attention. Please review each record in the Almoner
          Portal and log a contact where appropriate.
        </Text>

        <Section style={card}>
          {members.map((m, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i === members.length - 1 ? 'none' : '1px solid #e8e3d3' }}>
              <Text style={memberName}>{m.name}</Text>
              {m.overdueFollowUp && (
                <Text style={flagRed}>• Follow-up overdue since {fmt(m.overdueFollowUp)}</Text>
              )}
              {m.missedMeetings && (
                <Text style={flagAmber}>• Missed the last 2 meetings</Text>
              )}
              <Text style={{ margin: '6px 0 0' }}>
                <Link href={m.portalUrl} style={linkStyle}>Open record →</Link>
              </Text>
            </div>
          ))}
        </Section>

        {portalUrl && (
          <Text style={footerText}>
            View the full{' '}
            <Link href={portalUrl} style={linkStyle}>Almoner Portal</Link>.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={confidential}>
          Confidential — for the Almoner and Worshipful Master only.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => {
    const n = Array.isArray(d?.members) ? d.members.length : 0
    return `Almoner digest — ${n} member${n === 1 ? '' : 's'} need follow-up`
  },
  displayName: 'Almoner overdue follow-up digest',
  previewData: {
    reportDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    portalUrl: 'https://weybridgelodge.org.uk/members/almoner',
    members: [
      {
        name: 'W Bro. John Smith',
        overdueFollowUp: '2026-07-10',
        missedMeetings: false,
        portalUrl: 'https://weybridgelodge.org.uk/members/almoner',
      },
      {
        name: 'Bro. Peter Jones',
        overdueFollowUp: null,
        missedMeetings: true,
        portalUrl: 'https://weybridgelodge.org.uk/members/almoner',
      },
    ],
  },
} satisfies TemplateEntry

const main = brandStyles.main
const container = brandStyles.container
const h1 = brandStyles.h1
const meta = brandStyles.meta
const intro = brandStyles.body
const card = brandStyles.card
const memberName = { color: BRAND.navy, fontSize: '15px', fontWeight: 'bold' as const, margin: '4px 0' }
const flagRed = { color: '#b91c1c', fontSize: '13px', margin: '2px 0' }
const flagAmber = { color: '#b45309', fontSize: '13px', margin: '2px 0' }
const linkStyle = brandStyles.link
const footerText = brandStyles.footerText
const hr = brandStyles.hr
const confidential = { color: '#888', fontSize: '11px', fontStyle: 'italic' as const, textAlign: 'center' as const, margin: 0 }
const brand = brandStyles.brand
const brandSub = brandStyles.brandSub

