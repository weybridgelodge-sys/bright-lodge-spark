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
  Link,
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
  link,
  main,
  text,
} from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thank you for registering for the{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
          .
        </Text>
        <Text style={text}>
          Please confirm your email address ({recipient}) using the button
          below.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Confirm Email Address
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>
          Weybridge Lodge No. 6787 · Guildford, Surrey
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
