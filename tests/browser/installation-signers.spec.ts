import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

async function mock(page: Page, on: boolean) {
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: { lodge_name: "Testbury Lodge", lodge_number: "1234", secretary_email: "sec@example.org" } }));
  await page.route("**/rest/v1/officer_appointments**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/member_progression_status**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/installation_return_submissions**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/member_signatures**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/module_settings**", (r) => {
    const u = r.request().url();
    if (u.includes("officer_signatures")) return r.fulfill({ json: on ? { value: true } : null });
    return r.fulfill({ json: null });
  });
  await page.route("**/rest/v1/unit_settings?**", (r) => r.fulfill({ json: { value: { name: "Province of Example", installation_return_email: "office@example.org" } } }));
}

test("UGLE Installation Return: no signers panel while switched off", async ({ page }) => {
  await mock(page, false);
  await page.goto("/members/admin/installation-return");
  await expect(page.getByRole("heading", { name: "Submit to Province" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Will be signed by" })).toHaveCount(0);
  await expect(page.getByText(/Signature boxes stay blank/)).toBeVisible();
});

test("UGLE Installation Return: Will be signed by panel + missing message at 320px", async ({ page }) => {
  await mock(page, true);
  await page.goto("/members/admin/installation-return");
  const h = page.getByRole("heading", { name: "Will be signed by" });
  await expect(h).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/No Worshipful Master resolved/)).toBeVisible();
  await expect(page.getByText(/No Secretary resolved/)).toBeVisible();
  await expect(page.getByText(/Stored signatures are added where on file/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await h.locator("..").screenshot({ path: "/tmp/browser/ugle-signers-320.png" });
  await expectNoAxeViolations(page, "ugle signers panel");
});
