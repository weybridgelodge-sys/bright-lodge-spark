// Validation for enquiries the Secretary logs by hand (email/phone/in person).
// The database function add_manual_enquiry re-checks the same rules.
export const MANUAL_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in-person", label: "In person" },
  { value: "other", label: "Other" },
] as const;
export type ManualChannel = (typeof MANUAL_CHANNELS)[number]["value"];

export type ManualEnquiryInput = {
  full_name: string; email: string; phone: string; channel: ManualChannel | "";
  received_on: string; message: string;
};
export type ManualEnquiryErrors = Partial<Record<"full_name" | "email" | "phone" | "contact" | "channel" | "received_on" | "message", string>>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Today's date (YYYY-MM-DD) in UK time. */
export function ukToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}

export const manualSource = (c: ManualChannel) => `manual-${c}`;

export function validateManualEnquiry(v: ManualEnquiryInput, today: string = ukToday()): ManualEnquiryErrors {
  const e: ManualEnquiryErrors = {};
  const name = v.full_name.trim();
  if (name.length < 2) e.full_name = "Enter the enquirer's name";
  else if (name.length > 120) e.full_name = "Name must be 120 characters or fewer";
  const email = v.email.trim(); const phone = v.phone.trim();
  if (email && (email.length > 255 || !EMAIL_RE.test(email))) e.email = "Enter a valid email address";
  if (phone.length > 40) e.phone = "Phone number must be 40 characters or fewer";
  if (!email && !phone) e.contact = "Enter an email or a phone number";
  if (!v.channel) e.channel = "Choose how they got in touch";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.received_on)) e.received_on = "Enter the date received";
  else if (v.received_on > today) e.received_on = "Date received cannot be in the future";
  if (v.message.length > 2000) e.message = "Message must be 2000 characters or fewer";
  return e;
}
