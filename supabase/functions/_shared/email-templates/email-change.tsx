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
  BrandHeader,
  button,
  buttonWrap,
  container,
  footer,
  footerBrand,
  h1,
  hr,
  main,
  text,
} from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change the email address on your {siteName} account
          from {oldEmail} to {newEmail}.
        </Text>
        <Text style={text}>
          Use the button below to confirm this change.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Confirm Email Change
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't request this change, please contact the Lodge Secretary
          and secure your account immediately.
        </Text>
        <Text style={footerBrand}>
          Weybridge Lodge No. 6787 · Guildford, Surrey
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
