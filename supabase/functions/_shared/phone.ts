// Booking phone rule (shared by browser forms and booking functions).
// Lenient: digits, spaces, +, brackets, hyphens, dots; at least 7 digits, at most 15.
export const PHONE_REQUIRED_MESSAGE = "Please enter a phone number we can reach you on (at least 7 digits).";

export function isPlausiblePhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 40) return false;
  if (!/^[0-9+()\-.\s]+$/.test(v)) return false;
  if (v.indexOf("+") > 0) return false;
  const digits = v.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}
