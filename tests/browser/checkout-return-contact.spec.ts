import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

for (const [label, email] of [["with address", "bookings@example.org"], ["no address", null]] as const) {
  test(`Booking not found at 320px: ${label}`, async ({ page }) => {
    await page.route("**/rest/v1/rpc/get_public_booking_details**", (r) => r.fulfill({ json: { contact_email: email } }));
    await page.goto("/checkout/return");
    await expect(page.getByRole("heading", { name: "Booking not found" })).toBeVisible({ timeout: 15000 });
    const p = page.getByText(/please contact (the Assistant Secretary|the Secretary|us)/);
    if (email) await expect(page.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
    else { await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0); await expect(p).not.toContainText(/null|undefined/); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page, `checkout return ${label}`);
  });
}
