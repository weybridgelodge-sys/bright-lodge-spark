import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";
import { mockSiteUnit } from "./helpers/siteUnit";

test.beforeEach(async ({ page }) => { await mockSiteUnit(page, "layout-test-unit"); });

// Mocked public lookup only; checks header/footer render from the unit record at 320px.
test("header and footer read the unit record at 320px", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_unit_profile**", (r) => r.fulfill({ json: { lodge_name: "Sample Lodge With A Considerably Long Name", lodge_number: "1234", consecration_year: "1950",
    province_name: "Province of Sampleshire", ico_number: "AB123456", facebook_url: "https://facebook.example/sample", instagram_url: "https://instagram.example/sample", twitter_url: "https://x.example/sample",
    venue_name: "Sample Hall", venue_lines: ["Sample Hall, A Long Building Name,", "Some Road,", "Town AB1 2CD"], site_url: "https://example.invalid" } }));
  await page.goto("/contact");
  await expect(page.locator("header").getByText("Sample Lodge With A Considerably Long Name")).toBeVisible({ timeout: 20000 });
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByText("Province of Sampleshire")).toBeVisible();
  await expect(footer.getByText("Consecrated 1950.", { exact: false })).toBeVisible();
  await expect(footer.getByText("Town AB1 2CD")).toBeVisible();
  await expect(footer.getByText("ICO Registration: AB123456")).toBeVisible();
  expect(await footer.getByRole("link", { name: "Facebook" }).getAttribute("href")).toBe("https://facebook.example/sample");
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "contact page with unit header/footer");
});

test("public Bookings subtitle from the unit record", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_unit_profile**", (r) => r.fulfill({ json: { lodge_name: "Sample Lodge", lodge_number: "1234", venue_name: "Sample Hall", venue_lines: ["Sample Hall,", "Town AB1 2CD"] } }));
  const day = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const ev = { id: "ev1", slug: "s", title: "Regular Meeting", intro: "Join us.", intro_heading: null, event_date: `${day}T18:00:00+00:00`, tyling_time: "5pm", dining_time: "7pm",
    location: "Test Hall", dress_code: "Dark suit", event_label: null, booking_deadline: null, header_image_url: null, published: true, sort_order: 0, archived_at: null };
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [ev] }));
  await page.route("**/rest/v1/lodge_event_courses**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_event_dining_options**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/get_published_meeting_for_event**", (r) => r.fulfill({ json: [{ id: "m1", event_key: "s" }] }));
  await page.goto("/bookings?e2e_as=visitor");
  await expect(page.getByText("Reserve your place at the next Sample Lodge meeting at the Sample Hall, AB1 2CD")).toBeVisible({ timeout: 20000 });
  await expect(page.locator("footer").getByRole("link", { name: "Facebook" })).toHaveCount(0);
  await expectNoAxeViolations(page, "bookings with unit subtitle");
});
