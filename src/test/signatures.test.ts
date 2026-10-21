import { describe, it, expect } from "vitest";
import { canManageSignature, canPreviewSignature, checkConsent, checkSignatureImage, pngSize, MAX_SIGNATURE_BYTES } from "../../supabase/functions/_shared/signatures";

/** Synthetic PNG header with given IHDR size (a fake scribble, never a real signature). */
function fakePng(w: number, h: number, extra = 0) {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w); dv.setUint32(20, h);
  return b;
}
const none = { isAdmin: false, isSecretary: false, isCurrentWm: false };

describe("signature image checks", () => {
  it("reads PNG size", () => expect(pngSize(fakePng(300, 90))).toEqual({ width: 300, height: 90 }));
  it("accepts a processed PNG in bounds", () => expect(checkSignatureImage(fakePng(600, 200)).ok).toBe(true));
  it("rejects JPEG bytes on the server (browser must re-encode)", () => {
    const jpg = new Uint8Array(40); jpg.set([0xff, 0xd8, 0xff, 0xe0]);
    expect(checkSignatureImage(jpg).ok).toBe(false);
  });
  it("rejects over 600x200", () => {
    expect(checkSignatureImage(fakePng(601, 100)).ok).toBe(false);
    expect(checkSignatureImage(fakePng(300, 201)).ok).toBe(false);
  });
  it("rejects over 200 KB", () => expect(checkSignatureImage(fakePng(100, 50, MAX_SIGNATURE_BYTES)).ok).toBe(false));
});

describe("who may manage a signature", () => {
  it("member manages his own", () => expect(canManageSignature("a", "a", none, true)).toEqual({ allowed: true, onBehalf: false }));
  it("ordinary member cannot manage or preview another's", () => {
    expect(canManageSignature("a", "b", none, true).allowed).toBe(false);
    expect(canPreviewSignature("a", "b", none, true)).toBe(false);
  });
  for (const r of ["isAdmin", "isSecretary", "isCurrentWm"] as const) {
    it(`${r} may act on behalf in the same unit only`, () => {
      expect(canManageSignature("a", "b", { ...none, [r]: true }, true)).toEqual({ allowed: true, onBehalf: true });
      expect(canManageSignature("a", "b", { ...none, [r]: true }, false).allowed).toBe(false);
    });
  }
});

describe("consent on behalf", () => {
  const today = "2026-10-21";
  it("requires a note", () => expect(checkConsent({ note: " ", date: today, confirmed: true }, today)).toMatch(/consent note/));
  it("requires a date", () => expect(checkConsent({ note: "Agreed in person", date: "", confirmed: true }, today)).toMatch(/date/));
  it("rejects a future date", () => expect(checkConsent({ note: "x", date: "2026-10-22", confirmed: true }, today)).toMatch(/future/));
  it("requires the tick", () => expect(checkConsent({ note: "x", date: today, confirmed: false }, today)).toMatch(/confirm/));
  it("passes when complete", () => expect(checkConsent({ note: "Member agreed", date: today, confirmed: true }, today)).toBeNull());
});
