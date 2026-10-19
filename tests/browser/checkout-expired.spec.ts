import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

test("expired card booking session: message, start-again link, 44px, axe clean at 320px", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  // Mocked: no real booking or Stripe session.
  await page.route("**/functions/v1/get-booking-by-session", (r) => r.fulfill({ json: { booking: null, session_expired: true } }));
  await page.goto("/checkout/return?session_id=cs_test_aaaaaaaaaaaaaaaaaaaaaaaa");
  await expect(page.getByText("We're sorry, your booking session has expired. Please start again.")).toBeVisible({ timeout: 20000 });
  const again = page.getByRole("link", { name: "Start a new booking" });
  expect(await again.getAttribute("href")).toBe("/bookings");
  expect((await again.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "checkout expired");
});
