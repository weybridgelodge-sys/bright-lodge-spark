/// <reference types="npm:@types/react@18.3.1" />

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
import {
  BrandFooter,
  BrandHeader,
  button,
  buttonWrap,
  container,
  footer,
  h1,
  hr,
  main,
  text,
  type BrandIdentity,
} from './_layout.tsx'

interface RecoveryEmailProps {
  /** Lodge identity for this render only (JOB CJ); omitted = text-only header. */
  brand?: BrandIdentity | null
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  brand,
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader brand={brand} />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset the password for your {siteName}
          account. Use the button below to choose a new password. This link
          expires shortly and can only be used once.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Reset Password
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email — your password will not be changed.
        </Text>
        <BrandFooter brand={brand} />
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
