/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BrandFooter,
  BrandHeader,
  codeStyle,
  codeWrap,
  container,
  footer,
  h1,
  hr,
  main,
  text,
  type BrandIdentity,
} from './_layout.tsx'

interface ReauthenticationEmailProps {
  /** Lodge identity for this render only (JOB CJ); omitted = text-only header. */
  brand?: BrandIdentity | null
  token: string
  siteName?: string
}

export const ReauthenticationEmail = ({ token, siteName = 'Members Portal', brand }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader brand={brand} />
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Section style={codeWrap}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          Do not share this code with anyone — Lodge officers will never ask
          for it.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely
          ignore this email.
        </Text>
        <BrandFooter brand={brand} />
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
