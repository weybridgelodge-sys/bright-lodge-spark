import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Synthetic scribble only — never a real signature.
// 1x1 synthetic PNG (not a signature).
const TINY_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function mock(page: Page, on: boolean, hasSig = false) {
  await page.route("**/rest/v1/module_settings**", (r) =>
    r.request().url().includes("officer_signatures") ? r.fulfill({ json: on ? { value: true } : null }) : r.fallback());
  await page.route("**/rest/v1/member_signatures**", (r) => r.fulfill({ json: hasSig ? { id: "s1", created_at: "2026-10-22T06:14:59Z" } : null }));
  await page.route("**/functions/v1/signature-upload", (r) => r.fulfill({ json: { ok: true, signature: { id: "s2", width: 300, height: 90 } } }));
  await page.route("**/functions/v1/signature-preview", (r) => r.fulfill({ status: 200, contentType: "application/octet-stream", body: Buffer.from(TINY_PNG, "base64") }));
}

async function scribble(page: Page) {
  const pad = page.getByLabel(/Signature pad/);
  const b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + 20 + i * 18, b.y + b.height / 2 + (i % 2 ? -20 : 20));
  await page.mouse.up();
}

async function check44(page: Page, names: string[]) {
  for (const n of names) {
    const b = await page.getByRole(["Draw", "Upload image"].includes(n) ? "radio" : "button", { name: n, exact: true }).boundingBox();
    expect(b!.height, n).toBeGreaterThanOrEqual(44);
    expect(b!.x + b!.width, n).toBeLessThanOrEqual(320);
  }
}

test("Profile: My signature hidden while the switch is off", async ({ page }) => {
  await mock(page, false);
  await page.goto("/members/profile");
  await expect(page.getByRole("heading", { name: "Your contact details" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "My signature" })).toHaveCount(0);
});

test("Profile: draw pad, preview and save at 320px", async ({ page }) => {
  await mock(page, true);
  await page.goto("/members/profile");
  await expect(page.getByRole("heading", { name: "My signature" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("heading", { name: "My signature" }).scrollIntoViewIfNeeded();
  await scribble(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByAltText("Signature preview")).toBeVisible();
  await check44(page, ["Draw", "Upload image", "Undo", "Clear", "Preview", "Save signature"]);
  const pad = await page.getByLabel(/Signature pad/).boundingBox();
  expect(pad!.height).toBeGreaterThanOrEqual(80);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.getByLabel(/Signature pad/).focus();
  await expect(page.getByLabel(/Signature pad/)).toBeFocused();
  await expectNoAxeViolations(page, "profile signature draw");
  await page.getByRole("button", { name: "Save signature" }).click();
  await expect(page.getByText("Signature saved")).toBeVisible();
});

test("Profile: upload mode at 320px", async ({ page }) => {
  await mock(page, true, true);
  await page.goto("/members/profile");
  await expect(page.getByText("Signature on file, saved 22 Oct 2026.")).toBeVisible({ timeout: 15000 });
  await page.getByRole("radio", { name: "Upload image" }).click();
  await expect(page.getByLabel(/Signature image/)).toBeVisible();
  await check44(page, ["Draw", "Upload image", "Show saved signature", "Remove signature", "Replace signature"]);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page, "profile signature upload");
});

test("Edit Member: on-behalf signature dialog needs consent, at 320px", async ({ page }) => {
  const id = "11111111-2222-3333-4444-555555555557";
  await mock(page, true);
  await page.route("**/rest/v1/rpc/get_admin_profiles**", (r) => r.fulfill({ json: [{ id, email: "long.name@example.com", title: "W Bro", first_name: "Bartholomew-Maximilian", last_name: "Featherstonehaugh-Wolstenholme", degree: "master_mason", status: "active", is_past_master: false, is_royal_arch: false, is_honorary_member: false, initiation_date: "2026-05-13" }] }));
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [{ id }] }));
  await page.goto(`/members/admin?e2e_as=secretary#member-${id}`);
  await page.getByRole("button", { name: "Signature", exact: true }).click({ timeout: 15000 });
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByRole("heading", { name: /Signature for Bartholomew/ })).toBeVisible();
  await scribble(page);
  await dlg.getByRole("button", { name: "Preview", exact: true }).click();
  const save = dlg.getByRole("button", { name: "Save signature" });
  await expect(save).toBeDisabled();
  await dlg.getByLabel("Consent note").fill("Member agreed in person");
  await dlg.getByRole("checkbox").check();
  await expect(save).toBeEnabled();
  const box = await dlg.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/browser/signature-dialog-320.png" });
  await expectNoAxeViolations(page, "edit member signature dialog");
});

test("Profile: save then the saved signature shows straight away", async ({ page }) => {
  let saved = false;
  await mock(page, true);
  await page.route("**/rest/v1/member_signatures**", (r) => r.fulfill({ json: saved ? { id: "s2", created_at: "2026-10-22T06:14:59Z" } : null }));
  await page.route("**/functions/v1/signature-upload", (r) => { saved = true; return r.fulfill({ json: { ok: true, signature: { id: "s2", width: 300, height: 90 } } }); });
  await page.goto("/members/profile");
  await expect(page.getByRole("heading", { name: "My signature" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("heading", { name: "My signature" }).scrollIntoViewIfNeeded();
  await scribble(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: "Save signature" }).click();
  await expect(page.getByText("Signature on file, saved 22 Oct 2026.")).toBeVisible();
  await expect(page.getByAltText("Saved signature")).toBeVisible();
  await expect(page.getByText("No signature on file.")).toHaveCount(0);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page, "profile signature saved state");
});

test("Profile: Show saved signature works after reload", async ({ page }) => {
  await mock(page, true, true);
  await page.goto("/members/profile");
  await page.reload();
  await expect(page.getByText("Signature on file, saved 22 Oct 2026.")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Show saved signature" }).click();
  await expect(page.getByAltText("Saved signature")).toBeVisible();
  await expect(page.getByText("No signature on file.")).toHaveCount(0);
});
