import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Mocked data only; no backend writes.
async function mock(page: Page, edit: boolean, saved: unknown[]) {
  await page.route("**/rest/v1/rpc/can_view_unit_setup**", (r) => r.fulfill({ json: true }));
  await page.route("**/rest/v1/rpc/can_edit_unit_setup**", (r) => r.fulfill({ json: edit }));
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: { unit_id: "u1", lodge_name: "Sample Lodge with an Unusually Long Name", lodge_number: "1234", consecration_date: "1950-01-01", secretary_email: "secretary@example.invalid" } }));
  await page.route("**/rest/v1/unit_settings?**", (r) => r.fulfill({ json: [{ key: "bank_details", value: { account_name: "Sample Account", sort_code: "11-22-33", account_number: "12345678", reference_pattern: "Dining + {surname}" } }] }));
  await page.route("**/rest/v1/unit_settings_audit**", (r) => r.fulfill({ json: [{ id: "a1", key: "bank_details", old_value: { sort_code: "11-22-33" }, new_value: { sort_code: "44-55-66" }, changed_by: null, changed_at: "2026-10-22T10:00:00Z" }] }));
  await page.route("**/rest/v1/rpc/save_unit_setup**", (r) => { saved.push(r.request().postDataJSON()); return r.fulfill({ json: { sort_code: "44-55-66", account_number: "87654321" } }); });
}
const overflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("Unit Setup at 320px: validation, save, axe", async ({ page }) => {
  const saved: any[] = [];
  await mock(page, true, saved);
  await page.goto("/members/admin/unit-setup");
  await expect(page.getByRole("heading", { name: "Unit Setup" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Changes appear on public booking confirmations immediately.")).toBeVisible();
  await expect(page.getByText("WM Sample Lodge with an Unusually Long Name 1234")).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "unit setup");
  await page.getByLabel("Sort code").fill("12345");
  await page.getByLabel("Account number").fill("123");
  const bank = page.getByRole("region", { name: /Bank details/ });
  await bank.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Sort code must be 6 digits.")).toBeVisible();
  await expect(page.getByText("Account number must be 8 digits.")).toBeVisible();
  expect(saved).toHaveLength(0);
  await expectNoAxeViolations(page, "unit setup errors");
  await page.getByLabel("Sort code").fill("445566");
  await page.getByLabel("Account number").fill("87654321");
  await bank.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel("Sort code")).toHaveValue("44-55-66");
  expect(saved[0]).toMatchObject({ _key: "bank_details" });
  expect((await bank.getByRole("button", { name: "Save" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("Unit Setup read-only for viewers", async ({ page }) => {
  await mock(page, false, []);
  await page.goto("/members/admin/unit-setup");
  await expect(page.getByRole("heading", { name: "Unit Setup" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByLabel("Sort code")).toHaveAttribute("readonly", "");
  await expectNoAxeViolations(page, "unit setup read-only");
});
