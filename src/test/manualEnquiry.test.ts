import { describe, it, expect } from "vitest";
import { validateManualEnquiry, manualSource, ukToday } from "@/lib/manualEnquiry";

const ok = { full_name: "Test Person", email: "", phone: "07700 900000", channel: "phone" as const, received_on: "2026-10-16", message: "" };
const today = "2026-10-16";

describe("manual enquiry validation", () => {
  it("accepts a phone-only enquiry", () => expect(validateManualEnquiry(ok, today)).toEqual({}));
  it("requires a name", () => expect(validateManualEnquiry({ ...ok, full_name: " " }, today).full_name).toBeTruthy());
  it("requires an email or phone", () => expect(validateManualEnquiry({ ...ok, phone: "" }, today).contact).toBeTruthy());
  it("validates email when present", () => expect(validateManualEnquiry({ ...ok, email: "nope" }, today).email).toBeTruthy());
  it("rejects a future received date", () => expect(validateManualEnquiry({ ...ok, received_on: "2026-10-17" }, today).received_on).toBeTruthy());
  it("allows today", () => expect(validateManualEnquiry({ ...ok, received_on: today }, today).received_on).toBeUndefined());
  it("caps the message at 2000 characters", () => {
    expect(validateManualEnquiry({ ...ok, message: "a".repeat(2000) }, today).message).toBeUndefined();
    expect(validateManualEnquiry({ ...ok, message: "a".repeat(2001) }, today).message).toBeTruthy();
  });
  it("stores manual sources, never join-us", () => {
    expect(manualSource("email")).toBe("manual-email");
    expect(manualSource("in-person")).toBe("manual-in-person");
  });
  it("uses UK date", () => expect(ukToday(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01"));
});
