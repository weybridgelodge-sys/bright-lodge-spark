import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Props {
  confirmUrl?: string
  lodgeName?: string
  postcode?: string
}

const Email = ({ confirmUrl, lodgeName = 'Your Lodge', postcode = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>One click to confirm your subscription</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={{ ...brandStyles.brand, fontFamily: 'Georgia, serif' }}>{lodgeName}</Heading>
        </Section>
        <Heading as="h2" style={{ ...brandStyles.h1, fontFamily: 'Georgia, serif' }}>Please confirm your subscription</Heading>
        <Text style={brandStyles.body}>Please confirm you'd like to receive news from {lodgeName}.</Text>
        <Section style={{ textAlign: 'center' as const, margin: '20px 0 24px' }}>
          <Button href={confirmUrl} style={button}>Confirm my subscription</Button>
        </Section>
        <Text style={brandStyles.body}>If you didn't ask for this, ignore this email.</Text>
        <Hr style={brandStyles.hr} />
        <Text style={footer}>{lodgeName} · Guildford, Surrey {postcode}</Text>
      </Container>
    </Body>
  </Html>
)

const button = {
  backgroundColor: BRAND.navy,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '4px',
  padding: '14px 28px',
  lineHeight: '20px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { color: BRAND.muted, fontSize: '12px', margin: '8px 0 0', textAlign: 'center' as const }

export const template = {
  component: Email,
  subject: (d: Props) => `Please confirm your subscription to ${d?.lodgeName || 'Your Lodge'}`,
  displayName: 'Newsletter: confirm subscription',
  previewData: { confirmUrl: 'https://example.com/newsletter/confirm?token=preview', lodgeName: 'Example Lodge No. 1', postcode: 'AB1 2CD' },
} satisfies TemplateEntry
