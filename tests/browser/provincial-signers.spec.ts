import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

async function mock(page: Page, on: boolean) {
  await page.route("**/rest/v1/officer_appointments**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/member_progression_status**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/past_masters**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_template**", (r) => r.fulfill({ json: { venue_address: "Masonic Hall", regular_meeting_pattern: "Third Wednesday", lodge_representatives: [], consecration_date: "1949-01-19" } }));
  await page.route("**/rest/v1/provincial_return_submissions**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/member_signatures**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/module_settings**", (r) => {
    const u = r.request().url();
    if (u.includes("officer_signatures")) return r.fulfill({ json: on ? { value: true } : null });
    if (u.includes("provincial_return_province_email")) return r.fulfill({ json: { value: "pgs@example.org" } });
    return r.fallback();
  });
}

test("Provincial Return: no signers panel while switched off", async ({ page }) => {
  await mock(page, false);
  await page.goto("/members/admin/provincial-return");
  await expect(page.getByRole("heading", { name: "Provincial Installation Return" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Officers" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Will be signed by" })).toHaveCount(0);
});

test("Provincial Return: Will be signed by panel at 320px", async ({ page }) => {
  await mock(page, true);
  await page.goto("/members/admin/provincial-return");
  const h = page.getByRole("heading", { name: "Will be signed by" });
  await expect(h).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/No Secretary resolved/)).toBeVisible();
  await expect(page.getByText(/No Worshipful Master resolved/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await h.locator("..").screenshot({ path: "/tmp/browser/signers-panel-320.png" });
  await expectNoAxeViolations(page, "provincial signers panel");
});
