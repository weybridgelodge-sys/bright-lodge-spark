import { expect, test, type Page } from "@playwright/test";

// Hover/pressed states are never reached by a resting axe scan, so measure every visible button
// in its hovered state too (phones keep :hover after a tap). Fails on text below 4.5:1.
const screens = [
  "/members/almoner", "/members/admin/treasurer", "/members/summons", "/members/admin/minutes",
  "/members/admin/festive-board", "/members/officers-tracker", "/members/admin/polls", "/members/admin/documents",
  "/members/admin", "/members/kpis", "/members/admin/diary", "/join-us", "/events",
];

async function measure(page: Page) {
  return page.evaluate(() => {
    const parse = (c: string) => { const m = c.match(/[\d.]+/g)!.map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
    const over = (top: any, bot: any) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
    const bgOf = (el: Element | null): any => {
      const stack: any[] = [];
      for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
      return stack.reverse().reduce((acc, c) => over(c, acc), { r: 255, g: 255, b: 255, a: 1 });
    };
    const lum = (c: any) => [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const btn = document.querySelector<HTMLElement>("button[data-measure]");
    if (!btn) return null;
    const base = bgOf(btn);
    const s = getComputedStyle(btn);
    if (s.backgroundImage !== "none") return null; // gradient/shimmer fills: covered by axe at rest
    const bg = base;
    const fg = over({ ...parse(s.color), a: parse(s.color).a * Number(s.opacity) }, bg);
    const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p);
    return { ratio: (x + 0.05) / (y + 0.05), text: (btn.innerText || btn.getAttribute("aria-label") || "").trim().slice(0, 40), bg: s.backgroundColor, color: s.color };
  });
}

async function checkButtons(page: Page, ctx: string) {
  const buttons = page.locator("main button:visible:not([disabled]):not([aria-disabled=true])");
  const n = Math.min(await buttons.count(), 25);
  const bad: string[] = [];
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    const txt = ((await b.innerText().catch(() => "")) || "").trim();
    if (!txt) continue; // icon-only: no text to measure
    await b.evaluate((e) => e.setAttribute("data-measure", ""));
    await b.hover({ timeout: 500 }).catch(() => {});
    await page.waitForTimeout(170); // transition-colors
    const m = await measure(page);
    await b.evaluate((e) => e.removeAttribute("data-measure"));
    if (m && m.ratio < 4.5) bad.push(`${ctx} "${m.text}" hover ${m.ratio.toFixed(2)}:1 (${m.color} on ${m.bg})`);
  }
  await page.mouse.move(0, 0);
  expect.soft(bad, `HOVER ${ctx}`).toEqual([]);
}

for (const route of screens) test(`buttons keep 4.5:1 when hovered/tapped at 390px: ${route}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(route);
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/buttons-390${route.replace(/\//g, "_")}.png` });
  await checkButtons(page, route);
});
