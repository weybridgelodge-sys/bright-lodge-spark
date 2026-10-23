import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { emailError, fallbackMembershipEmail, MEMBERSHIP_FALLBACK_WARNING, membershipSourceText, normaliseEmail, resolveMembershipEmail } from "@/lib/membershipOfficerEmail";
import { buildFieldSpecs, type ReturnData } from "@/lib/installationReturn";

const D = "example.org";

describe("Membership Officer lodge email precedence", () => {
  it("override beats Unit Setup", () => expect(resolveMembershipEmail({ override: "o@x.org", unitSetup: "u@x.org", domain: D })).toEqual({ email: "o@x.org", source: "override" }));
  it("Unit Setup beats fallback", () => expect(resolveMembershipEmail({ override: null, unitSetup: "u@x.org", domain: D })).toEqual({ email: "u@x.org", source: "unit_setup" }));
  it("blank values are skipped", () => expect(resolveMembershipEmail({ override: "  ", unitSetup: "", domain: D })).toEqual({ email: `membershipsecretary@${D}`, source: "fallback" }));
  it("legacy {email} override is read", () => expect(resolveMembershipEmail({ override: { email: "o@x.org" }, domain: D }).source).toBe("override"));
  it("no domain → blank fallback, never guessed", () => expect(fallbackMembershipEmail("")).toBe(""));
  it("normalises stored values", () => expect(resolveMembershipEmail({ unitSetup: " U@X.Org ", domain: D }).email).toBe("u@x.org"));
});

describe("validation", () => {
  it.each(["bad", "a@b", "a b@c.org", "@c.org"])("rejects %s", (v) => expect(emailError(v)).toBe("Enter a valid email address."));
  it("accepts blank", () => expect(emailError("  ")).toBeNull());
  it("normalises spaces and capitals", () => { expect(normaliseEmail("  Mo@Example.ORG ")).toBe("mo@example.org"); expect(emailError(" Mo@Example.ORG ")).toBeNull(); });
});

describe("wording", () => {
  it("fallback warning", () => expect(MEMBERSHIP_FALLBACK_WARNING).toBe("No Membership Officer lodge email set in Unit Setup; using the fallback address."));
  it("source lines", () => {
    expect(membershipSourceText("unit_setup")).toBe("From Unit Setup");
    expect(membershipSourceText("override")).toBe("Override for this return");
    expect(membershipSourceText("fallback")).toBe("Fallback: no address set");
  });
});

describe("resolver feeds the PDF field", () => {
  it("lodge email field uses the resolved address", () => {
    const off = (key: string, label: string, memberId: string | null) => ({ key, label, memberId, provenance: "confirmed" as const, fromYear: 2026 });
    const vac = off("x", "X", null);
    const d = {
      year: 2026, installationDate: null, prescribedDate: "", installationEventTitle: null,
      wm: vac, sw: vac, jw: vac, ipm: vac,
      officers: [off("membership_officer", "Membership Officer", "m1")],
      qualification: { branch: 0, reason: "" },
      profiles: { m1: { id: "m1", first_name: "A", middle_name: null, last_name: "B", full_name: "A B", email: "a@p.org" } },
      identity: { lodgeName: "L", lodgeNumber: "1", emailDomain: D } as any,
      ruleWording: "", membershipLodgeEmail: resolveMembershipEmail({ unitSetup: "mo@x.org", domain: D }).email,
      membershipEmailSource: "unit_setup", membershipOverride: "", issues: [],
    } as unknown as ReturnData;
    const spec = buildFieldSpecs(d).find((s) => s.id === "Membership Oﬃcer Lodge Email Address");
    expect(spec?.value).toBe("mo@x.org");
  });
});

describe("guard: typed mailbox names only in the fallback", () => {
  it("installationReturn and the screen carry no typed membership mailbox", () => {
    for (const f of ["src/lib/installationReturn.ts", "src/pages/members/admin/InstallationReturn.tsx", "src/pages/members/admin/UnitSetup.tsx"])
      expect(readFileSync(f, "utf8")).not.toMatch(/membership(secretary|officer)@/);
    expect(readFileSync("src/lib/membershipOfficerEmail.ts", "utf8").match(/membershipsecretary@/g)).toHaveLength(1);
  });
});
