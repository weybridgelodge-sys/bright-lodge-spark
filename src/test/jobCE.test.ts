import { describe, it, expect } from "vitest";
import { fieldScrollDelta } from "@/hooks/useVisualViewport";

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
});
