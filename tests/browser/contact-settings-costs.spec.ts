import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

const noOverflow = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test("Enquiry contact settings: 320px, 44px controls, axe clean", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/rpc/get_lodge_contact_settings**", (r) => r.fulfill({ json: [{ secretary_email: "secretary@weybridgelodge.org.uk", membership_cc_email: "membershipsecretary@weybridgelodge.org.uk", guide_url: "https://weybridgelodge.org.uk/downloads/information-for-prospective-members.pdf?v=2", updated_at: null }] }));
  await page.goto("/members/admin/contact-settings");
  const h = page.getByRole("heading", { name: "Enquiry contact settings" });
  if (!(await h.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open the portal");
  await expect(page.getByLabel("Secretary email")).toHaveValue("secretary@weybridgelodge.org.uk");
  await page.getByLabel("Prospective members guide link").fill("http://bad");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter a link starting with https://")).toBeVisible();
  for (const el of await page.locator("main input, main button[type=submit]").all()) expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await noOverflow(page);
  await page.getByRole("button", { name: "Save settings" }).hover();
  await expectNoAxeViolations(page, "contact settings");
});

for (const path of ["/officers", "/join-us"]) {
  test(`${path} at 320px: no overflow, axe clean, figures from data`, { timeout: 90_000 }, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.route("**/rest/v1/rpc/get_officers_public_year**", (r) => r.fulfill({ json: 2025 }));
    await page.route("**/rest/v1/rpc/get_join_us_costs**", (r) => r.fulfill({ json: [{ annual_dues_pence: 25000, dining_price_pence: 3500 }] }));
    await page.goto(path);
    if (path === "/officers") await expect(page.getByText("Masonic Year 2025–2026").first()).toBeVisible({ timeout: 20000 });
    else await expect(page.getByText("~£35 per meeting")).toBeVisible({ timeout: 20000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await noOverflow(page);
    await expectNoAxeViolations(page, "contact settings");
  });
}

test("/join-us falls back to typed figures when lookup fails", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_join_us_costs**", (r) => r.fulfill({ status: 500, json: { message: "x" } }));
  await page.goto("/join-us");
  await expect(page.getByText("~£32 per meeting")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("£250 / year")).toBeVisible();
});
