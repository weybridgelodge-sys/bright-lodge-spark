import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Home at 320px: app renders styled after the non-blocking stylesheet, no overflow, axe clean.
test("home page at 320px loads styled with no overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Enquire About Joining" })).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("header")!).position)).not.toBe("static");
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "home page");
});
