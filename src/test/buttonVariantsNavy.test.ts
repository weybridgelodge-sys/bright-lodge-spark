import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buttonVariants } from "@/components/ui/button";

const css = readFileSync("src/index.css", "utf8").split(".dark")[0];
const token = (n: string): number[] => {
  const m = css.match(new RegExp(`--${n}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!m) throw new Error(`token ${n} missing`);
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const k = (x: number) => (x + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (x: number) => l - a * Math.max(-1, Math.min(k(x) - 3, 9 - k(x), 1));
  return [f(0), f(8), f(4)];
};
const lum = (c: number[]) => c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v * t + b[i] * (1 - t));

// Worst realistic navy surface: a navy-light/40 card on the navy page.
const card = mix(token("navy-light"), token("navy"), 0.4);
const gold = token("gold"), cream = token("cream"), navy = token("navy");

describe("buttons on a navy surface", () => {
  it("outline and ghost never set a hover/pressed text colour (callers' gold/cream text survives a tap)", () => {
    for (const v of ["outline", "ghost"] as const) expect(buttonVariants({ variant: v })).not.toMatch(/(hover|active):text-/);
  });
  it("outlined gold text passes 4.5:1 at rest, hover (accent/15) and pressed (accent/25)", () => {
    expect(ratio(gold, card)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(gold, mix(token("accent"), card, 0.15))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(gold, mix(token("accent"), card, 0.25))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(cream, mix(token("accent"), card, 0.25))).toBeGreaterThanOrEqual(4.5);
  });
  it("solid gold (default portal) button: navy text 4.5:1", () => expect(ratio(navy, gold)).toBeGreaterThanOrEqual(4.5));
  it("destructive text 4.5:1", () => expect(ratio(token("destructive-foreground"), token("destructive"))).toBeGreaterThanOrEqual(4.5));
  it("disabled is visibly dimmer (60%) yet gold text stays legible (>= 3:1)", () => {
    expect(buttonVariants({})).toContain("disabled:opacity-60");
    expect(buttonVariants({})).toContain("aria-disabled:opacity-60");
    const dimGold = mix(gold, card, 0.6);
    expect(ratio(dimGold, card)).toBeGreaterThanOrEqual(3);
    expect(ratio(dimGold, card)).toBeLessThan(ratio(gold, card));
  });
});
