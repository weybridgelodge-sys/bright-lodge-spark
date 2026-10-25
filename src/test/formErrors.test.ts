import { describe, it, expect } from "vitest";
import { validateEventForm, validateMeetingStep1, validateMeetingStep2, validateMeetingStep3 } from "@/lib/formErrors";
import { PHONE_REQUIRED_MESSAGE } from "@/lib/phone";

const ids = (e: { id: string }[]) => e.map((x) => x.id);

describe("event form inline errors", () => {
  it("empty form lists every field in page order, name first", () => {
    const e = validateEventForm({ name: "", email: "", phone: "", adultRows: [{ name: "" }], childRows: [{ name: "", age: "" }] });
    expect(ids(e)).toEqual(["pev-name", "pev-email", "pev-phone", "pev-guest-a-0-name", "pev-guest-c-0-name", "pev-guest-c-0-age"]);
  });
  it("phone uses the shared message", () => {
    const e = validateEventForm({ name: "A", email: "a@b.co", phone: "123", adultRows: [], childRows: [] });
    expect(e).toEqual([{ id: "pev-phone", message: PHONE_REQUIRED_MESSAGE }]);
  });
  it("child aged 17 fails age only", () => {
    const e = validateEventForm({ name: "A", email: "a@b.co", phone: "07700 900123", adultRows: [], childRows: [{ name: "Kid", age: "40" }] });
    expect(ids(e)).toEqual(["pev-guest-c-0-age"]);
  });
  it("valid form has no errors", () => {
    expect(validateEventForm({ name: "A", email: "a@b.co", phone: "07700 900123", adultRows: [{ name: "B" }], childRows: [] })).toEqual([]);
  });
});

describe("meeting form inline errors", () => {
  it("step 1 empty: title first, all fields listed", () => {
    expect(ids(validateMeetingStep1({ title: "", firstName: "", lastName: "", lodge: "", email: "", phone: "" })))
      .toEqual(["evf-title", "evf-first", "evf-last", "evf-lodge", "evf-email", "evf-phone"]);
  });
  it("lodge required for a Mason title", () => {
    expect(ids(validateMeetingStep1({ title: "Bro", firstName: "A", lastName: "B", lodge: "", email: "a@b.co", phone: "07700 900123" }))).toEqual(["evf-lodge"]);
  });
  it("bad email reported under email", () => {
    expect(validateMeetingStep1({ title: "Mr", firstName: "A", lastName: "B", lodge: "", email: "nope", phone: "07700 900123" })[0].id).toBe("evf-email");
  });
  it("step 2 needs a meeting option", () => {
    expect(ids(validateMeetingStep2({ meetingOption: "", diningOptionId: "", guests: [] }))).toEqual(["evf-meeting"]);
  });
  it("dining: dining option then each unnamed guest", () => {
    expect(ids(validateMeetingStep2({ meetingOption: "meeting-and-festive-board", diningOptionId: "", guests: [{ name: "x" }, { name: "" }] })))
      .toEqual(["evf-dining", "g1"]);
  });
  it("step 3 needs a payment method", () => {
    expect(ids(validateMeetingStep3(""))).toEqual(["evf-pay"]);
    expect(validateMeetingStep3("card")).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import { validateEnquiryForm, validateNewsletterEmail, validateBalanceForm } from "@/lib/formErrors";

describe("enquiry form inline errors", () => {
  it("empty form: name, email, reason in order; blank phone is fine", () => {
    expect(ids(validateEnquiryForm({ full_name: "", email: "", phone: "", reason: "" }))).toEqual(["full_name", "email", "reason"]);
  });
  it("phone if given must be plausible", () => {
    expect(validateEnquiryForm({ full_name: "A", email: "a@b.co", phone: "12", reason: "I would like to join" })).toEqual([{ id: "phone", message: PHONE_REQUIRED_MESSAGE }]);
  });
  it("reason under 10 characters fails", () => {
    expect(ids(validateEnquiryForm({ full_name: "A", email: "a@b.co", phone: "", reason: "short" }))).toEqual(["reason"]);
  });
  it("EnquiryForm uses the shared FitTurnstile", () => {
    const src = readFileSync("src/components/EnquiryForm.tsx", "utf8");
    expect(src).toContain('import { FitTurnstile } from "@/components/FitTurnstile"');
    expect(src).toContain("<FitTurnstile");
  });
});

describe("newsletter email inline error", () => {
  it("empty and invalid fail, valid passes", () => {
    expect(validateNewsletterEmail("")[0].message).toBe("Please enter your email address.");
    expect(validateNewsletterEmail("nope")[0].message).toBe("Please enter a valid email address.");
    expect(validateNewsletterEmail("a@b.co")).toEqual([]);
  });
});

describe("balance page inline errors", () => {
  it("no dish chosen: error under the first dish box", () => {
    expect(ids(validateBalanceForm({ action: "choices", chosenCount: 0, firstChoiceId: "x1" }))).toEqual(["bal-choice-x1"]);
    expect(validateBalanceForm({ action: "choices", chosenCount: 1, firstChoiceId: "x1" })).toEqual([]);
  });
  it("pay needs a method", () => {
    expect(ids(validateBalanceForm({ action: "pay", method: "" }))).toEqual(["bal-pay"]);
    expect(validateBalanceForm({ action: "pay", method: "card" })).toEqual([]);
  });
});
