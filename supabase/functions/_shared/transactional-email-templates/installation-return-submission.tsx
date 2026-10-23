import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, BRAND_GOLD_DARK, brandHeaderLines, brandStyles } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  yearLabel?: string
  installationDate?: string
  senderName?: string
  senderOffice?: string
  url?: string
  expiresOn?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({
  yearLabel = '',
  installationDate = '',
  senderName = '',
  senderOffice = 'Secretary',
  url = '',
  expiresOn = '',
  crestUrl, lodgeName, lodgeNumber, provinceName,
}: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  const title = brandHeaderLines(id).footer
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{[title, `Installation Return ${yearLabel}`].filter(Boolean).join(' — ')}</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <EmailBrandHeader {...id} />
        <Heading style={brandStyles.h1}>Installation Return {yearLabel}</Heading>
        <Text style={brandStyles.body}>Dear Provincial Office,</Text>
        <Text style={brandStyles.body}>
          Please find the Installation Return {title ? `for ${title} ` : ''}for {yearLabel}
          {installationDate ? `, following our Installation Meeting on ${installationDate}` : ''}. It is the official UGLE form, completed from the Lodge's records.
        </Text>
        <Section style={brandStyles.card}>
          <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '6px 0' }}>
            <strong>Lodge:</strong> {title}
          </Text>
          <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '6px 0' }}>
            <strong>Return:</strong> UGLE Installation Return, {yearLabel}
          </Text>
          {installationDate && (
            <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '6px 0' }}>
              <strong>Installation Meeting:</strong> {installationDate}
            </Text>
          )}
        </Section>
        {url && (
        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={url} style={{ ...brandStyles.link, color: BRAND_GOLD_DARK, display: 'inline-block', padding: '10px 18px', border: `1px solid ${BRAND.gold}`, borderRadius: '4px' }}>
            Download the Installation Return (PDF) →
          </Link>
        </Text>
        )}
        {expiresOn && (
          <Text style={{ ...brandStyles.meta, textAlign: 'center' }}>This download link works until {expiresOn}.</Text>
        )}
        <Text style={brandStyles.body}>If you have any questions, please reply to this email.</Text>
        <Text style={brandStyles.body}>
          Sincerely and fraternally,
          <br />
          {senderName || 'The Secretary'}
          <br />
          {[senderOffice, title].filter(Boolean).join(', ')}
        </Text>
        <Hr style={brandStyles.hr} />
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => [brandHeaderLines(d).footer, `Installation Return ${d?.yearLabel || ''}`.trim()].filter(Boolean).join(' — '),
  displayName: 'Installation Return to Province',
  previewData: { yearLabel: '2026/27', installationDate: '21/10/2026', senderName: 'W Bro. Richard Smith', senderOffice: 'Secretary', url: 'https://example.org/return.pdf', expiresOn: '28 October 2026', crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire' },
} satisfies TemplateEntry
