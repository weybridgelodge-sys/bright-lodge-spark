import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Props {
  yearLabel?: string
  installationDate?: string
  senderName?: string
  senderOffice?: string
  wordUrl?: string
  pdfUrl?: string
  expiresOn?: string
}

const button = { ...brandStyles.link, display: 'inline-block', padding: '10px 18px', border: `1px solid ${BRAND.gold}`, borderRadius: '4px', margin: '4px' }

const Email = ({
  yearLabel = '',
  installationDate = '',
  senderName = '',
  senderOffice = 'Secretary',
  wordUrl = 'https://weybridgelodge.org.uk',
  pdfUrl = 'https://weybridgelodge.org.uk',
  expiresOn = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Weybridge Lodge No. 6787 — Provincial Installation Return ${yearLabel}`}</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={brandStyles.brand}>Weybridge Lodge</Heading>
          <Text style={brandStyles.brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>
        <Heading style={brandStyles.h1}>Provincial Installation Return {yearLabel}</Heading>
        <Text style={brandStyles.body}>Dear Provincial Grand Secretary,</Text>
        <Text style={brandStyles.body}>
          Please find the Provincial Grand Lodge of Surrey Installation Return for Weybridge Lodge No. 6787 for {yearLabel}
          {installationDate ? `, following our Installation Meeting on ${installationDate}` : ''}. It includes the officers, the Secretary's contact details and the lists of Past Masters.
        </Text>
        <Section style={brandStyles.card}>
          <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '6px 0' }}><strong>Lodge:</strong> Weybridge Lodge No. 6787</Text>
          <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '6px 0' }}><strong>Return:</strong> Provincial Installation Return, {yearLabel}</Text>
          {installationDate && (
            <Text style={{ color: BRAND.navy, fontSize: '14px', margin: '6px 0' }}><strong>Installation Meeting:</strong> {installationDate}</Text>
          )}
        </Section>
        <Text style={{ ...brandStyles.body, textAlign: 'center', margin: '22px 0 6px' }}>
          <Link href={wordUrl} style={button}>Download (Word) →</Link>
          <Link href={pdfUrl} style={button}>Download (PDF) →</Link>
        </Text>
        {expiresOn && <Text style={{ ...brandStyles.meta, textAlign: 'center' }}>These download links work until {expiresOn}.</Text>}
        <Text style={brandStyles.body}>If you have any questions, please reply to this email.</Text>
        <Text style={brandStyles.body}>
          Sincerely and fraternally,
          <br />
          {senderName || 'The Secretary'}
          <br />
          {senderOffice}, Weybridge Lodge No. 6787
        </Text>
        <Hr style={brandStyles.hr} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => `Weybridge Lodge No. 6787 — Provincial Installation Return ${d?.yearLabel || ''}`.trim(),
  displayName: 'Provincial Installation Return',
  previewData: { yearLabel: '2026/27', installationDate: '21/10/2026', senderName: 'W Bro. Richard Smith', senderOffice: 'Secretary', wordUrl: 'https://weybridgelodge.org.uk', pdfUrl: 'https://weybridgelodge.org.uk', expiresOn: '30 October 2026' },
} satisfies TemplateEntry
