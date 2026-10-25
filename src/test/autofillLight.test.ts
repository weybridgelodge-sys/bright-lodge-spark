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

describe("autofill-light vs global dark autofill (Job BL)", () => {
  it("global dark selectors exclude .autofill-light", () => {
    for (const t of ["input", "textarea", "select"]) for (const s of ["", ":hover", ":focus", ":active"]) {
      expect(css).toContain(`${t}:-webkit-autofill:not(.autofill-light)${s}`);
      expect(css).not.toMatch(new RegExp(`(^|\\n)${t}:-webkit-autofill${s.replace(":", "\\:")}\\s*[,{]`));
    }
    for (const t of ["", "input", "textarea", "select"]) expect(css).toContain(`${t}.autofilled-dark:not(.autofill-light)`);
  });
  it("light rule wins with !important and light colour scheme", () => {
    const body = block![1];
    expect(body).toContain("-webkit-text-fill-color: hsl(var(--foreground)) !important");
    expect(body).toContain("box-shadow: 0 0 0 1000px hsl(var(--background)) inset !important");
    expect(body).toContain("background-color: hsl(var(--background)) !important");
    expect(body).toContain("color-scheme: light");
  });
  it("main.tsx skips .autofill-light", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).toContain('classList.contains("autofill-light")');
  });
  it("class is on each public form", () => {
    const has = (f: string, needle: string) => expect(readFileSync(f, "utf8")).toContain(needle);
    has("src/components/events/booking/BookingCore.tsx", "autofill-light");
    has("src/pages/PublicEvent.tsx", "className={inputCls}");
    has("src/pages/PublicEventBalance.tsx", "className={inputCls}");
    has("src/components/EnquiryForm.tsx", "autofill-light");
    has("src/components/bookings/MeetingBookingForm.tsx", "autofill-light");
    has("src/components/NewsletterSignup.tsx", "autofill-light");
  });
});
