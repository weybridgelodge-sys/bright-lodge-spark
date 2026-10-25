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
    // Staged opening, like a real keyboard animation: several resize events.
    (window as any).__openKeyboardStaged = () => {
      const full = window.innerHeight;
      [0.85, 0.65, 0.5].forEach((f, i) => setTimeout(() => { state.h = Math.round(full * f); listeners.resize.forEach((fn) => fn(new Event("resize"))); }, 80 * (i + 1)));
    };
    // Layout-viewport shrink (resizes-content): visual viewport follows innerHeight.
    (window as any).__followLayout = () => { state.h = window.innerHeight; listeners.resize.forEach((fn) => fn(new Event("resize"))); };
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
      const pageY = await page.evaluate(() => window.scrollY);
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
      expect(await page.evaluate(() => window.scrollY), "page behind stays put").toBe(pageY);
      await page.screenshot({ path: `/tmp/browser/cd-${tab}-${width}.png` });
    });
  }
}

for (const width of [320, 360]) {
  for (const mode of ["visual", "layout"] as const) {
    test(`New collection: Notes (last field) visible above a ${mode}-shrink keyboard at ${width}px`, { timeout: 90_000 }, async ({ page }) => {
      await fakeKeyboard(page);
      await page.setViewportSize({ width, height: 760 });
      await page.route("**/rest/v1/**", (r) => r.request().method() === "GET" ? r.fulfill({ json: [] }) : r.continue());
      await page.route("**/rest/v1/charity_festival_settings**", (r) => r.fulfill({ json: null }));
      await page.goto("/members/admin/charity?kbdebug=1");
      const tabBtn = page.getByRole("tab", { name: /Collections/i });
      if (!(await tabBtn.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open Charity Steward");
      await tabBtn.click();
      await page.getByRole("tabpanel").getByRole("button", { name: /^New$/ }).click();
      const dlg = page.getByRole("dialog", { name: "New collection" });
      await expect(dlg).toBeVisible();
      await page.waitForTimeout(400);

      // Banked date: light token field, full date visible, 44px tall.
      const bd = dlg.locator('input[type="date"]').nth(1);
      await bd.fill("2026-10-21");
      const neighbourBg = await dlg.locator('input:not([type="date"])').first().evaluate((el) => getComputedStyle(el).backgroundColor);
      const d = await bd.evaluate((el: HTMLInputElement) => ({ bg: getComputedStyle(el).backgroundColor, h: el.getBoundingClientRect().height, ov: el.scrollWidth - el.clientWidth }));
      expect(d.bg, "light field like its neighbours").toBe(neighbourBg);
      expect(d.h).toBeGreaterThanOrEqual(44);
      expect(d.ov, "date not clipped").toBeLessThanOrEqual(0);
      await bd.screenshot({ path: `/tmp/browser/ce-date-${width}.png` });

      const notes = dlg.locator("textarea");
      await notes.focus();
      if (mode === "visual") await page.evaluate(() => (window as any).__openKeyboardStaged());
      else { await page.setViewportSize({ width, height: 380 }); await page.evaluate(() => (window as any).__followLayout()); }
      await page.waitForTimeout(1200);
      const visBottom = await page.evaluate(() => Math.min((window as any).visualViewport.height, window.innerHeight));
      const nb = await notes.boundingBox();
      expect(nb!.y, "Notes below dialog top").toBeGreaterThanOrEqual(0);
      expect(nb!.y + nb!.height, "Notes above keyboard").toBeLessThanOrEqual(visBottom);
      await expect(notes).toBeFocused();
      // DOM: the dialog box itself is the scroller (form inside it, no separate inner scroller).
      const dom = await notes.evaluate((el) => {
        const box = el.closest('[role="dialog"]') as HTMLElement;
        const scrollers: string[] = [];
        for (let n: HTMLElement | null = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const oy = getComputedStyle(n).overflowY; if (oy === "auto" || oy === "scroll") scrollers.push(n === box ? "dialog" : n.tagName);
        }
        return { scrollers, focusedClass: box.classList.contains("vv-field-focused"), pb: parseFloat(getComputedStyle(box).paddingBottom) };
      });
      expect(dom.scrollers).toEqual(["dialog"]);
      expect(dom.focusedClass).toBe(true);
      expect(dom.pb).toBeGreaterThanOrEqual(visBottom * 0.5 - 1);
      await expect(page.getByTestId("kbdebug")).toContainText("vv.h:");
      await expectNoAxeViolations(page, `CE ${mode} ${width}`);
      await page.screenshot({ path: `/tmp/browser/ce-${mode}-${width}.png` });
    });
  }
}

// Worst case seen on the real phone: the browser reports NO keyboard at all (no visual
// viewport change, no layout change). The spare space alone must let Notes be centred.
for (const width of [320, 360]) {
  test(`New collection: Notes centred with no keyboard information at ${width}px`, { timeout: 90_000 }, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await page.route("**/rest/v1/**", (r) => r.request().method() === "GET" ? r.fulfill({ json: [] }) : r.continue());
    await page.route("**/rest/v1/charity_festival_settings**", (r) => r.fulfill({ json: null }));
    await page.goto("/members/admin/charity");
    const tabBtn = page.getByRole("tab", { name: /Collections/i });
    if (!(await tabBtn.waitFor({ timeout: 25000 }).then(() => true).catch(() => false))) test.skip(true, "Synthetic identity cannot open Charity Steward");
    await tabBtn.click();
    await page.getByRole("tabpanel").getByRole("button", { name: /^New$/ }).click();
    const dlg = page.getByRole("dialog", { name: "New collection" });
    await expect(dlg).toBeVisible();
    await page.waitForTimeout(400);
    await expect(dlg.getByRole("textbox", { name: "Notes" })).toBeVisible();
    await expect(dlg.getByRole("spinbutton", { name: "Costs (£)" })).toBeVisible();
    await expect(dlg.getByLabel("Banked by", { exact: true })).toHaveAttribute("placeholder", "e.g. Charity Steward");
    const notes = dlg.getByRole("textbox", { name: "Notes" });
    await notes.focus();
    await page.waitForTimeout(1100);
    const nb = await notes.boundingBox();
    const mid = nb!.y + nb!.height / 2;
    expect(Math.abs(mid - 640 / 2), "Notes centred in the visible area").toBeLessThan(80);
    await expectNoAxeViolations(page, `CF centred ${width}`);
    await page.screenshot({ path: `/tmp/browser/cf-centred-${width}.png` });
  });
}
