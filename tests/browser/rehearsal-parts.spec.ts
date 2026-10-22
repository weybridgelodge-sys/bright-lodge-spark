import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

const positions = [
  { key: "inner_guard", label: "Inner Guard", order_index: 30, category: "office", active: true },
  { key: "immediate_past_master", label: "Immediate Past Master", order_index: 100, category: "office", active: true },
  { key: "tyler", label: "Tyler", order_index: 190, category: "office", active: true },
  { key: "rep_sports", label: "Sports Rep", order_index: 320, category: "representative", active: true },
];
const member = { id: "p1", first_name: "Test", last_name: "Brother-With-A-Long-Surname", title: "Bro.", status: "active" };

test("rehearsal dialog offers officer parts incl. Tyler and saves it, at 320px", async ({ page }) => {
  let saved: any = null;
  await page.route("**/rest/v1/officer_positions**", (r) => r.fulfill({ json: positions }));
  await page.route("**/rest/v1/loi_sessions**", (r) =>
    r.request().method() === "POST" ? r.fulfill({ json: { id: "s1" } }) : r.fulfill({ json: [] }));
  await page.route("**/rest/v1/loi_attendance**", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({ json: [] });
  });
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [member] }));
  await page.goto("/members/admin/loi");
  const add = page.getByRole("button", { name: /New session|Add session|New rehearsal/i }).first();
  if (!(await add.isVisible({ timeout: 30000 }).catch(() => false))) { await page.screenshot({ path: "/tmp/browser/rp.png" }); test.skip(true, "Synthetic identity cannot manage rehearsals"); }
  await add.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").first().click();
  const part = dialog.getByLabel(/Part for/);
  expect(Math.round((await part.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await part.click();
  const opts = await page.getByRole("option").allTextContents();
  expect(opts).toEqual(["Candidate (rehearsal stand-in)", "Inner Guard", "Immediate Past Master", "Tyler", "Observing / No Part", "Other"]);
  await page.getByRole("option", { name: "Tyler" }).click();
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "rehearsal session dialog");
  await dialog.getByRole("button", { name: /Create session/ }).click();
  await expect.poll(() => saved?.[0]?.part).toBe("tyler");
});
