import { describe, it, expect } from "vitest";
import { checkInputFile, fitInBox, fitWithin, inkBounds, whiteToTransparent } from "@/lib/signatureImage";

/** Synthetic 6x4 image: white, with a dark 2x2 scribble at (2,1). */
function scribble() {
  const w = 6, h = 4, d = new Uint8ClampedArray(w * h * 4).fill(255);
  for (const [x, y] of [[2, 1], [3, 1], [2, 2], [3, 2]]) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
  return { d, w, h };
}

describe("signature image processing", () => {
  it("turns near-white transparent and keeps ink", () => {
    const { d } = scribble();
    whiteToTransparent(d);
    expect(d[3]).toBe(0);
    expect(d[(1 * 6 + 2) * 4 + 3]).toBe(255);
  });
  it("trims to the ink", () => {
    const { d, w, h } = scribble();
    whiteToTransparent(d);
    expect(inkBounds(d, w, h)).toEqual({ x: 2, y: 1, w: 2, h: 2 });
  });
  it("blank image has no ink", () => {
    const d = new Uint8ClampedArray(16).fill(255);
    expect(inkBounds(whiteToTransparent(d), 2, 2)).toBeNull();
  });
  it("resizes to at most 600x200 keeping aspect", () => {
    expect(fitWithin(1200, 200)).toEqual({ w: 600, h: 100 });
    expect(fitWithin(300, 400)).toEqual({ w: 150, h: 200 });
    expect(fitWithin(100, 50)).toEqual({ w: 100, h: 50 });
  });
  it("fits a document box keeping aspect, vertically centred", () => {
    const r = fitInBox(600, 100, 220, 40);
    expect(r.w).toBeCloseTo(220); expect(r.h).toBeCloseTo(36.67, 1); expect(r.dx).toBe(0); expect(r.dy).toBeCloseTo(1.67, 1);
    const t = fitInBox(100, 100, 220, 40);
    expect(t.h).toBe(40); expect(t.w).toBe(40);
  });
  it("accepts only PNG/JPEG up to 2 MB", () => {
    expect(checkInputFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(checkInputFile({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(checkInputFile({ type: "image/gif", size: 10 })).toMatch(/PNG or JPEG/);
    expect(checkInputFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
  });
});
