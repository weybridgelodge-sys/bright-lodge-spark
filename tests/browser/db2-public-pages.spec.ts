import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Job DB2: public pages resolve their lodge (real backend, localhost is in unit_domains) at 320px.
for (const [name, path] of [["Home", "/"], ["Join Us", "/join-us"], ["FAQ", "/faq"], ["Lodge Profile", "/lodge-profile"]] as const) {
  test(`${name} at 320px sends its lodge`, { timeout: 90_000 }, async ({ page }) => {
    const sent: { fn: string; body: string }[] = [];
    page.on("request", (r) => { const m = r.url().match(/\/rpc\/(get_[a-z_]+)/); if (m) sent.push({ fn: m[1], body: r.postData() ?? "" }); });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(path);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(page.locator("footer").last()).toContainText(/Lodge/);
    for (const s of sent.filter((x) => ["get_public_unit_profile", "get_join_us_costs", "get_meeting_pattern", "get_public_lodge_figures"].includes(x.fn))) {
      expect(JSON.parse(s.body || "{}")._unit, s.fn).toBeTruthy();
    }
    console.log(`DB2 ${name}:`, [...new Set(sent.map((s) => `${s.fn}${s.body}`))].join(" "));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expectNoAxeViolations(page, name);
  });
}
