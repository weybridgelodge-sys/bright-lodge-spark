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

describe("create-checkout seat check", () => {
  it("rejected promise / RPC error means no booking: 503 with the shared message", () => {
    const r = seatCheckOutcome(null, new Error("network"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.httpStatus).toBe(503);
      expect(r.message).toBe(SEAT_CHECK_UNAVAILABLE_MESSAGE);
    }
  });
  it("empty result with no error still counts as confirmed (pending payment)", () => {
    expect(seatCheckOutcome(null, null)).toEqual({ ok: true, status: "confirmed" });
  });
});

describe("create-checkout wiring", () => {
  it("returns before inserting a booking or creating a Stripe session when the seat check fails", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("supabase/functions/create-checkout/index.ts", "utf8");
    const guard = src.indexOf("if (!seat.ok)");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(src.indexOf('.from("bookings")\n      .insert'));
    expect(guard).toBeLessThan(src.indexOf("checkout.sessions.create"));
    expect(src).not.toMatch(/defaulting to pending/);
  });
});

import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
describe("lodge settings fallback", () => {
  it("missing row keeps every previously typed value", () => {
    expect(resolveLodgeSettings(null)).toEqual({
      siteUrl: "https://weybridgelodge.org.uk",
      senderName: "Weybridge Lodge",
      formalSenderName: "Weybridge Lodge No. 6787",
      secretaryEmail: "secretary@weybridgelodge.org.uk",
      membershipCcEmail: "membershipsecretary@weybridgelodge.org.uk",
      assistantSecretaryEmail: "assistantsecretary@weybridgelodge.org.uk",
      webmasterEmail: "webmaster@weybridgelodge.org.uk",
      communicationsEmail: "communications@weybridgelodge.org.uk",
    });
  });
  it("stored values win, blanks fall back, trailing slash trimmed", () => {
    const r = resolveLodgeSettings({ site_url: "https://example.org/", webmaster_email: " " });
    expect(r.siteUrl).toBe("https://example.org");
    expect(r.webmasterEmail).toBe("webmaster@weybridgelodge.org.uk");
  });
});
