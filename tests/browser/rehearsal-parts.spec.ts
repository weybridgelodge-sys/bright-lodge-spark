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
  await page.route("**/rest/v1/installation_rule_settings**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/officer_installation_dates**", (r) => r.fulfill({ json: [] }));
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
  await expect(add).toBeVisible({ timeout: 90000 });
  await add.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").first().click();
  const part = dialog.getByLabel(/Part for/);
  expect(Math.round((await part.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await part.click();
  const opts = await page.getByRole("option").allTextContents();
  expect(opts).toEqual(["Candidate (rehearsal stand-in)", "Inner Guard", "Immediate Past Master", "Tyler", "Observing / No Part", "Other"]);
  await page.getByRole("option", { name: "Tyler" }).click();
  await expect(part).toHaveText("Tyler");
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "rehearsal session dialog");
  await dialog.getByRole("button", { name: /Create session/ }).click();
  await expect.poll(() => saved?.[0]?.part).toBe("tyler");
});

test("expanded attendance rows never clip long names at 320px", async ({ page }) => {
  const longMembers = [
    { id: "m1", title: "W Bro.", first_name: "Maximilian", last_name: "Grundy", post_nominals: "PPGSwdB", preferred_name: null, full_name: null, middle_name: null, is_past_master: true, rank: null, grand_rank: null, provincial_rank: null },
    { id: "m2", title: "W Bro.", first_name: "Bartholomew", last_name: "Featherstonehaugh-Tidmarsh", post_nominals: "PAGDC PPrGReg", preferred_name: null, full_name: null, middle_name: null, is_past_master: true, rank: null, grand_rank: null, provincial_rank: null },
  ];
  await page.route("**/rest/v1/installation_rule_settings**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/officer_installation_dates**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/officer_positions**", (r) => r.fulfill({ json: [
    ...positions,
    { key: "director_of_ceremonies", label: "Director of Ceremonies", order_index: 120, category: "office", active: true },
  ] }));
  await page.route("**/rest/v1/loi_sessions**", (r) => r.fulfill({ json: [{ id: "s1", session_date: "2026-10-15", focus: "general", focus_other: null, kpi_category: null, notes: null }] }));
  await page.route("**/rest/v1/loi_attendance**", (r) => r.fulfill({ json: [
    { id: "a1", session_id: "s1", member_id: "m1", part: "immediate_past_master", part_other: null },
    { id: "a2", session_id: "s1", member_id: "m2", part: "director_of_ceremonies", part_other: null },
  ] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: longMembers }));
  await page.goto("/members/admin/loi");
  const toggle = page.getByRole("button", { name: /attended/ }).first();
  await expect(toggle).toBeVisible({ timeout: 90000 });
  await toggle.click();
  const rows = page.locator("li li");
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) {
    const n = row.locator("span").first();
    const s = await n.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, to: getComputedStyle(el).textOverflow }));
    expect(s.sw).toBeLessThanOrEqual(s.cw);
    expect(s.to).not.toBe("ellipsis");
  }
  await expect(rows.nth(1)).toContainText("Grundy");
  await expect(rows.nth(1)).toContainText("Immediate Past Master");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await rows.nth(1).screenshot({ path: "/tmp/browser/loi-row-after.png" });
  await expectNoAxeViolations(page, "rehearsal attendance rows");
});
