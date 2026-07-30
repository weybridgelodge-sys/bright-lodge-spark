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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
  client?: 'app' | 'web' | string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
  client,
}: MagicLinkEmailProps) => {
  const showLink = client !== 'app'
  const showCode = !!token && client !== 'web'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your Weybridge Lodge sign-in {showCode && !showLink ? 'code' : 'link'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Members Portal sign-in</Heading>

          {showLink ? (
            <>
              <Text style={text}>
                Use the button below to sign in to the {siteName}. This link
                expires shortly and can only be used once.
              </Text>
              <Section style={buttonWrap}>
                <Button style={button} href={confirmationUrl}>
                  Sign In to the Portal
                </Button>
              </Section>
            </>
          ) : (
            <Text style={text}>
              You requested a sign-in from the {siteName} mobile app. Enter the
              code below on the "Check your inbox" screen in the app to
              complete sign-in. This code expires shortly and can only be used
              once.
            </Text>
          )}

          {showCode ? (
            <>
              {showLink ? <Hr style={hr} /> : null}
              {showLink ? (
                <Text style={text}>
                  <strong>Using the mobile app?</strong> Enter this code on the
                  "Check your inbox" screen instead of tapping the link above:
                </Text>
              ) : null}
              <Section style={codeWrap}>
                <Text style={codeStyle}>{token}</Text>
              </Section>
              <Text style={footer}>
                Do not share this code with anyone — Lodge officers will never
                ask for it.
              </Text>
            </>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>
            If you didn't request this sign-in, you can safely ignore this
            email — no changes have been made to your account.
          </Text>
          <Text style={footerBrand}>
            Weybridge Lodge No. 6787 · Guildford, Surrey
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
