// Who handles booking queries — one rule for server (lodgeSettingsResolve) and browser
// (get_public_booking_details mirrors it in SQL). Order: Unit Setup booking_contact_email,
// else the Assistant Secretary's lodge address only while the office has a holder,
// else the Secretary's lodge address, else no address. Pure: no lodge literals.
export type BookingContact = {
  email: string;
  /** "" = the explicit Unit Setup contact ("contact us"); otherwise the office title. */
  office: "" | "Assistant Secretary" | "Secretary";
};

const t = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function resolveBookingContact(i: {
  explicitEmail?: unknown; assistantSecretaryHeld: boolean; assistantSecretaryEmail?: unknown; secretaryEmail?: unknown;
}): BookingContact {
  const explicit = t(i.explicitEmail);
  if (explicit) return { email: explicit, office: "" };
  const asst = i.assistantSecretaryHeld ? t(i.assistantSecretaryEmail) : "";
  if (asst) return { email: asst, office: "Assistant Secretary" };
  return { email: t(i.secretaryEmail), office: "Secretary" };
}

/** "please contact us at x" / "please contact the {office} at x" / "please contact the {office}". */
export function bookingContactPhrase(email?: string | null, office?: string | null): string {
  const e = t(email);
  const o = t(office);
  if (!o && e) return `please contact us at ${e}`;
  return `please contact the ${o || "Secretary"}${e ? ` at ${e}` : ""}`;
}
