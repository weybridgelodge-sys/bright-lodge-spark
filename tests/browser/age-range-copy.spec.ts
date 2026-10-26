import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";
import { mockSiteUnit } from "./helpers/siteUnit";

// Job DE: Hero, Join Us and FAQ show the live member age range (synthetic figures), or omit it.
const FIGS = { youngest_age: 32, oldest_age: 82, subscribing_count: 20 };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const mockFigures = (page: import("@playwright/test").Page, ok: boolean) =>
  page.route("**/rest/v1/rpc/get_public_lodge_figures**", (r) =>
    r.request().method() === "OPTIONS" ? r.fulfill({ status: 200, headers: cors, body: "" })
      : ok ? r.fulfill({ status: 200, headers: cors, json: FIGS }) : r.fulfill({ status: 500, headers: cors, json: { message: "x" } }));

for (const ok of [true, false]) {
  test(`age range copy at 320px (${ok ? "live" : "unavailable"})`, { timeout: 120_000 }, async ({ page }) => {
    await mockSiteUnit(page, "weybridge");
    await mockFigures(page, ok);
    await page.setViewportSize({ width: 320, height: 900 });

    await page.goto("/");
    const lede = page.locator("p", { hasText: "friendly Masonic Lodge in Surrey" }).first();
    await expect(lede).toContainText(ok ? "men in Guildford — aged from 32 to 82 — who meet" : "men in Guildford who meet");
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(lede).not.toContainText(/83|NaN/);
    await expectNoAxeViolations(page, "Home");

    await page.goto("/join-us");
    await expect(page.getByText(ok ? "You're a man of any adult age — our members currently range from 32 to 82 — living" : "You're a man of any adult age living", { exact: false })).toBeVisible();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expectNoAxeViolations(page, "Join Us");

    await page.goto("/faq");
    await page.getByRole("button", { name: "Can anyone join a Masonic Lodge in Surrey?" }).click();
    const ans = ok ? "Our members currently range in age from 32 to 82." : "the best first step is simply to get in touch.";
    await expect(page.getByText(ans, { exact: false })).toBeVisible();
    const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join(" "));
    expect(ld).toContain(ans);
    if (!ok) expect(ld).not.toContain("range in age");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500); // let scroll-in fades finish before the contrast scan
    await expectNoAxeViolations(page, "FAQ");
  });
}

// Hero height before vs after the clause arrives (layout jump check), at 320 and 1280.
for (const w of [320, 1280]) {
  test(`hero lede height at ${w}px`, { timeout: 60_000 }, async ({ page }) => {
    await mockSiteUnit(page, "weybridge");
    let release!: () => void; const gate = new Promise<void>((r) => (release = r));
    await page.route("**/rest/v1/rpc/get_public_lodge_figures**", async (r) => { await gate; await r.fulfill({ status: 200, headers: cors, json: FIGS }); });
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    const lede = page.locator("p", { hasText: "friendly Masonic Lodge in Surrey" }).first();
    await page.waitForTimeout(2000); // React has replaced the skeleton; figures still held back
    await expect(lede).not.toContainText("32 to 82");
    const before = (await lede.boundingBox())!.height;
    release();
    await expect(lede).toContainText("aged from 32 to 82");
    const after = (await lede.boundingBox())!.height;
    console.log(`DE hero lede ${w}px: before=${before} after=${after}`);
    expect(after).toBe(before);
  });
}
