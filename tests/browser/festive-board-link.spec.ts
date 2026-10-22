import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

const meeting = { id: "m1", meeting_date: "2026-12-09", meeting_type: "regular", headcount_override: null, notes: null, status: "draft", is_white_table: false, dining_price_pence: 3500, event_key: "x", lodge_event_id: "e1" };
const events = [{ id: "e1", title: "December Meeting with a deliberately long public booking page title", event_date: "2026-12-09T18:00:00", archived_at: null }];

test("register dialog shows the linked booking page, no slug box, at 320px", async ({ page }) => {
  await page.route("**/rest/v1/festive_board_meetings**", (r) => r.fulfill({ json: [meeting] }));
  await page.route("**/rest/v1/festive_board_attendance**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/bookings**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: events }));
  await page.goto("/members/admin/festive-board");
  const edit = page.getByRole("button", { name: /Edit \/ mark attendance/ }).first();
  if (!(await edit.isVisible({ timeout: 10000 }).catch(() => false))) await page.getByText(/9 Dec/).first().click().catch(() => {});
  if (!(await edit.isVisible({ timeout: 5000 }).catch(() => false))) test.skip(true, "Synthetic identity cannot manage Festive Board");
  await edit.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("linked-page")).toHaveText(`Linked booking page: ${events[0].title}`);
  await expect(dialog.getByLabel("Public booking slug")).toHaveCount(0);
  const pick = dialog.getByLabel("Change linked booking page");
  expect(Math.round((await pick.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await pick.selectOption("");
  await expect(dialog.getByTestId("linked-page")).toHaveText("Not linked to a public booking page");
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "festive board link dialog");
});
