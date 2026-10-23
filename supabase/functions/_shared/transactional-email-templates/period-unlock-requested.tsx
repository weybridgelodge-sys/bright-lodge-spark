import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, brandStyles } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  periodLabel?: string
  reason?: string
  requestedBy?: string
  approveAs?: string
  dashboardUrl?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({
  periodLabel = '',
  reason = '',
  requestedBy = '',
  approveAs = 'Treasurer',
  dashboardUrl = '',
  crestUrl, lodgeName, lodgeNumber, provinceName,
}: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{periodLabel} is awaiting your approval to unlock</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <EmailBrandHeader {...id} />
        <Heading style={brandStyles.h1}>Unlock approval needed</Heading>
        <Text style={brandStyles.body}>
          {requestedBy ? `${requestedBy} has` : 'A request has been made to'} {requestedBy ? 'asked to unlock' : 'unlock'} the
          locked Treasury period <strong>{periodLabel}</strong>. It needs your approval as {approveAs} before it can be reopened.
        </Text>
        {reason && (
          <Section style={brandStyles.card}>
            <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '4px 0' }}><strong>Reason:</strong> {reason}</Text>
          </Section>
        )}
        {dashboardUrl && (
        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={dashboardUrl} style={{ ...brandStyles.link, display: 'inline-block', padding: '10px 18px', border: `1px solid ${BRAND.gold}`, borderRadius: '4px' }}>
            Review on your Dashboard →
          </Link>
        </Text>
        )}
        <Hr style={brandStyles.hr} />
        <Text style={{ color: '#888', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' }}>
          You are receiving this because you currently hold the office of {approveAs}.
        </Text>
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => `Approval needed: unlock ${d?.periodLabel || 'Treasury period'}`,
  displayName: 'Treasury period unlock requested',
  previewData: { periodLabel: 'October 2025', reason: 'Late bank charge to post', requestedBy: 'W Bro. Julien Tidmarsh', approveAs: 'Treasurer & Secretary', dashboardUrl: 'https://example.org/members/dashboard', crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire' },
} satisfies TemplateEntry
