import { describe, it, expect } from "vitest";
import { validateContactSettings } from "@/lib/contactSettings";

const ok = { secretary_email: "secretary@weybridgelodge.org.uk", membership_cc_email: "membershipsecretary@weybridgelodge.org.uk", guide_url: "https://weybridgelodge.org.uk/downloads/information-for-prospective-members.pdf?v=2" };

describe("contact settings validation", () => {
  it("accepts the current live values", () => expect(validateContactSettings(ok)).toEqual({}));
  it("rejects a bad email", () => expect(validateContactSettings({ ...ok, secretary_email: "secretary" }).secretary_email).toBeTruthy());
  it("rejects a non-https guide link", () => expect(validateContactSettings({ ...ok, guide_url: "http://weybridgelodge.org.uk/g.pdf" }).guide_url).toBeTruthy());
});
