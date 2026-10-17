import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe";

// Every mobile check ends with the WCAG 2.1 AA axe scan of the final (populated) state.
test.afterEach(async ({ page }, info) => { if (info.status === "passed") await expectNoAxeViolations(page, info.title); });

const row = {
  id: "e1", name: "Christmas Party 2026 with an extremely long accounts name for wrapping", public_title: "Joint Christmas Party 2026 at Guildford Masonic Centre",
  slug: "christmas-party-2026", event_date: "2026-12-19", start_time: "17:00:00", end_time: "00:00:00", is_public: true, archived_at: null,
  adult_price_pence: 3500, child_price_pence: 1500, useful_stuff: {}, short_link: null,
};

for (const width of [320, 390]) {
  test(`public events cards and QR dialog fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/rpc/is_lodge_secretary**", (r) => r.fulfill({ json: true }));
    await page.route("**/rpc/is_current_officer**", (r) => r.fulfill({ json: true }));
    await page.route("**/rest/v1/event_accounts?**", (r) => r.fulfill({ json: [row] }));
    await page.goto("/members/public-events");
    const dup = page.getByRole("button", { name: "Duplicate" });
    await expect(dup).toBeVisible();
    expect((await dup.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Event QR" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("https://weybridgelodge.org.uk/events/christmas-party-2026")).toBeVisible();
    await expect(dialog.getByRole("img")).toBeVisible();
    const box = (await dialog.locator(".max-w-md").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    // Bottom button reachable: scroll the dialog down, last button fully on screen
    const last = dialog.getByRole("button", { name: "PNG: white on navy, gold border" });
    await last.scrollIntoViewIfNeeded();
    const lb = (await last.boundingBox())!;
    const vh = (await page.evaluate(() => innerHeight))!;
    expect(lb.y).toBeGreaterThanOrEqual(0);
    expect(lb.y + lb.height).toBeLessThanOrEqual(vh);
    // Top reachable again: scroll back, title/close visible
    await dialog.evaluate((el) => { (el as HTMLElement).scrollTop = 0; });
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
    await page.screenshot({ path: `/tmp/browser/qr-${width}.png` });
  });
}
