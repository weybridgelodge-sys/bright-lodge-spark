import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

async function mock(page: Page, on: boolean, pgs: string | null = "pgs@example.org") {
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: { lodge_name: "Testbury Lodge", lodge_number: "1234", secretary_email: "sec@example.org" } }));
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
    return r.fallback();
  });
  await page.route("**/rest/v1/unit_settings?**", (r) => r.fulfill({ json: pgs ? { value: { name: "Province of Example", provincial_return_email: pgs } } : null }));
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

test("Provincial Return: destination from Unit Setup; missing address blocks sending", async ({ page }) => {
  await mock(page, false);
  await page.goto("/members/admin/provincial-return");
  await expect(page.getByText("pgs@example.org").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("(change in Unit Setup > Province)")).toBeVisible();
  await expectNoAxeViolations(page, "provincial return destination");
});
test("Provincial Return: no address set -> Submit disabled", async ({ page }) => {
  await mock(page, false, null);
  await page.goto("/members/admin/provincial-return");
  await expect(page.getByText("Not set yet").first()).toBeVisible({ timeout: 15000 });
  const btn = page.getByRole("button", { name: /Submit to Province/ });
  if (await btn.count()) await expect(btn).toBeDisabled();
});

for (const [name, signed, text] of [
  ["both", { secretary: true, worshipful_master: true }, "Signatures: Secretary and Worshipful Master added from the stored signatures."],
  ["WM only", { secretary: false, worshipful_master: true }, "Signatures: Worshipful Master added; the Secretary has none on file, so that box is blank."],
  ["none", { secretary: false, worshipful_master: false }, "Signatures: none on file; boxes left blank."],
] as const) {
  test(`Provincial send dialog (${name}) at 320px`, async ({ page }) => {
    await mock(page, true);
    await page.route("**/functions/v1/generate-provincial-return", (r) => r.fulfill({ json: { ok: true, docx_path: "a.docx", pdf_path: "a.pdf", docx_url: "http://localhost/a.docx", pdf_url: "http://localhost/a.pdf", signed } }));
    await page.route("**/storage/v1/**", (r) => r.fulfill({ json: [] }));
    await page.goto("/members/admin/provincial-return");
    await page.getByRole("button", { name: /Submit to Province/ }).click({ timeout: 15000 });
    const dlg = page.getByRole("alertdialog");
    await expect(dlg.getByText(text)).toBeVisible();
    await expect(dlg.getByText("Signatures are left blank.")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page, `provincial send dialog ${name}`);
  });
}
