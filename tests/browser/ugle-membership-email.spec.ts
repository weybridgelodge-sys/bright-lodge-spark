import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Mocked data only; no backend writes, nothing generated or sent.
async function mock(page: Page, unitEmail: string | null, saved: any[]) {
  let override: string | null = null;
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: { lodge_name: "Testbury Lodge", lodge_number: "1234", secretary_email: "sec@example.org" } }));
  for (const t of ["officer_appointments", "member_progression_status", "lodge_events", "festive_board_meetings", "installation_return_submissions", "member_signatures"])
    await page.route(`**/rest/v1/${t}**`, (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/module_settings**", (r) => {
    if (r.request().method() === "POST") { const b = r.request().postDataJSON(); saved.push(b); override = b.value; return r.fulfill({ status: 201, json: [] }); }
    return r.fulfill({ json: override ? { value: override } : null });
  });
  await page.route("**/rest/v1/unit_settings?**", (r) => {
    const u = r.request().url();
    if (u.includes("membership_officer_email")) return r.fulfill({ json: unitEmail ? { value: { email: unitEmail } } : null });
    return r.fulfill({ json: { value: { name: "Province of Example", installation_return_email: "office@example.org" } } });
  });
  await page.route("**/storage/v1/object/list/**", (r) => r.fulfill({ json: [{ name: "New_IR_Craft.pdf" }] }));
}

test("UGLE return: Membership Officer email from Unit Setup, override, clear; 320px + axe", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1800 });
  const saved: any[] = [];
  await mock(page, "mo@example.org", saved);
  await page.goto("/members/admin/installation-return");
  const input = page.getByLabel("Membership Officer lodge email", { exact: true });
  await expect(input).toHaveValue("mo@example.org", { timeout: 15000 });
  await expect(page.getByText("From Unit Setup")).toBeVisible();
  await expectNoAxeViolations(page, "ugle membership email (unit setup)");

  await page.getByRole("button", { name: "Use a different address" }).click();
  await input.fill("not-an-email");
  await page.getByRole("button", { name: "Save override" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();
  expect(saved).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page, "ugle membership email (error)");

  await input.fill("  Other@Example.ORG ");
  await page.getByRole("button", { name: "Save override" }).click();
  await expect(page.getByText("Override for this return")).toBeVisible();
  expect(saved[0].value).toBe("other@example.org");
  await expect(input).toHaveValue("other@example.org");
  const clear = page.getByRole("button", { name: "Clear override" });
  expect((await clear.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await clear.click();
  await expect(page.getByText("From Unit Setup")).toBeVisible();
  expect(saved[1].value).toBeNull();
  await expectNoAxeViolations(page, "ugle membership email (cleared)");
});

test("UGLE return: fallback wording when nothing set", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1800 });
  await mock(page, null, []);
  await page.goto("/members/admin/installation-return");
  await expect(page.getByText("Fallback: no address set")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("No Membership Officer lodge email set in Unit Setup; using the fallback address.")).toBeVisible();
});
