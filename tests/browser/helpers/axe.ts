import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** WCAG 2.1 A/AA scan (incl. colour-contrast). Fails on serious/critical violations; exclude only named selectors with a reason. */
export async function expectNoAxeViolations(page: Page, ctx: string, exclude: string[] = []) {
  let b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  // Radix toast viewport: its library-owned focus-proxy spans sit inside the <ol>; toasts themselves are still announced.
  b = b.exclude("[data-radix-toast-viewport] > span, ol[tabindex='-1'].fixed");
  for (const s of exclude) b = b.exclude(s);
  const { violations } = await b.analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} @ ${new URL(page.url()).pathname}: ${v.nodes.slice(0, 4).map((n) => n.html.slice(0, 160)).join(" | ")}`);
  expect(bad, `axe ${ctx}`).toEqual([]);
}
