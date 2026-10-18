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

test("confirmed: subscribed message, quiz link to /quiz, 44px, axe clean at 320px", { timeout: 90_000 }, async ({ page }) => {
  await open(page, "confirmed");
  await expect(page.getByRole("heading", { name: "You're subscribed" })).toBeVisible({ timeout: 20000 });
  expect(page.url()).not.toContain(TOKEN); // token removed from address bar
  const quiz = page.getByRole("link", { name: /2-Minute Suitability Quiz/ });
  expect(await quiz.getAttribute("href")).toBe("/quiz");
  expect((await quiz.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await noOverflow(page)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "newsletter confirmed");
  await quiz.click();
  await expect(page).toHaveURL(/\/quiz$/);
  await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: 20000 });
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
