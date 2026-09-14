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

interface ReturnRow {
  typeLabel: string
  masonicYear: string
  dateDue: string
  daysUntil?: number
  showPerson?: boolean
  person?: string | null
  personLabel?: string | null
}

interface Props {
  overdue?: ReturnRow[]
  dueSoon?: ReturnRow[]
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

const Rows = ({ rows, tone }: { rows: ReturnRow[]; tone: 'red' | 'amber' }) => (
  <Section style={tone === 'red' ? overdueCard : card}>
    {rows.map((r, i) => (
      <div
        key={i}
        style={{ padding: '10px 0', borderBottom: i === rows.length - 1 ? 'none' : '1px solid #e8e3d3' }}
      >
        <Text style={itemName}>{r.typeLabel}</Text>
        {r.showPerson !== false && (
          <Text style={flagSoft}>
            • {r.personLabel || 'Candidate'}: {(r.person || '').trim()}
          </Text>
        )}
        <Text style={flagSoft}>• Masonic year {r.masonicYear}</Text>
        <Text style={tone === 'red' ? flagRed : flagAmber}>
          • Due {fmt(r.dateDue)}
          {typeof r.daysUntil === 'number'
            ? r.daysUntil < 0
              ? ` — ${Math.abs(r.daysUntil)} day${Math.abs(r.daysUntil) === 1 ? '' : 's'} overdue`
              : r.daysUntil === 0
                ? ' — due today'
                : ` — in ${r.daysUntil} day${r.daysUntil === 1 ? '' : 's'}`
            : ''}
        </Text>
      </div>
    ))}
  </Section>
)

const Email = ({ overdue = [], dueSoon = [], reportDate, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {overdue.length > 0
        ? `${overdue.length} return${overdue.length === 1 ? '' : 's'} overdue · ${dueSoon.length} due soon`
        : `${dueSoon.length} return${dueSoon.length === 1 ? '' : 's'} due within 14 days`}
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

        <Heading style={h1}>Secretary — returns &amp; certificates reminder</Heading>
        <Text style={meta}>
          {reportDate ? `Report for ${reportDate}` : ''} · {overdue.length} overdue · {dueSoon.length} due soon
        </Text>

        {overdue.length > 0 && (
          <>
            <Heading style={h2}>Overdue</Heading>
            <Text style={intro}>
              These returns are still in draft and their due date has already passed.
            </Text>
            <Rows rows={overdue} tone="red" />
          </>
        )}

        {dueSoon.length > 0 && (
          <>
            <Heading style={h2}>Due soon</Heading>
            <Text style={intro}>
              These draft returns fall due within the next 14 days.
            </Text>
            <Rows rows={dueSoon} tone="amber" />
          </>
        )}

        {portalUrl && (
          <Text style={footerText}>
            Open the <Link href={portalUrl} style={linkStyle}>Returns &amp; Certificates register</Link> to
            update or submit them.
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
    const o = Array.isArray(d?.overdue) ? d.overdue.length : 0
    const s = Array.isArray(d?.dueSoon) ? d.dueSoon.length : 0
    if (o > 0 && s > 0) return `Secretary — ${o} return${o === 1 ? '' : 's'} overdue · ${s} due soon`
    if (o > 0) return `Secretary — ${o} return${o === 1 ? '' : 's'} overdue`
    return `Secretary — ${s} return${s === 1 ? '' : 's'} due soon`
  },
  displayName: 'Secretary returns reminder',
  previewData: {
    reportDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    portalUrl: 'https://weybridgelodge.org.uk/members/admin/secretary-returns',
    overdue: [
      { typeLabel: 'Form P', masonicYear: '2025/2026', dateDue: '2026-09-01', person: 'John Smith', personLabel: 'Candidate' },
    ],
    dueSoon: [
      { typeLabel: 'Installation Return', masonicYear: '2026/2027', dateDue: '2026-09-24', person: null, personLabel: 'Member' },
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
const overdueCard = { ...(brandStyles.card as Record<string, unknown>), borderLeft: '4px solid #b91c1c' }
const itemName = { color: BRAND.navy, fontSize: '15px', fontWeight: 'bold' as const, margin: '4px 0' }
const flagRed = { color: '#b91c1c', fontSize: '13px', margin: '2px 0' }
const flagAmber = { color: '#b45309', fontSize: '13px', margin: '2px 0' }
const flagSoft = { color: BRAND.navy, fontSize: '13px', margin: '2px 0' }
const linkStyle = brandStyles.link
const footerText = brandStyles.footerText
const hr = brandStyles.hr
const confidential = { color: '#888', fontSize: '11px', fontStyle: 'italic' as const, textAlign: 'center' as const, margin: '4px 0' }
const brand = brandStyles.brand
const brandSub = brandStyles.brandSub
