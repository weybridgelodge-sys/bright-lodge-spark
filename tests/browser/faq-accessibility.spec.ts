import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

test("/faq at 320px: no overflow, axe clean, full-width 44px accordion rows", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/rpc/get_join_us_costs**", (r) => r.fulfill({ json: [{ annual_dues_pence: 25000, dining_price_pence: 3500, ugle_registration_fee_pence: 13200, under_25_discount_percent: 50 }] }));
  await page.goto("/faq");
  const cost = page.getByRole("button", { name: "What does membership cost?" });
  await cost.waitFor({ timeout: 20000 });
  const triggers = await page.locator("main [data-radix-collection-item], main button[aria-expanded]").all();
  expect(triggers.length).toBeGreaterThan(10);
  for (const t of triggers) {
    const b = (await t.boundingBox())!;
    const item = (await t.locator("xpath=ancestor::*[@data-state][@data-orientation][1]/..").boundingBox().catch(() => null)) ?? b;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(item.width - 50); // trigger spans row minus item padding
  }
  await cost.click();
  await expect(cost).toHaveAttribute("aria-expanded", "true");
  expect((await cost.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "faq open + closed");
});
