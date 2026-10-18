import { describe, it, expect } from "vitest";
import {
  isHoneypotTripped,
  seatCheckOutcome,
  SEAT_CHECK_UNAVAILABLE_MESSAGE,
} from "../../supabase/functions/_shared/meetingResponseGuards";
import { resolveEnquiryContacts, ENQUIRY_CONTACT_FALLBACK } from "../../supabase/functions/_shared/enquiryContacts";

describe("save-meeting-response guards", () => {
  it("seat check error fails closed with 503", () => {
    const r = seatCheckOutcome(null, { message: "boom" });
    expect(r).toEqual({ ok: false, httpStatus: 503, message: SEAT_CHECK_UNAVAILABLE_MESSAGE });
    expect(SEAT_CHECK_UNAVAILABLE_MESSAGE).toMatch(/try again/);
    expect(SEAT_CHECK_UNAVAILABLE_MESSAGE).toMatch(/Assistant Secretary/);
  });
  it("seat check result passes through", () => {
    expect(seatCheckOutcome("waitlisted", null)).toEqual({ ok: true, status: "waitlisted" });
    expect(seatCheckOutcome("confirmed", null)).toEqual({ ok: true, status: "confirmed" });
  });
  it("non-empty honeypot is rejected, empty is allowed", () => {
    expect(isHoneypotTripped("http://spam")).toBe(true);
    expect(isHoneypotTripped("")).toBe(false);
    expect(isHoneypotTripped(undefined)).toBe(false);
  });
});

describe("enquiry contacts", () => {
  it("falls back to the previous constants when the row is missing", () => {
    expect(resolveEnquiryContacts(null)).toEqual({
      secretaryEmail: "secretary@weybridgelodge.org.uk",
      membershipCcEmail: "membershipsecretary@weybridgelodge.org.uk",
      guideUrl: "https://weybridgelodge.org.uk/downloads/information-for-prospective-members.pdf?v=2",
    });
  });
  it("uses stored values, blanks fall back", () => {
    const r = resolveEnquiryContacts({ secretary_email: "a@x.org", membership_cc_email: " ", guide_url: null });
    expect(r.secretaryEmail).toBe("a@x.org");
    expect(r.membershipCcEmail).toBe(ENQUIRY_CONTACT_FALLBACK.membershipCcEmail);
  });
});
