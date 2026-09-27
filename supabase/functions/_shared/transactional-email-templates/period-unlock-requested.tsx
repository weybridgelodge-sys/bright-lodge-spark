import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Props {
  periodLabel?: string
  reason?: string
  requestedBy?: string
  approveAs?: string
  dashboardUrl?: string
}

const Email = ({
  periodLabel = '',
  reason = '',
  requestedBy = '',
  approveAs = 'Treasurer',
  dashboardUrl = 'https://weybridgelodge.org.uk/members/dashboard',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{periodLabel} is awaiting your approval to unlock</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={brandStyles.brand}>Weybridge Lodge</Heading>
          <Text style={brandStyles.brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

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
        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={dashboardUrl} style={{ ...brandStyles.link, display: 'inline-block', padding: '10px 18px', border: `1px solid ${BRAND.gold}`, borderRadius: '4px' }}>
            Review on your Dashboard →
          </Link>
        </Text>
        <Hr style={brandStyles.hr} />
        <Text style={{ color: '#888', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' }}>
          You are receiving this because you currently hold the office of {approveAs}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => `Approval needed: unlock ${d?.periodLabel || 'Treasury period'}`,
  displayName: 'Treasury period unlock requested',
  previewData: { periodLabel: 'October 2025', reason: 'Late bank charge to post', requestedBy: 'W Bro. Julien Tidmarsh', approveAs: 'Treasurer & Secretary' },
} satisfies TemplateEntry
