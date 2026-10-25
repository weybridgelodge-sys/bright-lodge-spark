import { describe, it, expect } from "vitest";
import { fieldScrollDelta, keyboardInset } from "@/hooks/useVisualViewport";

describe("JOB CE fieldScrollDelta", () => {
  const box = { top: 8, bottom: 752 };
  it("layout viewport shrinks (resizes-content): visual viewport unchanged, innerHeight halves", () => {
    expect(fieldScrollDelta({ top: 600, bottom: 680 }, box, { height: 760, offsetTop: 0 }, 380)).toBe(316);
  });
  it("last field (Notes) behind a half-height keyboard is lifted above it", () => {
    expect(fieldScrollDelta({ top: 620, bottom: 700 }, box, { height: 380, offsetTop: 0 }, 760)).toBe(336);
  });
  it("no keyboard: visible field needs no scroll", () => {
    expect(fieldScrollDelta({ top: 620, bottom: 700 }, box, { height: 760, offsetTop: 0 }, 760)).toBe(0);
  });
  it("keyboardInset is layout minus visual, never negative", () => {
    expect(keyboardInset(760, { height: 380, offsetTop: 0 })).toBe(380);
    expect(keyboardInset(380, { height: 380, offsetTop: 0 })).toBe(0);
    expect(keyboardInset(300, { height: 380, offsetTop: 0 })).toBe(0);
  });
});

