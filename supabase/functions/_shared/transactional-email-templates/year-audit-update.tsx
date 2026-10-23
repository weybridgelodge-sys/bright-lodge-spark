import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, brandStyles } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  kind?: 'review_needed' | 'query' | 'approved'
  yearLabel?: string
  yearEnd?: string
  round?: number
  actor?: string
  note?: string
  office?: string
  url?: string
}

const HEAD = { review_needed: 'Accounts awaiting your review', query: 'Audit query raised', approved: 'Accounts approved — ready to close' }

const Email = ({ kind = 'review_needed', yearLabel = '', yearEnd = '', round = 1, actor = '', note = '', office = 'Auditor', url = '', crestUrl, lodgeName, lodgeNumber, provinceName }: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${yearLabel}: ${HEAD[kind]}`}</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <EmailBrandHeader {...id} />
        <Heading style={brandStyles.h1}>{HEAD[kind]}</Heading>
        {kind === 'review_needed' && (
          <Text style={brandStyles.body}>
            {actor ? `${actor} has` : 'The Treasurer has'} submitted the {yearLabel} accounts (year ended {yearEnd}) for audit review
            {round > 1 ? ` — resubmission, round ${round}` : ''}. Please examine the submitted figures and either confirm them or raise a query.
          </Text>
        )}
        {kind === 'query' && (
          <Text style={brandStyles.body}>
            {actor || 'An auditor'} has raised a query on the {yearLabel} accounts (round {round}). Please review, correct as needed and resubmit.
          </Text>
        )}
        {kind === 'approved' && (
          <Text style={brandStyles.body}>
            Both auditors have confirmed the {yearLabel} accounts (round {round}). You can now post the closing journal from the Year End tab.
          </Text>
        )}
        {note && (
          <Section style={brandStyles.card}>
            <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '4px 0' }}><strong>Query:</strong> {note}</Text>
          </Section>
        )}
        {url && (
        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={url} style={{ ...brandStyles.link, display: 'inline-block', padding: '10px 18px', border: `1px solid ${BRAND.gold}`, borderRadius: '4px' }}>
            {kind === 'review_needed' ? 'Review on your Dashboard →' : 'Open Year End →'}
          </Link>
        </Text>
        )}
        <Hr style={brandStyles.hr} />
        <Text style={{ color: '#888', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' }}>
          You are receiving this because you currently hold the office of {office}.
        </Text>
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => `${d?.yearLabel || 'Year end'}: ${HEAD[(d?.kind as keyof typeof HEAD) || 'review_needed']}`,
  displayName: 'Year end audit sign-off',
  previewData: { kind: 'query', yearLabel: 'FY 2025/26', yearEnd: '30 September 2026', round: 1, actor: 'W Bro. A Auditor', note: 'Please explain the 1100 balance.', office: 'Treasurer', url: 'https://example.org/members/admin/treasurer', crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire' },
} satisfies TemplateEntry
