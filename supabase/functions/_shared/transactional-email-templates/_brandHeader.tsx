/// <reference types="npm:@types/react@18.3.1" />
// Shared email brand header + footer (Batch C). Navy crest on white, thin navy
// rule above, gold accent rule beneath the title block, navy footer rule.
// Crest blank/invalid = image omitted, rest of the header kept.
import * as React from 'npm:react@18.3.1'
import { Heading, Img, Section, Text } from 'npm:@react-email/components@0.0.22'
import { BRAND, brandHeaderLines, type BrandIdentity } from './_brand.ts'

export const EmailBrandHeader = (props: BrandIdentity) => {
  const l = brandHeaderLines(props)
  return (
    <Section style={{ borderTop: `4px solid ${BRAND.navy}`, textAlign: 'center' as const, padding: '20px 0 0', backgroundColor: BRAND.bg }}>
      {l.crestUrl && (
        <Img src={l.crestUrl} width={120} height={120} alt={l.name ? `${l.name} crest` : 'Lodge crest'} style={{ margin: '0 auto', display: 'block', objectFit: 'contain' as const }} />
      )}
      {l.name && (
        <Heading as="h1" style={{ color: BRAND.navy, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '24px', fontWeight: 700, margin: l.crestUrl ? '12px 0 0' : '0', letterSpacing: '0.5px' }}>{l.name}</Heading>
      )}
      {l.sub && (
        <Text style={{ color: BRAND.muted, fontFamily: BRAND.fontStack, fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' as const, margin: '4px 0 0' }}>{l.sub}</Text>
      )}
      <div style={{ borderTop: `2px solid ${BRAND.gold}`, width: '120px', margin: '14px auto 20px', lineHeight: '0', fontSize: '0' }}>&nbsp;</div>
    </Section>
  )
}

export const EmailBrandFooter = (props: BrandIdentity & { note?: string }) => {
  const l = brandHeaderLines(props)
  return (
    <Section style={{ borderTop: `1px solid ${BRAND.navy}`, marginTop: '24px', paddingTop: '10px', textAlign: 'center' as const }}>
      {props.note && <Text style={{ color: BRAND.muted, fontFamily: BRAND.fontStack, fontSize: '12px', margin: '0 0 4px' }}>{props.note}</Text>}
      {l.footer && <Text style={{ color: BRAND.navy, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '12px', letterSpacing: '0.08em', margin: '0' }}>{l.footer}</Text>}
    </Section>
  )
}
