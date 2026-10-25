import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Job BQ: Login and Dashboard lodge wording comes from the unit profile.
// Synthetic profile only (e2e mode, localhost); never the real backend.
const profile = {
  lodge_name: "Weybridge Lodge", lodge_number: "6787", province_name: "Province of Surrey",
  site_url: "https://weybridgelodge.org.uk", venue_name: "Guildford Masonic Centre",
  venue_lines: ["Guildford Masonic Centre, Weybourne House,", "Hitherbury Close,", "Guildford, Surrey GU2 4DR"],
};

test.afterEach(async ({ page }, info) => { if (info.status === "passed") await expectNoAxeViolations(page, info.title); });

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_unit_profile**", (r) => r.fulfill({ json: profile }));
});

const noSideScroll = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test("Login at 320px shows the unit's name and number", async ({ page }) => {
  await page.goto("/members/login");
  await expect(page.getByText("Weybridge Lodge", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("No. 6787 · Members Portal")).toBeVisible();
  await expect(page.getByAltText("Weybridge Lodge crest")).toBeVisible();
  await noSideScroll(page);
  await page.screenshot({ path: "/tmp/browser/bq-login-320.png" });
});

test("Dashboard at 320px shows the unit title", async ({ page }) => {
  await page.goto("/members");
  await expect(page.getByText("The private area for brethren of Weybridge Lodge No. 6787.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Weybridge Lodge 6787")).toBeVisible();
  await noSideScroll(page);
  await page.screenshot({ path: "/tmp/browser/bq-dashboard-320.png" });
});
