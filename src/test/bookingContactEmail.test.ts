import { describe, it, expect } from "vitest";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { duplicateBookingMessage } from "../../supabase/functions/_shared/duplicate-booking";
import { parseBookingDetails } from "@/lib/bookingDetails";

const asst = { assistant_secretary_email: "asst@example.org" };
describe("booking contact address", () => {
  it("Unit Setup booking_contact_email wins", () => {
    const s = resolveLodgeSettings(asst, { booking_contact_email: { email: "bookings@example.org" } });
    expect(s.bookingContactEmail).toBe("bookings@example.org");
    expect(duplicateBookingMessage(s.bookingContactEmail)).toBe("You already have a booking for this event. If you need to change or cancel it, please contact the Assistant Secretary at bookings@example.org.");
  });
  it("null or blank Unit Setup value falls back to the Assistant Secretary", () => {
    expect(resolveLodgeSettings(asst, { booking_contact_email: { email: null } }).bookingContactEmail).toBe("asst@example.org");
    expect(resolveLodgeSettings(asst, { booking_contact_email: { email: "  " } }).bookingContactEmail).toBe("asst@example.org");
  });
  it("nothing resolvable: wording without an address, never null/undefined", () => {
    const s = resolveLodgeSettings(null);
    expect(s.bookingContactEmail).toBe("");
    expect(s.assistantSecretaryEmail).toBe("");
    for (const v of [s.bookingContactEmail, null, undefined]) {
      const m = duplicateBookingMessage(v as any);
      expect(m).toBe("You already have a booking for this event. If you need to change or cancel it, please contact the Assistant Secretary.");
      expect(m).not.toMatch(/null|undefined| at \./);
    }
  });
  it("browser parse: missing contact is empty, not 'null'", () => {
    expect(parseBookingDetails({ contact_email: null }).contactEmail).toBe("");
  });
});
