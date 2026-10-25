import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Props {
  quizUrl?: string
  signOffName?: string
  signOffRole?: string | null
  lodgeName?: string
  postcode?: string
}

const Email = ({
  quizUrl = 'https://example.com/quiz',
  signOffName,
  signOffRole,
  lodgeName = 'Your Lodge',
  postcode = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thank you for subscribing — a quick hello from the Lodge</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={{ ...brandStyles.brand, fontFamily: 'Georgia, serif' }}>{lodgeName}</Heading>
        </Section>
        <Heading as="h2" style={{ ...brandStyles.h1, fontFamily: 'Georgia, serif' }}>Thank you for subscribing</Heading>
        <Text style={brandStyles.body}>
          Thank you for signing up — it's lovely to have you with us. From time to time we'll share
          news from the Lodge: stories from our history, the charities we support, and the social
          evenings that are open to friends and family.
        </Text>
        <Text style={brandStyles.body}>
          If you've ever wondered whether joining might suit you, there's a short, friendly quiz on our website.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '20px 0 24px' }}>
          <Button href={quizUrl} style={button}>While you're here, why not try our 2-Minute Suitability Quiz</Button>
        </Section>
        <Text style={brandStyles.body}>With warm wishes,</Text>
        <Text style={{ ...brandStyles.body, fontWeight: 700 as const, color: BRAND.navy, margin: '0 0 2px' }}>
          {signOffName || lodgeName}
        </Text>
        {signOffRole ? <Text style={{ ...brandStyles.body, color: BRAND.muted }}>{signOffRole}</Text> : null}
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
  padding: '14px 22px',
  lineHeight: '20px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { color: BRAND.muted, fontSize: '12px', margin: '8px 0 0', textAlign: 'center' as const }

export const template = {
  component: Email,
  subject: (d: Props) => `Welcome to news from ${d?.lodgeName || 'Your Lodge'}`,
  displayName: 'Newsletter: welcome from the WM',
  previewData: { quizUrl: 'https://example.com/quiz', signOffName: 'W Bro. Example Name', signOffRole: 'Worshipful Master, Example Lodge No. 1', lodgeName: 'Example Lodge No. 1', postcode: 'AB1 2CD' },
} satisfies TemplateEntry
