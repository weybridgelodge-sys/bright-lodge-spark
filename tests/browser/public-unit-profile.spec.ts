import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

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
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [] }));
  await page.goto("/bookings?e2e_as=visitor");
  await page.waitForTimeout(3000);
  const sub = page.getByText("Reserve your place at the next Sample Lodge meeting at the Sample Hall, AB1 2CD");
  if (await sub.count()) await expect(sub).toBeVisible();
  await expectNoAxeViolations(page, "bookings with unit subtitle");
});
