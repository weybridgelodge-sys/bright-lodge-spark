import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

const TOKEN = "b".repeat(64);
async function open(page: Page, status: string) {
  await page.setViewportSize({ width: 320, height: 900 });
  // Mocked: no real confirmation and no real welcome email.
  await page.route("**/functions/v1/newsletter-confirm", (r) => r.fulfill({ json: { status } }));
  await page.goto(`/newsletter/confirm?token=${TOKEN}`);
}
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("confirmed: subscribed message, home link only, 44px, axe clean at 320px", { timeout: 90_000 }, async ({ page }) => {
  await open(page, "confirmed");
  await expect(page.getByRole("heading", { name: "You're confirmed. Thank you." })).toBeVisible({ timeout: 20000 });
  expect(page.url()).not.toContain(TOKEN); // token removed from address bar
  await expect(page.getByText(/note from our Worshipful Master is on its way/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Suitability Quiz/ })).toHaveCount(0);
  const home = page.getByRole("link", { name: "Back to the home page" });
  expect(await home.getAttribute("href")).toBe("/");
  expect((await home.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("link", { name: "See what's coming up" })).toHaveCount(0);
  await expect(page.locator("main .bg-card a")).toHaveCount(1);
  expect(await noOverflow(page)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "newsletter confirmed");
});

for (const [status, heading] of [["expired", "This link has expired"], ["invalid", "This link isn't valid"]] as const) {
  test(`${status}: clear message and subscribe-again link, axe clean at 320px`, { timeout: 90_000 }, async ({ page }) => {
    await open(page, status);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 20000 });
    const again = page.getByRole("link", { name: "Subscribe again" });
    expect((await again.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator("#newsletter-signup")).toHaveCount(1);
    expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    await expectNoAxeViolations(page, `newsletter ${status}`);
  });
}

test("timeout: clear message, Retry and home link, 44px, axe clean at 320px", { timeout: 120_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.clock.install();
  await page.route("**/functions/v1/newsletter-confirm", () => { /* never answers */ });
  await page.goto(`/newsletter/confirm?token=${TOKEN}`);
  await expect(page.getByText("Confirming your subscription…")).toBeVisible({ timeout: 20000 });
  await page.clock.runFor(21_000);
  await expect(page.getByRole("heading", { name: "We could not confirm that just now" })).toBeVisible();
  for (const el of [page.getByRole("button", { name: "Retry" }), page.getByRole("link", { name: "Back to the home page" })]) {
    expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await noOverflow(page)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "newsletter timeout");
});
