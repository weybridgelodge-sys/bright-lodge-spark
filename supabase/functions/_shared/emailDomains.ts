// Deployment-level email domains. These are tied to the verified email DNS for this
// deployment and are deliberately NOT per-unit (Unit Setup) settings: a unit cannot send
// from a domain that is not verified, so changing these is a deployment change, not a form edit.
// This is the only file that may hold them; senders import from here.
export const EMAIL_DOMAINS = {
  /** Verified sender domain passed to the email API. */
  senderDomain: "notify.email.weybridgelodge.org.uk",
  /** Root email domain. */
  rootDomain: "email.weybridgelodge.org.uk",
  /** Domain used in the From address (noreply@...). */
  fromDomain: "email.weybridgelodge.org.uk",
} as const;

/** Resend-verified From address for visitor summonses and member event invites
 *  (kept separate from EMAIL_DOMAINS, which is delegated to Lovable Emails). */
export const EVENTS_FROM_ADDRESS = "notify@events.weybridgelodge.org.uk";
