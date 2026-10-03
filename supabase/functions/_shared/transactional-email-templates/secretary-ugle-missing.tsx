import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, LODGE_NAME, LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, brandStyles } from './_brand.ts'

interface Entry { name: string; initiationLabel: string; url: string }
interface Props { members?: Entry[]; adminUrl?: string }

const Email = ({ members = [], adminUrl = 'https://weybridgelodge.org.uk/members/admin' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {`${members.length} member${members.length === 1 ? '' : 's'} still need a Grand Lodge number`}
    </Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.crestWrap}>
          <Img src={LOGO_URL} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="Weybridge Lodge crest"
            style={{ margin: '0 auto', display: 'block' }} />
          <Heading style={brandStyles.brand}>{LODGE_NAME}</Heading>
          <Text style={brandStyles.brandSub}>Province of Surrey</Text>
        </Section>

        <Heading style={brandStyles.h1}>Grand Lodge numbers still to add</Heading>
        <Text style={brandStyles.body}>
          These initiated members don't have a Grand Lodge Reference Number recorded yet — usually
          because Form P hasn't come back from Province. Oldest initiation first.
        </Text>

        <Section style={brandStyles.card}>
          {members.map((m, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i === members.length - 1 ? 'none' : `1px solid ${BRAND.hairline}` }}>
              <Text style={name}>
                <Link href={m.url} style={{ color: BRAND.navy, textDecoration: 'underline' }}>{m.name}</Link>
              </Text>
              <Text style={meta}>Initiated {m.initiationLabel}</Text>
            </div>
          ))}
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={adminUrl} style={button}>Add Grand Lodge numbers</Button>
        </Section>

        <Hr style={brandStyles.hr} />
        <Text style={foot}>Automated monthly reminder for the Lodge Secretary.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: () => `Grand Lodge numbers still to add — ${LODGE_NAME}`,
  displayName: 'Secretary — missing Grand Lodge numbers',
  previewData: {
    adminUrl: 'https://weybridgelodge.org.uk/members/admin',
    members: [
      { name: 'Bro. John Smith', initiationLabel: '11 February 2026', url: 'https://weybridgelodge.org.uk/members/admin' },
      { name: 'Bro. Peter Jones', initiationLabel: '13 May 2026', url: 'https://weybridgelodge.org.uk/members/admin' },
    ],
  },
} satisfies TemplateEntry

const name = { color: BRAND.navy, fontSize: '15px', fontWeight: 'bold' as const, margin: '2px 0' }
const meta = { color: BRAND.muted, fontSize: '13px', margin: '2px 0' }
const button = {
  backgroundColor: BRAND.navy, color: '#ffffff', fontSize: '15px', fontWeight: 600 as const,
  borderRadius: '4px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block',
}
const foot = { color: '#888', fontSize: '11px', textAlign: 'center' as const, margin: '4px 0' }
