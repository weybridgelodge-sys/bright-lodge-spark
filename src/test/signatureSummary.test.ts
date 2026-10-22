import { describe, expect, it } from "vitest";
import { signaturesSummary } from "@/lib/signatureSummary";
describe("signaturesSummary", () => {
  it("switch off", () => expect(signaturesSummary(false, { secretary: true, worshipful_master: true })).toBe("Signatures are left blank."));
  it("both", () => expect(signaturesSummary(true, { secretary: true, worshipful_master: true })).toBe("Signatures: Secretary and Worshipful Master added from the stored signatures."));
  it("WM only", () => expect(signaturesSummary(true, { secretary: false, worshipful_master: true })).toBe("Signatures: Worshipful Master added; the Secretary has none on file, so that box is blank."));
  it("Secretary only", () => expect(signaturesSummary(true, { secretary: true, worshipful_master: false })).toBe("Signatures: Secretary added; the Worshipful Master has none on file, so that box is blank."));
  it("none", () => expect(signaturesSummary(true, { secretary: false, worshipful_master: false })).toBe("Signatures: none on file; boxes left blank."));
});
