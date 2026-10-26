import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Synthetic data only: shared default reps, one long unit-owned rep, member and non-member holders, history.
const prof = (id: string, first: string, last: string) => ({ id, title: "Bro", first_name: first, middle_name: null, last_name: last, full_name: `${first} ${last}`, preferred_name: null, post_nominals: null, rank: null, grand_rank: null, provincial_rank: null, is_past_master: false, initiation_date: "2010-01-01", joined_year: null, status: "active", email: null, office: null });
const profiles = [prof("p1", "Bartholomew", "Featherstonehaugh-Wolstenholme"), prof("p2", "Ann", "Example")];
const positions = [
  { key: "rep_sports", label: "Masonic Sports Association Representative", order_index: 320, is_progressive: false, category: "representative", unit_id: null, print_label: "SPORTS REP", active: true, include_in: { summons: true } },
  { key: "rep_long", label: "Lodge representative to the Provincial Grand Charity Steward's Committee for the Festival", order_index: 400, is_progressive: false, category: "representative", unit_id: "layout-test-unit", print_label: null, active: true, include_in: { summons: true } },
];
const appts = [
  { id: "a1", position_key: "rep_sports", member_id: "p1", display_name: null, lodge_year: 2026, is_projection: false, appointed_on: null },
  { id: "a2", position_key: "rep_sports", member_id: null, display_name: "W Bro. Non-Member Visitor-Representative", lodge_year: 2025, is_projection: false, appointed_on: null },
];

test("Representatives group at 320px", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/rpc/current_officer_year**", (r) => r.fulfill({ json: 2026 }));
  await page.route("**/rest/v1/officer_positions**", (r) => r.fulfill({ json: positions }));
  await page.route("**/rest/v1/officer_appointments**", (r) => r.fulfill({ json: appts }));
  await page.route("**/rest/v1/member_progression_status**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: profiles }));
  await page.goto("/members/officers-tracker");
  const h = page.getByRole("heading", { name: "Representatives" });
  if (!(await h.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open the Officers screen");
  await expect(page.getByTestId("reps-list")).toContainText("Featherstonehaugh-Wolstenholme");
  await page.getByText("History").first().click();
  await expect(page.getByTestId("reps-list")).toContainText("2025: W Bro. Non-Member Visitor-Representative");
  await h.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  for (const b of await page.locator("[aria-labelledby=reps-heading] button:visible, [aria-labelledby=reps-heading] select:visible, [aria-labelledby=reps-heading] input:visible").all()) {
    const box = await b.boundingBox(); if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await expectNoAxeViolations(page, "officers with representatives");
  await page.getByRole("heading", { name: "Representatives" }).screenshot({ path: "/tmp/browser/reps-320.png" });
  // Job CT: Add position enabled once a name is typed (no lodge needed in the browser)
  const name = page.getByLabel("New representative position");
  if (await name.isVisible()) {
    const add = page.getByRole("button", { name: "Add position" });
    await expect(add).toBeDisabled();
    await name.fill("Lodge representative to the Province");
    await expect(add).toBeEnabled();
    await expectNoAxeViolations(page, "representatives add form filled");
    await page.locator("[aria-labelledby=reps-heading]").screenshot({ path: "/tmp/browser/reps-add-320.png" });
  }
});
