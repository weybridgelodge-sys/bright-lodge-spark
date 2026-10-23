// Membership Officer lodge email: one resolver for every place that uses it.
// Order: per-return override (module_settings) → Unit Setup standing value → last-resort fallback.

/** Unit Setup key (unit_settings, saved via save_unit_setup). */
export const MEMBERSHIP_OFFICER_UNIT_KEY = "membership_officer_email";
/** Persisted per-return override on the UGLE Installation Return screen. */
export const MEMBERSHIP_OVERRIDE_SETTING = "installation_return_membership_officer_email";

export type MembershipEmailSource = "override" | "unit_setup" | "fallback";
export type MembershipEmail = { email: string; source: MembershipEmailSource };

export const MEMBERSHIP_FALLBACK_WARNING = "No Membership Officer lodge email set in Unit Setup; using the fallback address.";
export const INVALID_EMAIL = "Enter a valid email address.";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Trimmed, lowercased; "" for anything blank or not a string. */
export function normaliseEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/** null when valid or blank (blank allowed); an error message otherwise. */
export function emailError(v: unknown): string | null {
  const n = normaliseEmail(v);
  return !n || EMAIL_RE.test(n) ? null : INVALID_EMAIL;
}

/** The only place the typed mailbox name may appear: used when nothing else is set. */
export function fallbackMembershipEmail(domain: string): string {
  return domain ? `membershipsecretary@${domain}` : "";
}

/** Override value may be stored as a string or legacy {email}. */
function readStored(v: unknown): string {
  if (v && typeof v === "object" && "email" in (v as object)) return normaliseEmail((v as { email: unknown }).email);
  return normaliseEmail(v);
}

export function resolveMembershipEmail(input: { override?: unknown; unitSetup?: unknown; domain: string }): MembershipEmail {
  const o = readStored(input.override);
  if (o && EMAIL_RE.test(o)) return { email: o, source: "override" };
  const u = readStored(input.unitSetup);
  if (u && EMAIL_RE.test(u)) return { email: u, source: "unit_setup" };
  return { email: fallbackMembershipEmail(input.domain), source: "fallback" };
}

export const membershipSourceText = (s: MembershipEmailSource) =>
  s === "override" ? "Override for this return" : s === "unit_setup" ? "From Unit Setup" : "Fallback: no address set";
