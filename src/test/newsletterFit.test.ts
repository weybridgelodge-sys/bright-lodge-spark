import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const nl = readFileSync("src/components/NewsletterSignup.tsx", "utf8");
const footer = readFileSync("src/components/Footer.tsx", "utf8");
describe("newsletter card fits its column (Job BM)", () => {
  it("card, row and field can shrink", () => {
    expect(nl).toContain("w-full max-w-full min-w-0 rounded-2xl");
    expect(nl).toContain('flex gap-2 min-w-0');
    expect(nl).toContain('relative flex-1 min-w-0');
  });
  it("Turnstile is contained and scaled from the left by container width", () => {
    expect(nl).toContain("max-w-full min-w-0 overflow-hidden");
    expect(nl).toContain("ResizeObserver");
    expect(nl).toContain('transformOrigin: "top left"');
  });
  it("footer column can shrink", () => {
    expect(footer).toContain("grid grid-cols-1 md:grid-cols-3");
    expect(footer).toContain("md:col-span-2 max-w-md min-w-0");
  });
  it("44px tap targets", () => {
    expect((nl.match(/min-h-\[44px\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
