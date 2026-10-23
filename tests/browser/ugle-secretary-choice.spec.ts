import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

async function mock(page: Page) {
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: { lodge_name: "Testbury Lodge", lodge_number: "1234", secretary_email: "sec@example.org" } }));
  for (const t of ["officer_appointments", "member_progression_status", "lodge_events", "festive_board_meetings", "installation_return_submissions", "member_signatures"])
    await page.route(`**/rest/v1/${t}**`, (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/module_settings**", (r) => r.fulfill({ json: null }));
  await page.route("**/rest/v1/unit_settings?**", (r) => r.fulfill({ json: { value: { name: "Province of Example", installation_return_email: "office@example.org" } } }));
  await page.route("**/storage/v1/object/list/**", (r) => r.fulfill({ json: [{ name: "New_IR_Craft.pdf" }] }));
}

test("UGLE return: Secretary Y/N required before export, 320px + axe", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1800 });
  await mock(page);
  await page.goto("/members/admin/installation-return");
  const group = page.getByRole("radiogroup", { name: /Secretary or his details changed\? \(required\)/ });
  await expect(group).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Export PDF" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Choose Yes or No before exporting" });
  await expect(alert).toBeVisible();
  const yes = page.getByRole("radio", { name: /Yes, the Secretary/ });
  await expect(yes).toBeFocused();
  await expect(yes).toHaveAttribute("aria-invalid", "true");
  expect((await yes.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page, "ugle secretary choice (error)");

  await page.getByRole("radio", { name: "No change" }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByText("Secretary change: No")).toBeVisible();
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByText("Secretary change: No")).toBeVisible();
  await expectNoAxeViolations(page, "ugle secretary choice (chosen)");

  // Changing the year clears the choice.
  await page.getByRole("combobox", { name: "Installation year" }).click();
  await page.getByRole("option").first().click();
  await expect(page.getByText("Secretary change: No")).toHaveCount(0);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
});
