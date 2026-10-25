import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Simulated phone keyboard: the LAYOUT viewport keeps its size, the VISUAL viewport
// shrinks to ~half (what Chrome Android / Safari iOS do). Synthetic, localhost-only.
async function fakeKeyboard(page: Page) {
  await page.addInitScript(() => {
    const real = window.visualViewport;
    const listeners: Record<string, Set<EventListener>> = { resize: new Set(), scroll: new Set() };
    const state = { h: window.innerHeight };
    const vv = {
      get height() { return state.h; }, get width() { return window.innerWidth; },
      offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1,
      addEventListener: (t: string, f: EventListener) => listeners[t]?.add(f),
      removeEventListener: (t: string, f: EventListener) => listeners[t]?.delete(f),
    };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    (window as any).__openKeyboard = () => { state.h = Math.round(window.innerHeight / 2); listeners.resize.forEach((f) => f(new Event("resize"))); };
    void real;
  });
}

for (const width of [320, 360]) {
  for (const [tab, title] of [["Collections", "New collection"], ["Donations", "New donation"]] as const) {
    test(`${title} dialog scrolls above a phone keyboard at ${width}px`, { timeout: 90_000 }, async ({ page }) => {
      await fakeKeyboard(page);
      await page.setViewportSize({ width, height: 760 });
      await page.route("**/rest/v1/**", (r) => r.request().method() === "GET" ? r.fulfill({ json: [] }) : r.continue());
      await page.route("**/rest/v1/charity_festival_settings**", (r) => r.fulfill({ json: null }));
      await page.route("**/rest/v1/charity_ledger**", (r) => r.fulfill({ json: [{ id: "c1", name: "Surrey Freemasons' Charitable Trust for Very Long Charity Names", status: "active" }] }));
      await page.goto("/members/admin/charity");
      const tabBtn = page.getByRole("tab", { name: new RegExp(tab, "i") });
      if (!(await tabBtn.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) { console.log((await page.locator("body").innerText()).slice(0, 400)); test.skip(true, "Synthetic identity cannot open Charity Steward"); }
      await tabBtn.click();
      const newBtn = page.getByRole("tabpanel").getByRole("button", { name: /^New$/ });
      if (!(await newBtn.isEnabled().catch(() => false))) test.skip(true, "New is not available for the synthetic identity");
      await newBtn.click();
      const dlg = page.getByRole("dialog", { name: title });
      await expect(dlg).toBeVisible();
      await page.waitForTimeout(400);
      await expectNoAxeViolations(page, `${title} ${width}`);

      // Focus a field in the middle, then "open the keyboard".
      const field = dlg.locator("input").nth(1);
      await field.focus();
      await page.evaluate(() => (window as any).__openKeyboard());
      await page.waitForTimeout(700);
      const vvh = await page.evaluate(() => (window as any).visualViewport.height);
      const box = await dlg.boundingBox();
      expect(box!.y, "anchored to the top").toBeLessThan(20);
      expect(box!.y + box!.height, "dialog ends above the keyboard").toBeLessThanOrEqual(vvh + 1);
      const fb = await field.boundingBox();
      expect(fb!.y + fb!.height, "focused field visible").toBeLessThanOrEqual(vvh);
      await expect(field).toBeFocused();

      // The Save button and last field can be scrolled into the visible part.
      const save = dlg.getByRole("button", { name: /save|log|add/i }).last();
      await dlg.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await page.waitForTimeout(200);
      const sb = await save.boundingBox();
      expect(sb!.y + sb!.height, "Save reachable above keyboard").toBeLessThanOrEqual(vvh);
      expect(await page.evaluate(() => window.scrollY), "page behind stays put").toBe(0);
      await page.screenshot({ path: `/tmp/browser/cd-${tab}-${width}.png` });
    });
  }
}
