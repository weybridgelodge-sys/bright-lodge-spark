import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

/** Every outline-style button with a light fill: text/icon colour vs fill must reach 4.5:1. */
async function outlineContrasts(page: Page) {
  return page.evaluate(() => {
    const lum = (c: string) => { const m = c.match(/[\d.]+/g)!.map(Number); const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const out: { label: string; ratio: number }[] = [];
    document.querySelectorAll("main button, main a").forEach((el) => {
      const cs = getComputedStyle(el); const bg = cs.backgroundColor;
      if (!/rgb\(/.test(bg) || lum(bg) < 0.6 || (el as HTMLElement).offsetParent === null) return;
      const a = lum(cs.color), b = lum(bg);
      out.push({ label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) });
    });
    return out;
  });
}

test("Charity Steward Reports at 320px: buttons/icons ≥4.5:1, cards readable, 44px, axe clean", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1400 });
  for (const t of ["charity_ledger", "charity_collections", "charity_donations"]) await page.route(`**/rest/v1/${t}**`, (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/charity_festival_settings**", (r) => r.fulfill({ json: null }));
  await page.route("**/rest/v1/rpc/can_edit_charity**", (r) => r.fulfill({ json: true }));
  await page.route("**/rest/v1/charity_periodic_reports**", (r) => r.fulfill({ json: [{ id: "a", title: "report from May to Oct 2026", start_date: "2026-05-01", end_date: "2026-10-31", notes: null, finalised_at: null, created_at: "2026-10-18T10:00:00Z", updated_at: "2026-10-18T10:00:00Z" }] }));
  await page.goto("/members/admin/charity");
  const tab = page.getByRole("tab", { name: "Reports" });
  if (!(await tab.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open Charity Steward");
  await tab.click();
  await expect(page.getByText("Report from May to Oct 2026")).toBeVisible({ timeout: 15000 });
  for (const name of ["Save draft", "Save & Finalise", "Download PDF: Report from May to Oct 2026", "Edit: Report from May to Oct 2026", "Delete: Report from May to Oct 2026"]) {
    const b = page.getByRole("button", { name, exact: true });
    expect((await b.boundingBox())!.height, name).toBeGreaterThanOrEqual(44);
  }
  const ratios = await outlineContrasts(page);
  console.log("RATIOS", JSON.stringify(ratios));
  for (const r of ratios) expect(r.ratio, r.label).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Edit: Report from May to Oct 2026" }).focus();
  await expect(page.getByRole("button", { name: "Edit: Report from May to Oct 2026" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "charity reports");
});
