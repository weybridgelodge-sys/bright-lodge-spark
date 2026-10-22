import { describe, it, expect } from "vitest";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { duplicateBookingMessage } from "../../supabase/functions/_shared/duplicate-booking";
import { parseBookingDetails } from "@/lib/bookingDetails";

const row = { assistant_secretary_email: "asst@example.org", secretary_email: "sec@example.org" };
const pre = "You already have a booking for this event. If you need to change or cancel it, ";
const msg = (s: { bookingContactEmail: string; bookingContactOffice: string }) => duplicateBookingMessage(s.bookingContactEmail, s.bookingContactOffice);

describe("booking contact (Assistant Secretary, else Secretary)", () => {
  it("Assistant Secretary appointed: their address and title", () => {
    const s = resolveLodgeSettings(row, {}, { assistantSecretaryHeld: true });
    expect([s.bookingContactEmail, s.bookingContactOffice]).toEqual(["asst@example.org", "Assistant Secretary"]);
    expect(msg(s)).toBe(pre + "please contact the Assistant Secretary at asst@example.org.");
  });
  it("Assistant Secretary vacant, Secretary appointed: Secretary even though an AS address is stored", () => {
    const s = resolveLodgeSettings(row, { booking_contact_email: { email: null } }, { assistantSecretaryHeld: false });
    expect([s.bookingContactEmail, s.bookingContactOffice]).toEqual(["sec@example.org", "Secretary"]);
    expect(msg(s)).toBe(pre + "please contact the Secretary at sec@example.org.");
  });
  it("AS appointed but no AS address: Secretary", () => {
    const s = resolveLodgeSettings({ secretary_email: "sec@example.org" }, {}, { assistantSecretaryHeld: true });
    expect(s.bookingContactOffice).toBe("Secretary");
  });
  it("both vacant / nothing stored: wording without address, never null/undefined", () => {
    const s = resolveLodgeSettings({ assistant_secretary_email: "asst@example.org" }, {}, { assistantSecretaryHeld: false });
    expect([s.bookingContactEmail, s.bookingContactOffice]).toEqual(["", "Secretary"]);
    expect(msg(s)).toBe(pre + "please contact the Secretary.");
    for (const v of [null, undefined]) expect(duplicateBookingMessage(v as any, v as any)).not.toMatch(/null|undefined| at \./);
  });
  it("explicit Unit Setup booking_contact_email: 'contact us at'", () => {
    const s = resolveLodgeSettings(row, { booking_contact_email: { email: " bookings@example.org " } }, { assistantSecretaryHeld: true });
    expect([s.bookingContactEmail, s.bookingContactOffice]).toEqual(["bookings@example.org", ""]);
    expect(msg(s)).toBe(pre + "please contact us at bookings@example.org.");
  });
  it("blank Unit Setup value = not set", () => {
    expect(resolveLodgeSettings(row, { booking_contact_email: { email: "  " } }, { assistantSecretaryHeld: true }).bookingContactOffice).toBe("Assistant Secretary");
  });
  it("browser parse keeps office; missing contact is empty, not 'null'", () => {
    expect(parseBookingDetails({ contact_email: null, contact_office: "Secretary" })).toMatchObject({ contactEmail: "", contactOffice: "Secretary" });
    expect(parseBookingDetails({ contact_email: "x@example.org", contact_office: "" }).contactOffice).toBe("");
  });
});
