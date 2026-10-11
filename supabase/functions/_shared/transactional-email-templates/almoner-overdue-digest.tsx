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
  checkIn?: string | null
  /** System-logged disengagement entries added since the last summary. */
  systemLogged?: string[]
  portalUrl: string
}

interface Celebration {
  name: string
  type: 'birthday' | 'anniversary'
  years?: number
  message: string
  whatsappUrl: string
  date?: string
  upcoming?: boolean
}

interface Props {
  members?: FlaggedMember[]
  celebrations?: Celebration[]
  reportDate?: string
  sinceDate?: string
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
const fmtDay = (s?: string) => {
  if (!s) return ''
  try {
    return new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
  } catch {
    return s
  }
}

const Email = ({ members = [], celebrations = [], reportDate, sinceDate, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {`${members.length} member${members.length === 1 ? '' : 's'} to review this week${celebrations.length ? ` · ${celebrations.length} dates to mark` : ''}`}
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


        <Heading style={h1}>Almoner — weekly welfare summary</Heading>
        <Text style={meta}>
          {reportDate ? `Week to ${reportDate}` : ''}
          {sinceDate ? ` · new since ${sinceDate}` : ''} · {members.length} member
          {members.length === 1 ? '' : 's'} to review
        </Text>

        {celebrations.length > 0 && (
          <>
            <Heading style={h2}>Memorable dates</Heading>
            <Text style={intro}>
              Since the last summary and the coming week. Tap a link to open WhatsApp with the
              message ready to send — just pick the Lodge group.
            </Text>
            <Section style={celebrationCard}>
              {celebrations.map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 0',
                    borderBottom: i === celebrations.length - 1 ? 'none' : '1px solid #e8e3d3',
                  }}
                >
                  <Text style={memberName}>
                    {c.type === 'birthday' ? '🎉 ' : '🎓 '}
                    {c.date ? `${fmtDay(c.date)}${c.upcoming ? ' (coming up)' : ''} — ` : ''}
                    {c.name}
                    {typeof c.years === 'number'
                      ? c.type === 'birthday'
                        ? ` — ${c.years}`
                        : ` — ${c.years} year${c.years === 1 ? '' : 's'} a Freemason`
                      : ''}
                  </Text>
                  <Text style={celebrationMessage}>{c.message}</Text>
                  <Text style={{ margin: '6px 0 0' }}>
                    <Link href={c.whatsappUrl} style={linkStyle}>
                      Send on WhatsApp →
                    </Link>
                  </Text>
                </div>
              ))}
            </Section>
          </>
        )}

        {members.length > 0 && (
          <>
            <Heading style={h2}>Still open / new this week</Heading>
            <Text style={intro}>
              Follow-ups and attendance flags are as they stand this morning — anything you have
              already dealt with is left out. New system entries are those logged since the last
              summary. Please review each record in the Almoner Portal.
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
                  {m.checkIn && <Text style={flagSoft}>• {m.checkIn}</Text>}
                  {(m.systemLogged ?? []).map((r, j) => (
                    <Text key={j} style={flagAmber}>• New system log entry — {r.replace(/^System: /, '')}</Text>
                  ))}
            </Section>
          </>
        )}


        {portalUrl && (
          <Text style={footerText}>
            View the full{' '}
            <Link href={portalUrl} style={linkStyle}>Almoner Portal</Link>.
          </Text>
        )}

        <Hr style={hr} />
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
  subject: (d: any) => {
    const n = Array.isArray(d?.members) ? d.members.length : 0
    const c = Array.isArray(d?.celebrations) ? d.celebrations.length : 0
    return `Almoner weekly summary — ${n} member${n === 1 ? '' : 's'} to review${c ? ` · ${c} dates to mark` : ''}`
  },
  displayName: 'Almoner weekly welfare summary',
  previewData: {
    reportDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    sinceDate: '05 Oct 2026',
    portalUrl: 'https://weybridgelodge.org.uk/members/almoner',
    celebrations: [
      {
        name: 'W Bro. Kevin Brennan',
        type: 'birthday',
        years: 70,
        date: '2026-10-08',
        message: 'Wishing our dear Brother Kevin a very happy 70th birthday today! 🎉',
        whatsappUrl:
          'https://wa.me/?text=Wishing%20our%20dear%20Brother%20Kevin%20a%20very%20happy%2070th%20birthday%20today!%20%F0%9F%8E%89',
      },
      {
        name: 'W Bro. Kenneth Holdsworth',
        type: 'anniversary',
        years: 14,
        date: '2026-10-15',
        upcoming: true,
        message: "Let's all congratulate our dear Brother Kenneth on 14 years as a Freemason today!",
        whatsappUrl:
          "https://wa.me/?text=Let's%20all%20congratulate%20our%20dear%20Brother%20Kenneth%20on%2014%20years%20as%20a%20Freemason%20today!",
      },
    ],
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
        checkIn: 'Not at the last 2 meetings — worth a call?',
        portalUrl: 'https://weybridgelodge.org.uk/members/almoner',
      },
    ],
  },
} satisfies TemplateEntry

const main = brandStyles.main
const container = brandStyles.container
const h1 = brandStyles.h1
const h2 = {
  color: BRAND.navy,
  fontSize: '17px',
  fontWeight: 'bold' as const,
  margin: '24px 0 6px',
}
const meta = brandStyles.meta
const intro = brandStyles.body
const card = brandStyles.card
const celebrationCard = { ...(brandStyles.card as Record<string, unknown>), borderLeft: `4px solid ${BRAND.gold}` }
const celebrationMessage = { color: BRAND.navy, fontSize: '14px', margin: '2px 0', fontStyle: 'italic' as const }
const memberName = { color: BRAND.navy, fontSize: '15px', fontWeight: 'bold' as const, margin: '4px 0' }
const flagRed = { color: '#b91c1c', fontSize: '13px', margin: '2px 0' }
const flagAmber = { color: '#b45309', fontSize: '13px', margin: '2px 0' }
const flagSoft = { color: BRAND.navy, fontSize: '13px', margin: '2px 0' }
const linkStyle = brandStyles.link
const footerText = brandStyles.footerText
const hr = brandStyles.hr
const confidential = { color: '#888', fontSize: '11px', fontStyle: 'italic' as const, textAlign: 'center' as const, margin: '4px 0' }
const brand = brandStyles.brand
const brandSub = brandStyles.brandSub


