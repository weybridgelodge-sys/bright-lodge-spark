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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>You have been invited</Heading>
        <Text style={text}>
          You have been invited to join the{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
          . Use the button below to accept the invitation and set up your
          account.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
        <Text style={footerBrand}>
          Weybridge Lodge No. 6787 · Guildford, Surrey
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
