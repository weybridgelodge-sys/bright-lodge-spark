import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isNoMembershipAuthError } from "@/lib/authAccess";
import {
  classifyReturnedAuthError, clearGoogleStarted, GOOGLE_FLAG_KEY, GOOGLE_FLAG_TTL_MS, markGoogleStarted, takeGoogleStarted,
} from "@/lib/googleSignInFlag";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("JOB CA: error string matching", () => {
  const table: [string, boolean][] = [
    ["signup_disabled Signups not allowed for this instance", true], // verified in auth log 21:44:12
    ["422: Signups not allowed for this instance", true],
    ["otp_disabled Signups not allowed for otp", true],
    ["no_membership_for_account", true],
    ["unexpected_failure Database error saving new user", true],
    ["server_error", false],
    ["access_denied", false],
    ["unexpected_failure", false],
    ["otp_expired Email link is invalid or has expired", false],
  ];
  for (const [s, want] of table) it(`"${s}" → ${want}`, () => expect(isNoMembershipAuthError(s)).toBe(want));
});

describe("JOB CA: Google-started flag", () => {
  it("set then take within TTL is true and clears", () => {
    const s = mem(); markGoogleStarted(1000, s);
    expect(takeGoogleStarted(1000 + 60_000, s)).toBe(true);
    expect(s.m.has(GOOGLE_FLAG_KEY)).toBe(false);
    expect(takeGoogleStarted(1000 + 60_000, s)).toBe(false);
  });
  it("expires after 10 minutes (and is cleared)", () => {
    const s = mem(); markGoogleStarted(0, s);
    expect(takeGoogleStarted(GOOGLE_FLAG_TTL_MS + 1, s)).toBe(false);
    expect(s.m.has(GOOGLE_FLAG_KEY)).toBe(false);
  });
  it("exactly 10 minutes still counts", () => {
    const s = mem(); markGoogleStarted(0, s);
    expect(takeGoogleStarted(GOOGLE_FLAG_TTL_MS, s)).toBe(true);
  });
  it("clear removes it (successful sign-in)", () => {
    const s = mem(); markGoogleStarted(0, s); clearGoogleStarted(s);
    expect(takeGoogleStarted(1, s)).toBe(false);
  });
});

describe("JOB CA: Login decision", () => {
  it("Google + generic error (Julien's case) → no-membership", () => {
    expect(classifyReturnedAuthError("access_denied This link has expired", true, isNoMembershipAuthError)).toBe("no-membership");
  });
  it("email link error without flag → expired-link text", () => {
    expect(classifyReturnedAuthError("otp_expired Email link is invalid or has expired", false, isNoMembershipAuthError)).toBe("link-error");
  });
  it("signup-not-allowed still matches without flag", () => {
    expect(classifyReturnedAuthError("signup_disabled Signups not allowed", false, isNoMembershipAuthError)).toBe("no-membership");
  });
  it("no error → nothing shown even with flag", () => {
    expect(classifyReturnedAuthError(null, true, isNoMembershipAuthError)).toBe("none");
  });
  it("Login sets flag before both Google paths and clears it on session; main clears on token return", () => {
    const login = readFileSync("src/pages/members/Login.tsx", "utf8");
    const g = login.slice(login.indexOf("const handleGoogle"));
    expect(g.indexOf("markGoogleStarted()")).toBeLessThan(g.indexOf("if (isNativeApp)"));
    expect(login).toMatch(/if \(session\) \{\s*clearGoogleStarted\(\)/);
    expect(readFileSync("src/main.tsx", "utf8")).toMatch(/access_token[\s\S]{0,120}removeItem\("oauth-google-started"\)/);
  });
});
