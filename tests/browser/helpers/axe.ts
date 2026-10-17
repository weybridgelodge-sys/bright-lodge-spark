import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** WCAG 2.1 A/AA scan (incl. colour-contrast). Fails on serious/critical violations; exclude only named selectors with a reason. */
export async function expectNoAxeViolations(page: Page, ctx: string, exclude: string[] = []) {
  let b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  // Radix FocusGuards: library-owned 1px aria-hidden spans at body level that bounce focus back into an open dialog/select.
  b = b.exclude("span[data-radix-focus-guard], span[aria-hidden=\"true\"][tabindex=\"0\"][style*=\"position: fixed\"]");
  // Radix toast viewport: its library-owned focus-proxy spans sit inside the <ol>; toasts themselves are still announced.
  b = b.exclude("[data-radix-toast-viewport] > span, ol[tabindex='-1'].fixed");
  for (const s of exclude) b = b.exclude(s);
  const { violations } = await b.analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} @ ${new URL(page.url()).pathname}: ${v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")} => ${n.html.slice(0, 140)}`).join(" | ")}`);
  // Soft: record every page's violations and keep going; the test still fails at the end.
  expect.soft(bad, `AXE ${ctx}`).toEqual([]);
}
