import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

const identity = { unit_id: "u1", lodge_name: "Testbury Lodge", lodge_number: "1234", consecration_date: "1950-02-03", secretary_email: "sec@example.org", email_domain: "example.org" };
const schedule = [
  { month: 2, ordinal: "1", weekday: 2, meeting_type: "regular" },
  { month: 11, ordinal: "last", weekday: 2, meeting_type: "installation" },
];
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

async function returnMocks(page: Page) {
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: identity }));
  await page.route("**/rest/v1/installation_rule_settings**", (r) => r.fulfill({ json: { mode: "weekday_rule", installation_month: 11, installation_ordinal: "last", installation_weekday: 2, fixed_day: null } }));
  await page.route("**/rest/v1/officer_appointments**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/officer_positions**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/member_progression_status**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/past_masters**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_template**", (r) => r.fulfill({ json: { venue_address: "Hall", regular_meeting_pattern: "Typed pattern", lodge_representatives: [] } }));
  await page.route("**/rest/v1/*_submissions**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/member_signatures**", (r) => r.fulfill({ json: [] }));
}

test("Lodge Profile at 320px uses the saved schedule", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_meeting_pattern**", (r) => r.fulfill({ json: { schedule, manual_text: "x", manual_override: false } }));
  await page.goto("/lodge-profile");
  await expect(page.getByText("1st Tuesday in February")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Last Tuesday in November (Installation)")).toBeVisible();
  await expect(page.getByText("2nd Wednesday in May")).toHaveCount(0);
  await noOverflow(page);
  await page.waitForTimeout(1500); // let fade-in animations finish before the contrast scan
  await expectNoAxeViolations(page, "lodge profile (schedule)");
});

test("Lodge Profile keeps its text when no schedule is saved", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_meeting_pattern**", (r) => r.fulfill({ json: { schedule: [], manual_text: null, manual_override: false } }));
  await page.goto("/lodge-profile");
  await expect(page.getByText("2nd Wednesday in May")).toBeVisible({ timeout: 15000 });
  await noOverflow(page);
  await page.waitForTimeout(1500); // let fade-in animations finish before the contrast scan
  await expectNoAxeViolations(page, "lodge profile (fallback)");
});

test("UGLE return shows identity and rule wording from records at 320px", async ({ page }) => {
  await returnMocks(page);
  await page.goto("/members/admin/installation-return");
  await expect(page.getByText("Testbury Lodge No. 1234")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/prescribed by by-laws \(Last Tuesday in November\)/)).toBeVisible();
  await noOverflow(page);
  await expectNoAxeViolations(page, "installation return");
});

test("Provincial return shows lodge line from records at 320px", async ({ page }) => {
  await returnMocks(page);
  await page.goto("/members/admin/provincial-return");
  await expect(page.getByText("TESTBURY L1234")).toBeVisible({ timeout: 15000 });
  await noOverflow(page);
  await expectNoAxeViolations(page, "provincial return");
});
