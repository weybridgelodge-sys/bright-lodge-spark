import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Props {
  fullName?: string
  email?: string
  motherLodge?: string
  submittedAt?: string
  lodgeName?: string
}

const Email = ({ fullName, email, motherLodge, submittedAt, lodgeName = 'Weybridge Lodge No. 6787' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Members portal access request from {fullName || 'a visitor'}</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest" style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={{ ...brandStyles.brand, fontFamily: 'Georgia, serif' }}>{lodgeName}</Heading>
        </Section>
        <Heading as="h2" style={{ ...brandStyles.h1, fontFamily: 'Georgia, serif' }}>Portal access request</Heading>
        <Text style={brandStyles.body}>Someone has asked for access to the members portal. No account has been created.</Text>
        <Text style={brandStyles.body}><strong>Name:</strong> {fullName}</Text>
        <Text style={brandStyles.body}><strong>Email:</strong> {email}</Text>
        <Text style={brandStyles.body}><strong>Mother Lodge:</strong> {motherLodge}</Text>
        <Text style={brandStyles.body}>
          If this is a member, add or invite him from Members Admin. The invite email lets him sign in.
        </Text>
        <Hr style={brandStyles.hr} />
        <Text style={{ color: BRAND.muted, fontSize: '12px', textAlign: 'center' as const }}>Received {submittedAt}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Portal access request: ${d?.fullName || 'new request'}`,
  displayName: 'Portal access request (to Secretary)',
  previewData: { fullName: 'Bro. John Smith', email: 'john@example.com', motherLodge: 'Example Lodge No. 1234', submittedAt: '19/10/2026, 18:00:00' },
} satisfies TemplateEntry
