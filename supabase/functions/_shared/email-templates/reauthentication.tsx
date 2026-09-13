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
  BrandHeader,
  codeStyle,
  codeWrap,
  container,
  footer,
  footerBrand,
  h1,
  hr,
  main,
  text,
} from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Weybridge Lodge verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
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
        <Text style={footerBrand}>
          Weybridge Lodge No. 6787 · Guildford, Surrey
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
