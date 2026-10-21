import { describe, it, expect } from "vitest";
import { pickReturnCc, returnDocumentPath, returnDocumentTitle } from "../../supabase/functions/_shared/returnFilingRules";

const TO = "pgs@province.example";
const sec = (over = {}) => ({ office: "secretary" as const, memberId: "s1", roleEmail: "secretary@lodge.example", memberEmail: "rs@home.example", ...over });
const wm = (over = {}) => ({ office: "worshipful_master" as const, memberId: "w1", roleEmail: null, memberEmail: "jt@member.example", ...over });

describe("return email Cc", () => {
  it("copies the Secretary (role address) and the WM (own email)", () => {
    const r = pickReturnCc(TO, [sec(), wm()]);
    expect(r.cc).toEqual(["secretary@lodge.example", "jt@member.example"]);
    expect(r.used.map((u) => u.source)).toEqual(["role", "member"]);
  });
  it("prefers the role address over the member's own email", () => {
    expect(pickReturnCc(TO, [sec()]).cc).toEqual(["secretary@lodge.example"]);
  });
  it("skips a vacant office", () => {
    expect(pickReturnCc(TO, [sec({ memberId: null }), wm()]).cc).toEqual(["jt@member.example"]);
  });
  it("one person holding both offices gets one Cc", () => {
    expect(pickReturnCc(TO, [sec({ memberId: "x" }), wm({ memberId: "x" })]).cc).toEqual(["secretary@lodge.example"]);
  });
  it("same address twice is copied once", () => {
    expect(pickReturnCc(TO, [sec(), wm({ memberEmail: "SECRETARY@lodge.example" })]).cc).toEqual(["secretary@lodge.example"]);
  });
  it("never copies the To address", () => {
    expect(pickReturnCc("secretary@lodge.example", [sec(), wm()]).cc).toEqual(["jt@member.example"]);
  });
  it("no usable address means no Cc", () => {
    expect(pickReturnCc(TO, [wm({ memberEmail: "" })]).cc).toEqual([]);
  });
});

describe("filing a sent return in Documents", () => {
  it("dated title with lodge year", () => {
    expect(returnDocumentTitle("Provincial Installation Return", 2026, new Date("2026-10-21T12:00:00Z")))
      .toBe("Provincial Installation Return 2026/27 (sent 21 Oct 2026)");
  });
  it("same source file maps to the same Documents path (no duplicate on re-file)", () => {
    const src = "provincial-returns/2026/L6787-Provincial-Return-2026-1.pdf";
    expect(returnDocumentPath("provincial_return", 2026, src)).toBe("returns/provincial_return/2026/L6787-Provincial-Return-2026-1.pdf");
    expect(returnDocumentPath("provincial_return", 2026, src)).toBe(returnDocumentPath("provincial_return", 2026, src));
  });
});
