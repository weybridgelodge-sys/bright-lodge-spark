import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brandHeaderLines } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  name?: string
  secretaryName?: string
  secretaryOffice?: string
  membershipOfficerName?: string
  guideUrl?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({ name, secretaryName, secretaryOffice, membershipOfficerName, guideUrl, crestUrl, lodgeName, lodgeNumber, provinceName }: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  const lodge = brandHeaderLines(id).name || 'the Lodge'
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Great to hear from you — a short guide to {lodge}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandHeader {...id} />

        <Section style={card}>
          <Heading as="h2" style={h2}>Thank you{name ? `, ${name}` : ''}</Heading>
          <Text style={p}>
            Thanks so much for reaching out to {lodge} — it's great to
            hear you're curious about Freemasonry here in Guildford.
          </Text>
          <Text style={p}>
            While you wait to hear from us properly, here's a short guide with a
            bit more about who we are, what a typical evening looks like, and
            what joining actually involves:
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '8px 0 16px' }}>
            {guideUrl && (
              <Button href={guideUrl} style={button}>
                Read the guide
              </Button>
            )}
          </Section>
          <Text style={p}>
            Our membership secretary{membershipOfficerName ? ` ${membershipOfficerName}` : ''} will
            give you a call in the next day or two for a friendly, no-obligation
            chat and to answer any questions you might have.
          </Text>
          <Hr style={hr} />
          <Text style={signOff}>Yours sincerely,</Text>
          <Text style={signName}>{secretaryName || 'The Lodge Secretary'}</Text>
          <Text style={signOffice}>{secretaryOffice || 'Lodge Secretary'}</Text>
          <Hr style={hr} />
          <Text style={small}>
            If you did not submit this enquiry, please ignore this email — no
            further action will be taken.
          </Text>
        </Section>

        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => (d?.name ? `Great to hear from you, ${d.name}!` : 'Great to hear from you!'),
  displayName: 'Enquiry confirmation',
  previewData: { name: 'Jane', secretaryName: 'W Bro. Richard Smith', secretaryOffice: 'Lodge Secretary', membershipOfficerName: 'W Bro. Ben Connolly', guideUrl: 'https://example.org/guide.pdf', crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire', },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px 28px 22px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const small = { color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOff = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', lineHeight: '1.4', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
const button = { backgroundColor: '#1B2A4A', color: '#ffffff', fontSize: '14px', fontFamily: 'Arial, sans-serif', fontWeight: 600, textDecoration: 'none', padding: '12px 24px', borderRadius: '4px', display: 'inline-block', letterSpacing: '0.5px' }
