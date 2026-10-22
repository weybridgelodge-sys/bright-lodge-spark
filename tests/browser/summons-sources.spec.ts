import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Synthetic data only: carried-forward officers, a ladder projection, a saved schedule and a linked rep with no typed name.
const prof = (id: string, first: string, last: string, extra: Record<string, unknown> = {}) => ({ id, title: "Bro", first_name: first, middle_name: null, last_name: last, full_name: `${first} ${last}`, preferred_name: null, post_nominals: null, rank: null, grand_rank: null, provincial_rank: null, is_past_master: false, is_royal_arch: false, is_honorary_member: false, initiation_date: "2010-01-01", joined_lodge_date: null, joined_year: null, status: "active", email: null, ...extra });
const profiles = [prof("p1", "Bartholomew", "Featherstonehaugh-Wolstenholme", { is_past_master: true, provincial_rank: "PProvJGW" }), prof("p2", "Ann", "Example"), prof("p3", "Sam", "Sample", { is_honorary_member: true })];
const appts = [
  { position_key: "treasurer", member_id: "p1", lodge_year: 2025, is_projection: false, override_reason: null },
  { position_key: "worshipful_master", member_id: "p2", lodge_year: 2026, is_projection: false, override_reason: null },
  { position_key: "senior_warden", member_id: "p3", lodge_year: 2026, is_projection: true, override_reason: null },
];
const schedule = [{ month: 2, ordinal: "3", weekday: 3, meeting_type: "regular" }, { month: 10, ordinal: "3", weekday: 3, meeting_type: "installation" }];

async function mock(page: Page) {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/rpc/current_officer_year**", (r) => r.fulfill({ json: 2026 }));
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/officer_appointments**", (r) => r.fulfill({ json: appts }));
  await page.route("**/rest/v1/member_progression_status**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: profiles }));
  await page.route("**/rest/v1/meeting_series**", (r) => r.fulfill({ json: [{ schedule, active: true, created_at: "2026-01-01" }] }));
  await page.route("**/rest/v1/lodge_template**", (r) => r.fulfill({ json: { id: "default", regular_meeting_pattern: "Typed manual pattern text", lodge_representatives: [{ role: "Lodge representative to Sports", name: "", member_id: "p2" }], royal_arch_rep: null, honorary_members: null } }));
  await page.route("**/rest/v1/module_settings**", (r) => r.request().url().includes("meeting_pattern_manual_override") ? r.fulfill({ json: null }) : r.fallback());
}

async function open(page: Page, tab: RegExp) {
  await page.goto("/members/summons");
  const t = page.getByRole("tab", { name: tab });
  if (!(await t.waitFor({ timeout: 20000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open the Summons Builder");
  await t.click();
}
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test("Officer Roll shows carried-forward and ladder names at 320px", { timeout: 90_000 }, async ({ page }) => {
  await mock(page);
  await open(page, /Officer Roll/);
  await expect(page.getByText("Carried forward from 2025")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Featherstonehaugh-Wolstenholme/).first()).toBeVisible();
  await expect(page.getByText("Planned (Progression Ladder)")).toBeVisible();
  await expect(page.getByText("Confirmed").first()).toBeVisible();
  await noOverflow(page);
  await expectNoAxeViolations(page, "summons officer roll");
});

test("Template tab previews the schedule sentence and override at 320px", { timeout: 90_000 }, async ({ page }) => {
  await mock(page);
  await open(page, /Lodge Template/);
  await expect(page.getByTestId("pattern-generated")).toContainText("3rd Wednesday in February and 3rd Wednesday in October (Installation).", { timeout: 15000 });
  await expect(page.getByTestId("pattern-prints")).toContainText("from schedule");
  const box = await page.getByText("Use manual text instead of the schedule").boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await noOverflow(page);
  await expectNoAxeViolations(page, "summons template tab");
});
