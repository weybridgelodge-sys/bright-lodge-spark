import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, brandStyles } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

// Batch C pilot: shared brand header/footer; crest and identity passed in by the sender (Unit Setup / lodge record).
interface Props {
  fullName?: string
  email?: string
  motherLodge?: string
  submittedAt?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({ fullName, email, motherLodge, submittedAt, crestUrl, lodgeName, lodgeNumber, provinceName }: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Members portal access request from {fullName || 'a visitor'}</Preview>
      <Body style={brandStyles.main}>
        <Container style={brandStyles.container}>
          <EmailBrandHeader {...id} />
          <Heading as="h2" style={{ ...brandStyles.h1, fontFamily: 'Georgia, "Times New Roman", serif' }}>Portal access request</Heading>
          <Text style={brandStyles.body}>Someone has asked for access to the members portal. No account has been created.</Text>
          <Text style={brandStyles.body}><strong style={{ color: BRAND.navy }}>Name:</strong> {fullName}</Text>
          <Text style={brandStyles.body}><strong style={{ color: BRAND.navy }}>Email:</strong> {email}</Text>
          <Text style={brandStyles.body}><strong style={{ color: BRAND.navy }}>Mother Lodge:</strong> {motherLodge}</Text>
          <Text style={brandStyles.body}>
            If this is a member, add or invite him from Members Admin. The invite email lets him sign in.
          </Text>
          <EmailBrandFooter {...id} note={submittedAt ? `Received ${submittedAt}` : undefined} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `Portal access request: ${d?.fullName || 'new request'}`,
  displayName: 'Portal access request (to Secretary)',
  previewData: {
    fullName: 'Bro. John Smith', email: 'john@example.com', motherLodge: 'Example Lodge No. 1234', submittedAt: '19/10/2026, 18:00:00',
    crestUrl: 'https://placehold.co/192x192/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
  },
} satisfies TemplateEntry
