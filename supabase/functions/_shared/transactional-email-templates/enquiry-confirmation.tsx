import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH } from './_brand.ts'

interface Props {
  name?: string
  secretaryName?: string
  secretaryOffice?: string
}

const Email = ({ name, secretaryName, secretaryOffice }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thank you for your enquiry to Weybridge Lodge No. 6787</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src={LOGO_URL}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            alt="Weybridge Lodge crest"
            style={logo}
          />
          <Heading style={brand}>Weybridge Lodge</Heading>
          <Text style={brandSub}>No. 6787 — Province of Surrey</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Thank you{name ? `, ${name}` : ''}</Heading>
          <Text style={p}>
            We have received your enquiry about joining Weybridge Lodge and one
            of our members will be in touch with you personally within a few
            days.
          </Text>
          <Text style={p}>
            In the meantime, you are welcome to read more about what to expect
            on your first visit and about Freemasonry in general on our
            website.
          </Text>
          <Hr style={hr} />
          <Text style={signOff}>Yours sincerely,</Text>
          <Text style={signName}>{secretaryName || 'The Secretary'}</Text>
          <Text style={signOffice}>{secretaryOffice || 'Lodge Secretary'}</Text>
          <Hr style={hr} />
          <Text style={small}>
            If you did not submit this enquiry, please ignore this email — no
            further action will be taken.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Weybridge Lodge No. 6787 · Consecrated 1949 · Guildford, Surrey
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Thank you for your enquiry — Weybridge Lodge',
  displayName: 'Enquiry confirmation',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const header = { textAlign: 'center' as const, padding: '16px 0 24px' }
const logo = { margin: '0 auto 12px', display: 'block' }
const brand = { color: '#1B2A4A', fontSize: '28px', margin: 0, letterSpacing: '0.5px' }
const brandSub = { color: '#C9A432', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px 28px 22px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const small = { color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0, fontFamily: 'Arial, sans-serif' }
const footer = { textAlign: 'center' as const, padding: '20px 0' }
const footerText = { color: '#888', fontSize: '11px', margin: 0, fontFamily: 'Arial, sans-serif' }
