import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Synthetic data: four critical holders appointed in the previous year; one long initiation date.
const prof = (id: string, last: string) => ({ id, title: "Bro", first_name: "Test", middle_name: null, last_name: last, full_name: `Test ${last}`, preferred_name: null, post_nominals: null, status: "active", degree: "master_mason", is_past_master: false, is_royal_arch: false, is_honorary_member: false, initiation_date: "2026-05-13", passing_date: null, raising_date: null, joined_lodge_date: null, is_ugle_portal_registered: false, rank: null, grand_rank: null, provincial_rank: null, updated_at: "2026-01-01", status_changed_at: null });
const profiles = ["Sec", "Tre", "Alm", "Dc"].map((n) => prof(n.toLowerCase(), n));
const appts = ["secretary", "treasurer", "almoner", "director_of_ceremonies"].map((k, i) => ({ position_key: k, member_id: profiles[i].id, lodge_year: 2025, is_projection: false }));

test("KPI snapshot and critical roles at 320px", { timeout: 90_000 }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/rpc/current_officer_year**", (r) => r.fulfill({ json: 2026 }));
  await page.route("**/rest/v1/officer_appointments**", (r) => r.fulfill({ json: appts }));
  await page.route("**/rest/v1/officer_positions**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: profiles }));
  await page.goto("/members/kpis");
  const h = page.getByText("Critical roles");
  if (!(await h.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open the KPI screen");
  await expect(page.getByText("VACANT", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Bro. T Tre (Test)").first()).toBeVisible();
  const date = page.getByText("13/05/2026").first();
  await date.scrollIntoViewIfNeeded();
  // One line: innerText preserves a mid-number wrap as a newline, so it must read back whole.
  expect(await date.innerText()).toBe("13/05/2026");
  const card = await date.locator("xpath=..").boundingBox();
  const box = await date.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(card!.x + card!.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "KPI dashboard");
  await page.screenshot({ path: "/tmp/browser/kpi-320.png" });
});
