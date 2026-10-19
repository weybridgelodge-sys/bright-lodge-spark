import { describe, it, expect } from "vitest";
import { greetingName, bookingFirstName, trimBookingNames } from "../../supabase/functions/_shared/greeting";

describe("booking greeting", () => {
  it("uses details.firstName trimmed", () => {
    expect(greetingName({ firstName: "Isabelle " }, "Mrs Isabelle  Tidmarsh ")).toBe("Isabelle");
  });
  it("skips Mrs in contact_name", () => {
    expect(greetingName({}, "Mrs Isabelle Tidmarsh")).toBe("Isabelle");
  });
  it("W Bro John French greets as John", () => {
    expect(greetingName(null, "W Bro John French")).toBe("John");
    expect(greetingName(null, "W. Bro John French")).toBe("John");
  });
  it("skips multi-word titles", () => {
    expect(greetingName(null, "Rt Wor Bro Alan Smith")).toBe("Alan");
    expect(greetingName(null, "VW Bro Ian Lee")).toBe("Ian");
    expect(greetingName(null, "RW. Bro Tom Kay")).toBe("Tom");
    expect(greetingName(null, "Bro Sam Hill")).toBe("Sam");
    expect(greetingName(null, "Dr Jane Doe")).toBe("Jane");
    expect(greetingName(null, "Rev Paul Ray")).toBe("Paul");
    expect(greetingName(null, "Sir Ian Wood")).toBe("Ian");
    expect(greetingName(null, "Ms Ann Bell")).toBe("Ann");
    expect(greetingName(null, "Miss Kate Fox")).toBe("Kate");
  });
  it("falls back to there", () => {
    expect(greetingName({ firstName: "  " }, "Mrs")).toBe("there");
    expect(greetingName(null, null)).toBe("there");
    expect(bookingFirstName(null, "W Bro")).toBe("");
  });
  it("trims name fields on save", () => {
    expect(trimBookingNames({ title: " Mrs", firstName: "Isabelle ", lastName: "Tidmarsh ", qty: 2 }))
      .toEqual({ title: "Mrs", firstName: "Isabelle", lastName: "Tidmarsh", qty: 2 });
  });
});
