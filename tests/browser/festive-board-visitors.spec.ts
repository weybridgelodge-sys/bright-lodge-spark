import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe";

// Every mobile check ends with the WCAG 2.1 AA axe scan of the final (populated) state.
test.afterEach(async ({ page }, info) => { if (info.status === "passed") await expectNoAxeViolations(page, info.title); });

const meeting = { id: "m1", meeting_date: "2026-10-21", meeting_type: "installation", headcount_override: null, notes: null, price_pence: 3500 };
const members = [
  { id: "p1", full_name: "Bartholomew Featherstonehaugh-Wolstenholme", first_name: "Bartholomew", last_name: "Featherstonehaugh-Wolstenholme", title: "W Bro.", is_past_master: true },
];
const visitors = Array.from({ length: 15 }, (_, i) => ({
  id: `a${i}`, meeting_id: "m1", member_id: null,
  visitor_name: i === 0 ? "W Bro. Maximilian Featherstonehaugh-Wolstenholme" : `Visitor Number ${i + 1}`,
  visitor_lodge_name: i === 0 ? "Royal Alfred Lodge of Instruction and Benevolence" : "Astolat Lodge",
  visitor_lodge_number: "5848", visitor_email: i === 0 ? "maximilian.featherstonehaugh@example.com" : `v${i}@example.com`,
  attendance_status: "booked", payment_method: "stripe", amount_paid_pence: 3500, is_meeting_only: false,
  source: i < 3 ? "booking" : "manual", source_booking_id: i < 3 ? `b${i}` : null, dietary: "Vegetarian",
}));

for (const width of [900, 1280]) {
  test(`Festive Board visitor fields are readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/rest/v1/festive_board_meetings**", (r) => r.fulfill({ json: [meeting] }));
    await page.route("**/rest/v1/festive_board_attendance**", (r) => r.fulfill({ json: visitors }));
    await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: members }));
    await page.goto("/members/admin/festive-board");
    await page.waitForLoadState("domcontentloaded");
    const edit = page.getByRole("button", { name: /Edit \/ mark attendance/ }).first();
    if (!(await edit.isVisible({ timeout: 8000 }).catch(() => false))) {
      const card = page.getByText(/21 Oct/).first();
      await card.click().catch(() => {});
    }
    if (!(await edit.isVisible({ timeout: 5000 }).catch(() => false))) test.skip(true, "Synthetic identity cannot manage Festive Board");
    await edit.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Visitors" })).toBeVisible();
    const rows = dialog.getByTestId("fb-visitor-row");
    await expect(rows).toHaveCount(15);
    const first = rows.first();
    const mins: Record<string, number> = { "Visitor name": 220, "Lodge name": 120, "Lodge no.": 80, Email: 160, Status: 100, Payment: 100, Amount: 80, Dietary: 120 };
    for (const [label, min] of Object.entries(mins)) {
      const box = await first.getByLabel(label, { exact: true }).boundingBox();
      expect(box, label).not.toBeNull();
      expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(min);
      // Round to the device pixel: layout can report 43.98px for a 44px box.
      expect(Math.round(box!.height), `${label} height`).toBeGreaterThanOrEqual(44);
    }
    await expect(first.getByLabel("Visitor name", { exact: true })).toHaveValue("W Bro. Maximilian Featherstonehaugh-Wolstenholme");
    await expect(first.getByText("Synced")).toBeVisible();
    const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, "dialog horizontal scroll").toBeLessThanOrEqual(1);
    await first.screenshot({ path: `/tmp/browser/fb-visitor-${width}.png` });
    const mrow = dialog.getByTestId("fb-member-row").first();
    await mrow.screenshot({ path: `/tmp/browser/fb-member-${width}.png` });
  });
}
