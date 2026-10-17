import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** WCAG 2.1 A/AA scan (incl. colour-contrast). Fails on serious/critical violations; exclude only named selectors with a reason. */
export async function expectNoAxeViolations(page: Page, ctx: string, exclude: string[] = []) {
  let b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  for (const s of exclude) b = b.exclude(s);
  const { violations } = await b.analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`);
  expect(bad, `axe ${ctx}`).toEqual([]);
}
