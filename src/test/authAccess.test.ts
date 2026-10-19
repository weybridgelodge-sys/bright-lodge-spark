import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isUnknownMemberOtpError } from "@/lib/authAccess";

const login = readFileSync("src/pages/members/Login.tsx", "utf8");

describe("closed sign-up", () => {
  it("magic link never creates an account", () => {
    expect(login).toMatch(/shouldCreateUser:\s*false/);
  });
  it("self-registration is gone from the sign-in page", () => {
    expect(login).not.toMatch(/auth\.signUp\(/);
  });
  it("Grand Lodge Ref. No. can't be self-entered", () => {
    expect(login).not.toMatch(/ugle/i);
  });
  it("an unknown email gets the neutral screen, not an error", () => {
    expect(isUnknownMemberOtpError("Signups not allowed for otp")).toBe(true);
    expect(isUnknownMemberOtpError("Email rate limit exceeded")).toBe(false);
  });
});
