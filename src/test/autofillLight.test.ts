import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inputCls } from "@/components/events/booking/BookingCore";

const css = readFileSync("src/index.css", "utf8");
const block = css.match(/\.autofill-light:-webkit-autofill,[\s\S]*?\{([\s\S]*?)\}/);

describe("autofill-light", () => {
  it("styles autofill, hover, focus and active states", () => {
    for (const s of ["", ":hover", ":focus", ":active"]) expect(css).toContain(`.autofill-light:-webkit-autofill${s}`);
  });
  it("uses only theme tokens for colour", () => {
    const body = block![1];
    expect(body).toContain("-webkit-text-fill-color: hsl(var(--foreground))");
    expect(body).toContain("hsl(var(--background)) inset");
    expect(body).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(\d/i);
  });
  it("is applied to the shared booking input class", () => {
    expect(inputCls).toContain("autofill-light");
  });
});
