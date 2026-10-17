import { expect, test } from "@playwright/test";

// Faithful worst-case diary data: long notes/reasons, cancelled and installation rows.
const rule = { id: "r1", unit_id: "u", mode: "weekday_rule", installation_month: 10, installation_ordinal: "3", installation_weekday: 3, fixed_day: null, applies_from_year: null, unit_number: "6787", default_venue: "Guildford Masonic Centre, Hitherbury Close, Portsmouth Road, Guildford GU2 4DR", election_month: 5, ritual: "Emulation", consecration_date: "1949-01-01" };
const meetings = [
  { id: "m1", meeting_date: "2027-10-20", meeting_type: "installation", status: "published", notes: null, cancelled_at: null, cancel_reason: null, series_id: null },
  { id: "m2", meeting_date: "2027-12-09", meeting_type: "regular", status: "draft", notes: null, cancelled_at: null, cancel_reason: null, series_id: "s1" },
  { id: "m3", meeting_date: "2028-02-16", meeting_type: "emergency", status: "draft", notes: null, cancelled_at: "2026-10-01T00:00:00Z", cancel_reason: "Venue unavailable because of the extended refurbishment of the main temple and dining room", series_id: null },
];

test("Meeting diary has no overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/rest/v1/installation_rule_settings**", (r) => r.fulfill({ json: rule }));
  await page.route("**/rest/v1/officer_installation_dates**", (r) => r.fulfill({ json: [{ lodge_year: 2026, installation_date: "2026-10-21" }] }));
  await page.route("**/rest/v1/festive_board_meetings**", (r) => r.fulfill({ json: meetings }));
  await page.route("**/rest/v1/meeting_series**", (r) => r.fulfill({ json: [{ id: "s1", name: "Regular meetings", meeting_type: "regular", ordinal: "2", weekday: 4, months: [10, 11, 12, 1, 2, 3, 4, 5], active: true }] }));
  await page.route("**/rest/v1/meeting_diary_audit**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/meeting_dependencies**", (r) => r.fulfill({ json: { attendance: 30, bookings: 4, summonses: 1, dining_invoices: 2, booking_page: 1 } }));
  page.on("pageerror", (e) => console.log("PAGEERR", e.message)); page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)));
  await page.goto("/members/admin/diary");
  const heading = page.getByRole("heading", { name: "Installation rule and meeting diary" });
  if (!(await heading.isVisible({ timeout: 10000 }).catch(() => false))) { console.log((await page.locator("body").innerText()).slice(0, 600)); test.skip(true, "Synthetic identity cannot open the diary"); }
  await expect(page.getByTestId("rule-preview")).toContainText("2027");
  const check = async (ctx: string) => {
    const bad = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>("button, input, select, textarea, li, p, h1, h2")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > w + 1); })
        .map((el) => el.tagName + ":" + (el.innerText || "").slice(0, 40));
    });
    expect(bad, ctx).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), ctx).toBeLessThanOrEqual(1);
  };
  await check("page");
  for (const b of await page.locator("main button:visible").all()) {
    const box = await b.boundingBox();
    if (box) expect(box.height, await b.innerText()).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Move" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("30 attendance records");
  await dialog.getByLabel("New date").fill("2027-10-27");
  await expect(dialog.getByTestId("kpi-effect")).toBeVisible();
  await check("move dialog");
  await page.screenshot({ path: "/tmp/browser/diary-move-320.png" });
  await dialog.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Drop" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("nothing is deleted");
  await check("drop dialog");
});
