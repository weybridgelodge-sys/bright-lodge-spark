import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SendWarningsNote, { SEND_WARNING_CLASS } from "@/components/members/SendWarningsNote";

const all = readFileSync("src/index.css", "utf8");
const themes = [all.split(".dark")[0], all.split(".dark")[1] ?? all];
const token = (css: string, n: string) => {
  const m = (css.match(new RegExp(`--${n}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`)) ?? all.match(new RegExp(`--${n}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`)))!;
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const k = (x: number) => (x + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((x) => l - a * Math.max(-1, Math.min(k(x) - 3, 9 - k(x), 1)));
};
const lum = (c: number[]) => c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe("send dialog warning line", () => {
  it("is announced and states the count", () => {
    render(<SendWarningsNote count={3} />);
    expect(screen.getByRole("alert").textContent).toBe("3 warnings are still showing on the page.");
  });
  it("renders nothing with no warnings", () => {
    const { container } = render(<SendWarningsNote count={0} />);
    expect(container.textContent).toBe("");
  });
  it("text/background pair is at least 4.5:1 in both themes", () => {
    expect(SEND_WARNING_CLASS).toContain("bg-destructive");
    expect(SEND_WARNING_CLASS).toContain("text-destructive-foreground");
    for (const css of themes) expect(ratio(token(css, "destructive-foreground"), token(css, "destructive"))).toBeGreaterThanOrEqual(4.5);
  });
  it("both return dialogs use the shared line", () => {
    for (const f of ["ProvincialReturn", "InstallationReturn"]) {
      const src = readFileSync(`src/pages/members/admin/${f}.tsx`, "utf8");
      expect(src).toContain("<SendWarningsNote");
      expect(src).not.toMatch(/warning\(s\) are still showing/);
    }
  });
});
