import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isPlausiblePhone } from "@/lib/phone";

describe("booking phone rule", () => {
  it("rejects empty or blank", () => { expect(isPlausiblePhone("")).toBe(false); expect(isPlausiblePhone("   ")).toBe(false); expect(isPlausiblePhone(null)).toBe(false); });
  it("rejects fewer than 7 digits", () => expect(isPlausiblePhone("12 345")).toBe(false));
  it("rejects letters", () => expect(isPlausiblePhone("07700 abc 900")).toBe(false));
  it("accepts UK mobile with spaces", () => expect(isPlausiblePhone("07700 900123")).toBe(true));
  it("accepts international with brackets and hyphens", () => expect(isPlausiblePhone("+44 (0)1483-123456")).toBe(true));
  it("accepts exactly 7 digits", () => expect(isPlausiblePhone("1234567")).toBe(true));
  it("rejects + not at start", () => expect(isPlausiblePhone("0770+0900123")).toBe(false));
});

describe("every booking function enforces the phone rule server-side", () => {
  for (const fn of ["create-checkout", "create-event-checkout", "save-meeting-response"]) {
    it(fn, () => {
      const src = readFileSync(`supabase/functions/${fn}/index.ts`, "utf8");
      expect(src).toMatch(/if \(!isPlausiblePhone\(/);
      expect(src).toContain("PHONE_REQUIRED_MESSAGE }");
    });
  }
});
