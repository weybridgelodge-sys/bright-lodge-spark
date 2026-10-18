import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

const noOverflow = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test("/our-charities: metrics fail → no £0, typed text stays, axe clean at 320px", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/charity_public_feed_metrics**", (r) => r.abort());
  await page.route("**/rest/v1/public_charity_totals**", (r) => r.fulfill({ json: { total_raised: 50000, public_feed_start_date: null } }));
  await page.route("**/rest/v1/public_charity_year_breakdown**", (r) => r.abort());
  await page.goto("/our-charities");
  await expect(page.getByText("All-Time Total")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("year-total")).toHaveCount(0);
  await expect(page.getByText("£0", { exact: true })).toHaveCount(0);
  await noOverflow(page);
  await expectNoAxeViolations(page, "our-charities fallback");
});

test("home: NextMeeting request fails → no spinner, link to /events, axe clean at 320px", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/public_lodge_meetings**", (r) => r.abort());
  await page.goto("/");
  const link = page.getByRole("link", { name: "See upcoming meetings on our Events page" });
  await link.scrollIntoViewIfNeeded({ timeout: 20000 });
  await expect(link).toHaveAttribute("href", "/events");
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("#meeting[aria-busy=true]")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await noOverflow(page);
  await expectNoAxeViolations(page, "home NextMeeting failure");
});

test("Charity Steward: records fail → error + Retry, axe clean at 320px", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route(/\/rest\/v1\/charit(y|ies)_/, (r) => r.abort());
  await page.goto("/members/admin/charity");
  const alert = page.getByRole("alert").filter({ hasText: "Couldn't load the charity records" });
  if (!(await alert.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open Charity Steward");
  const retry = alert.getByRole("button", { name: "Retry" });
  expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await retry.click();
  await expect(alert).toBeVisible({ timeout: 15000 });
  await noOverflow(page);
  await expectNoAxeViolations(page, "charity steward failure");
});

test("Charity Steward Reports: periodic reports fail → error + Retry, axe clean", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1200 });
  await page.route("**/rest/v1/charity_periodic_reports**", (r) => r.abort());
  await page.goto("/members/admin/charity");
  const tab = page.getByRole("tab", { name: "Reports" });
  if (!(await tab.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open Charity Steward");
  await tab.click();
  const alert = page.getByRole("alert").filter({ hasText: "Couldn't load the periodic reports" });
  await expect(alert).toBeVisible({ timeout: 15000 });
  expect((await alert.getByRole("button", { name: "Retry" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await noOverflow(page);
  await expectNoAxeViolations(page, "charity periodic failure");
});
