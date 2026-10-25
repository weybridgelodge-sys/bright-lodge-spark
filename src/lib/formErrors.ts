// Inline field validation for the public booking forms. Errors are an ordered list
// (page order) so the first entry is the field to scroll to and focus.
import { CHILD_MAX_AGE, isChildAge } from "@/lib/publicEvents";
import { lodgeRequired } from "@/lib/bookingTitles";
import { PHONE_REQUIRED_MESSAGE, isPlausiblePhone } from "@/lib/phone";

export type FieldError = { id: string; message: string };
export const errorId = (fieldId: string) => `${fieldId}-error`;
export const errorFor = (errors: FieldError[], id: string) => errors.find((e) => e.id === id)?.message;

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const emailError = (email: string) =>
  !email.trim() ? "Please enter your email address." : !EMAIL_RE.test(email.trim()) ? "Please enter a valid email address." : null;

export const guestFieldId = (child: boolean, i: number, field: "name" | "age") => `pev-guest-${child ? "c" : "a"}-${i}-${field}`;

export function validateEventForm(v: {
  name: string; email: string; phone: string;
  adultRows: { name: string }[]; childRows: { name: string; age: string }[];
}): FieldError[] {
  const out: FieldError[] = [];
  if (!v.name.trim()) out.push({ id: "pev-name", message: "Please enter your full name." });
  const em = emailError(v.email); if (em) out.push({ id: "pev-email", message: em });
  if (!isPlausiblePhone(v.phone)) out.push({ id: "pev-phone", message: PHONE_REQUIRED_MESSAGE });
  v.adultRows.forEach((g, i) => { if (!g.name.trim()) out.push({ id: guestFieldId(false, i, "name"), message: "Please give this guest's name." }); });
  v.childRows.forEach((g, i) => {
    if (!g.name.trim()) out.push({ id: guestFieldId(true, i, "name"), message: "Please give this child's name." });
    if (!isChildAge(g.age === "" ? null : Number(g.age))) out.push({ id: guestFieldId(true, i, "age"), message: `Please give this child's age (${CHILD_MAX_AGE} and under).` });
  });
  return out;
}

export function validateMeetingStep1(v: { title: string; firstName: string; lastName: string; lodge: string; email: string; phone: string }): FieldError[] {
  const out: FieldError[] = [];
  if (!v.title) out.push({ id: "evf-title", message: "Please choose your title." });
  if (!v.firstName.trim()) out.push({ id: "evf-first", message: "Please enter your first name." });
  if (!v.lastName.trim()) out.push({ id: "evf-last", message: "Please enter your last name." });
  if (lodgeRequired(v.title) && !v.lodge.trim()) out.push({ id: "evf-lodge", message: "Please enter your lodge name and number." });
  const em = emailError(v.email); if (em) out.push({ id: "evf-email", message: em });
  if (!isPlausiblePhone(v.phone)) out.push({ id: "evf-phone", message: PHONE_REQUIRED_MESSAGE });
  return out;
}

export function validateMeetingStep2(v: { meetingOption: string; diningOptionId: string | null | undefined; guests: { name: string }[] }): FieldError[] {
  const out: FieldError[] = [];
  if (!v.meetingOption) { out.push({ id: "evf-meeting", message: "Please choose a meeting option." }); return out; }
  if (v.meetingOption === "meeting-and-festive-board") {
    if (!v.diningOptionId) out.push({ id: "evf-dining", message: "Please choose a dining option." });
    v.guests.forEach((g, i) => { if (!g.name.trim()) out.push({ id: `g${i}`, message: "Please give this guest's name." }); });
  }
  return out;
}

export function validateMeetingStep3(paymentMethod: string): FieldError[] {
  return paymentMethod ? [] : [{ id: "evf-pay", message: "Please choose a payment method." }];
}

/** Scroll the first invalid field into view (motion-aware) and focus it. */
export function focusFirstError(errors: FieldError[]) {
  if (!errors.length || typeof document === "undefined") return;
  requestAnimationFrame(() => {
    const el = document.getElementById(errors[0].id);
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const target = el.matches("input,select,textarea,button") ? el : el.querySelector<HTMLElement>("input,select,textarea,button");
    (target ?? el).focus({ preventScroll: true });
  });
}

/** Props to spread on an input so it points at its inline message. */
export const invalidProps = (errors: FieldError[], id: string) => {
  const has = !!errorFor(errors, id);
  return { "aria-invalid": has ? (true as const) : undefined, "aria-describedby": has ? errorId(id) : undefined };
};

/** Join Us / Contact enquiry form, in page order. Phone is optional here but must be plausible if given. */
export function validateEnquiryForm(v: { full_name: string; email: string; phone: string; reason: string }): FieldError[] {
  const out: FieldError[] = [];
  if (!v.full_name.trim()) out.push({ id: "full_name", message: "Please enter your full name." });
  const em = emailError(v.email); if (em) out.push({ id: "email", message: em });
  if (v.phone.trim() && !isPlausiblePhone(v.phone)) out.push({ id: "phone", message: PHONE_REQUIRED_MESSAGE });
  const r = v.reason.trim();
  if (!r) out.push({ id: "reason", message: "Please tell us a little about why you're interested." });
  else if (r.length < 10) out.push({ id: "reason", message: "Please write at least 10 characters." });
  return out;
}

export const NEWSLETTER_EMAIL_ID = "newsletter-email";
export function validateNewsletterEmail(email: string): FieldError[] {
  const clean = email.trim();
  if (!clean) return [{ id: NEWSLETTER_EMAIL_ID, message: "Please enter your email address." }];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 255) return [{ id: NEWSLETTER_EMAIL_ID, message: "Please enter a valid email address." }];
  return [];
}

/** Balance page: menu save needs one dish (error under the first dish box); payment needs a method. */
export function validateBalanceForm(v: { action: "choices" | "pay"; chosenCount?: number; firstChoiceId?: string; method?: string }): FieldError[] {
  if (v.action === "choices") return (v.chosenCount ?? 0) > 0 ? [] : [{ id: `bal-choice-${v.firstChoiceId ?? "0"}`, message: "Please choose at least one dish." }];
  return v.method ? [] : [{ id: "bal-pay", message: "Please choose a payment method." }];
}
