import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIELD_TOKENS, fieldCls } from "@/lib/fieldStyle";

const css = readFileSync("src/index.css", "utf8").split(".dark")[0];
const token = (n: string): [number, number, number] => {
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
// Diary cards: navy-light at 30% over the navy-dark canvas.
const surround = mix(token("navy-light"), token("navy-dark"), 0.3);

describe("portal field contrast (diary screen)", () => {
  const bg = token(FIELD_TOKENS.background);
  it("text is at least 4.5:1", () => expect(ratio(token(FIELD_TOKENS.text), bg)).toBeGreaterThanOrEqual(4.5));
  it("placeholder is at least 4.5:1", () => expect(ratio(token(FIELD_TOKENS.placeholder), bg)).toBeGreaterThanOrEqual(4.5));
  it("label is at least 4.5:1 on the card", () => expect(ratio(token(FIELD_TOKENS.label), surround)).toBeGreaterThanOrEqual(4.5));
  it("border is at least 3:1 against its surroundings", () =>
    expect(ratio(mix(token(FIELD_TOKENS.border), surround, FIELD_TOKENS.borderAlpha), surround)).toBeGreaterThanOrEqual(3));
  it("disabled text stays at least 4.5:1", () => expect(ratio(token(FIELD_TOKENS.text), token(FIELD_TOKENS.disabledBackground))).toBeGreaterThanOrEqual(4.5));
  it("class string uses the declared tokens", () => {
    for (const c of [`bg-${FIELD_TOKENS.background}`, `text-${FIELD_TOKENS.text}`, `placeholder:text-${FIELD_TOKENS.placeholder}`, `border-${FIELD_TOKENS.border}/${FIELD_TOKENS.borderAlpha * 100}`, "min-h-[44px]"]) expect(fieldCls).toContain(c);
  });
  it("diary screen uses no other field colours", () => {
    const src = readFileSync("src/pages/members/admin/MeetingDiary.tsx", "utf8");
    expect(src).not.toMatch(/(Input|Textarea|select)[^>]*bg-navy-dark/);
    expect(src).not.toMatch(/placeholder:text-muted/);
  });
});
