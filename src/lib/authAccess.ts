// Errors that mean "this email is not a member". The sign-in form shows its
// normal "check your email" screen for these so it can't reveal who is a member.
export function isUnknownMemberOtpError(message: string | null | undefined): boolean {
  return /signups? not allowed|user not found|not found/i.test(String(message ?? ""));
}

export const NO_MEMBERSHIP_MESSAGE =
  "We couldn't find a membership for this Google account. If you are a member, sign in with the email address your Secretary has on file, or use Request portal access.";

// A new sign-in with no lodge-created account: sign-up is closed ("Signups not
// allowed") or the account-creation rule refused it ("Database error saving new
// user" / no_membership_for_account). Never matches an expired-link error.
export function isNoMembershipAuthError(message: string | null | undefined): boolean {
  return /no_membership_for_account|signups? not allowed|database error saving new user|signup_disabled/i.test(String(message ?? ""));
}
