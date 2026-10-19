// Errors that mean "this email is not a member". The sign-in form shows its
// normal "check your email" screen for these so it can't reveal who is a member.
export function isUnknownMemberOtpError(message: string | null | undefined): boolean {
  return /signups? not allowed|user not found|not found/i.test(String(message ?? ""));
}
