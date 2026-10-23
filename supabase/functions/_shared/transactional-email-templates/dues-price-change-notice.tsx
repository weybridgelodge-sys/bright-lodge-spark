import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brandHeaderLines } from './_brand.ts'
import { EmailBrandFooter, EmailBrandHeader } from './_brandHeader.tsx'

interface Props {
  firstName?: string
  oldAnnual?: string
  newAnnual?: string
  newMonthly?: string
  effectiveDate?: string
  method?: 'card' | 'bacs'
  noticeDays?: number
  secretaryName?: string
  crestUrl?: string | null
  lodgeName?: string
  lodgeNumber?: string
  provinceName?: string
}

const Email = ({
  firstName,
  oldAnnual,
  newAnnual,
  newMonthly,
  effectiveDate,
  method,
  noticeDays = 10,
  secretaryName,
  crestUrl, lodgeName, lodgeNumber, provinceName,
}: Props) => {
  const id = { crestUrl, lodgeName, lodgeNumber, provinceName }
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Notice of change to your {brandHeaderLines(id).name || 'Lodge'} subscription</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandHeader {...id} />
        <Section style={card}>
          <Heading as="h2" style={h2}>Advance notice: subscription amount is changing</Heading>
          <Text style={p}>{firstName ? `Dear W Bro. ${firstName},` : 'Dear Brother,'}</Text>
          <Text style={p}>
            This is your advance notice that the Lodge annual subscription will change
            {effectiveDate ? ` with effect from ${effectiveDate}` : ''}.
          </Text>
          <Hr style={hr} />
          {oldAnnual && (
            <Text style={row}><strong style={strong}>Current annual amount: </strong>{oldAnnual}</Text>
          )}
          {newAnnual && (
            <Text style={row}><strong style={strong}>New annual amount: </strong>{newAnnual}</Text>
          )}
          {newMonthly && (
            <Text style={row}><strong style={strong}>Monthly equivalent: </strong>{newMonthly} × 12</Text>
          )}
          {effectiveDate && (
            <Text style={row}><strong style={strong}>Effective from: </strong>{effectiveDate}</Text>
          )}
          <Hr style={hr} />
          {method === 'bacs' ? (
            <Text style={p}>
              Because you pay by Direct Debit, we are giving you at least {noticeDays} working days'
              advance notice as required by the Direct Debit Guarantee. No action is required — the
              new amount will be collected automatically from the effective date. If you wish to
              cancel or change your arrangement, please reply to this email before then.
            </Text>
          ) : (
            <Text style={p}>
              No action is required — from the effective date your monthly card payment will be
              collected at the new amount. If you wish to change your arrangement, please reply to
              this email before then.
            </Text>
          )}
          <Hr style={hr} />
          <Text style={signOff}>Yours sincerely,</Text>
          <Text style={signName}>{secretaryName || 'The Secretary'}</Text>
          <Text style={signOffice}>on behalf of the Worshipful Master</Text>
        </Section>
        <EmailBrandFooter {...id} />
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: any) => `Notice of change to your Lodge subscription — effective ${d?.effectiveDate || 'soon'}`,
  displayName: 'Dues price change notice',
  previewData: {
    firstName: 'John',
    oldAnnual: '£250.00',
    newAnnual: '£265.00',
    newMonthly: '£22.09',
    effectiveDate: '1 October 2026',
    method: 'bacs',
    noticeDays: 10,
    secretaryName: 'The Secretary',
    crestUrl: 'https://placehold.co/240x240/png', lodgeName: 'Example Lodge', lodgeNumber: '1234', provinceName: 'Province of Testshire',
  },
} satisfies TemplateEntry

const strong = { color: '#1B2A4A' }
const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const card = { backgroundColor: '#fafaf7', border: '1px solid #e8e3d3', borderRadius: '4px', padding: '28px' }
const h2 = { color: '#1B2A4A', fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#2a2a2a', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px', fontFamily: 'Arial, sans-serif' }
const row = { fontSize: '14px', lineHeight: '1.6', margin: '4px 0', fontFamily: 'Arial, sans-serif', color: '#2a2a2a' }
const hr = { borderColor: '#e8e3d3', margin: '18px 0' }
const signOff = { color: '#2a2a2a', fontSize: '15px', margin: '0 0 8px', fontFamily: 'Arial, sans-serif' }
const signName = { color: '#1B2A4A', fontSize: '15px', fontWeight: 600, margin: 0, fontFamily: 'Arial, sans-serif' }
const signOffice = { color: '#1B2A4A', fontSize: '14px', margin: 0, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' as const }
