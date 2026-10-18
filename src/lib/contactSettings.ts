// Client-side checks mirroring update_lodge_contact_settings (the DB is the
// authority; this only gives earlier, clearer messages).
export type ContactSettingsForm = { secretary_email: string; membership_cc_email: string; guide_url: string };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HTTPS = /^https:\/\/[^\s/]+\.[^\s]+$/;

export function validateContactSettings(f: ContactSettingsForm) {
  const e: Partial<Record<keyof ContactSettingsForm, string>> = {};
  if (!EMAIL.test(f.secretary_email.trim())) e.secretary_email = "Enter a valid email address.";
  if (!EMAIL.test(f.membership_cc_email.trim())) e.membership_cc_email = "Enter a valid email address.";
  if (!HTTPS.test(f.guide_url.trim())) e.guide_url = "Enter a link starting with https://";
  return e;
}
