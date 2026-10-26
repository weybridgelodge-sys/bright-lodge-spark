import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";
import { mockSiteUnit } from "./helpers/siteUnit";

test.beforeEach(async ({ page }) => { await mockSiteUnit(page, "layout-test-unit"); });

// Mocked public lookups only (synthetic lodge); Lodge Profile figures + venue at 320px.
const unit = { lodge_name: "Sample Lodge", lodge_number: "1234", consecration_year: "1950", consecration_date: "1950-03-02", province_name: "Province of Sampleshire",
  venue_name: "Sample Hall", venue_lines: ["Sample Hall, A Long Building Name,", "Some Road,", "Town AB1 2CD"], site_url: "https://example.invalid" };
const figures = { subscribing_count: 31, honorary_count: 2, average_age: 47.3, youngest_age: 24, oldest_age: 91, latest_initiation_date: "2025-11-21" };
const pattern = { schedule: [], manual_override: false, manual_text: "1st Monday in March, 2nd Monday in June and 3rd Monday in November (Installation)." };

async function mock(page: Page, u: unknown, f: unknown, p: unknown) {
  await page.route("**/rest/v1/rpc/get_public_unit_profile**", (r) => r.fulfill({ json: u }));
  await page.route("**/rest/v1/rpc/get_public_lodge_figures**", (r) => r.fulfill({ json: f }));
  await page.route("**/rest/v1/rpc/get_meeting_pattern**", (r) => r.fulfill({ json: p }));
}
const noScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test.use({ viewport: { width: 320, height: 900 } });

test("Lodge Profile figures come from the records at 320px", async ({ page }) => {
  await mock(page, unit, figures, pattern);
  await page.goto("/lodge-profile");
  const glance = page.locator("dl");
  await glance.scrollIntoViewIfNeeded();
  const card = (label: string) => glance.locator("div", { has: page.locator("dt", { hasText: label }) }).locator("dd");
  await expect(card("Subscribing Members")).toHaveText("31 (plus 2 honorary)", { timeout: 20000 });
  await expect(card("Average Member Age")).toHaveText("47.3");
  await expect(card("Most Recent Initiation")).toHaveText("21st November 2025");
  await expect(card("Lodge Number")).toHaveText("1234");
  await expect(card("Consecrated")).toHaveText("2nd March 1950");
  await expect(card("Meeting Day")).toHaveText("Monday");
  await expect(card("Meetings Per Year")).toHaveText("3");
  await expect(card("Province")).toHaveText("Sampleshire");
  await expect(page.getByText("Our 33 members range in age from 24 to 91 and bring", { exact: false })).toBeVisible();
  await expect(page.getByText("We currently have 33 members whose ages range from 24 to 91.", { exact: false })).toBeVisible();
  await expect(page.getByText("Our Lodge meets at Sample Hall, A Long Building Name, Some Road, Town AB1 2CD. We hold three meetings each year", { exact: false })).toBeVisible();
  await expect(page.getByText("3rd Monday in November (Installation)")).toBeVisible();
  await page.waitForTimeout(1000);
  await noScroll(page);
  await expectNoAxeViolations(page, "lodge profile with figures");
});

test("Lodge Profile with nothing set shows — and no typed figures", async ({ page }) => {
  await mock(page, {}, {}, { schedule: [], manual_text: null });
  await page.goto("/lodge-profile");
  const glance = page.locator("dl");
  await glance.scrollIntoViewIfNeeded();
  await expect(glance.locator("dd")).toHaveText(Array(8).fill("—"), { timeout: 20000 });
  const body = await page.locator("main").innerText();
  for (const old of ["22 members", "18 to 83", "13th May 2026", "GU2 4DR", "Hitherbury"]) expect(body).not.toContain(old);
  await page.waitForTimeout(1000); // let the fade-in finish before the contrast scan
  await noScroll(page);
  await expectNoAxeViolations(page, "lodge profile blank");
});
