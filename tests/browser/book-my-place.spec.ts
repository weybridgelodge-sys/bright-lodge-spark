import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

test.afterEach(async ({ page }, info) => { if (info.status === "passed") await expectNoAxeViolations(page, info.title); });

const far = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const long = "Installation Meeting of the Worshipful Master Elect and Festive Board Celebration";
const items = [
  { kind: "meeting", id: "m1", title: long, event_date: far(30), price_pence: 3500, booking_deadline: null, book_path: "/bookings", bookings: [] },
  { kind: "event", id: "e1", title: "Joint Christmas Party with Neighbouring Lodges", event_date: far(40), price_pence: 3500, child_price_pence: 1500, booking_deadline: null, book_path: "/events/x", bookings: [{ status: "pending" }] },
  { kind: "event", id: "e2", title: "Booked event", event_date: far(50), price_pence: 4000, booking_deadline: null, book_path: "/events/y", bookings: [{ status: "paid" }] },
  { kind: "event", id: "e3", title: "Waitlisted event", event_date: far(51), price_pence: 4000, booking_deadline: null, book_path: "/events/z", bookings: [{ status: "waitlisted" }] },
  { kind: "event", id: "e4", title: "Closed event", event_date: far(3), price_pence: 4000, booking_deadline: far(1), book_path: "/events/w", bookings: [{ status: "apologies" }] },
];

const on = async (page: import("@playwright/test").Page, value: boolean) => {
  await page.route("**/rest/v1/module_settings**", (r) =>
    r.request().url().includes("member_bookings") ? r.fulfill({ json: value ? { value: true } : null }) : r.fallback());
  await page.route("**/rest/v1/rpc/get_my_bookable_items**", (r) => r.fulfill({ json: items }));
};

test("Book my place at 320px with every status", async ({ page }) => {
  await on(page, true);
  await page.goto("/members/book");
  await expect(page.getByRole("heading", { name: "Book my place", level: 1 })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("listitem")).toHaveCount(5);
  for (const s of ["Not booked", "Pending payment", "Booked", "Waitlisted", "Apologies"]) await expect(page.getByText(s, { exact: true })).toBeVisible();
  await expect(page.getByText("Booking closed, contact the Secretary.")).toBeVisible();
  const book = page.getByRole("link", { name: /Book my place:/ });
  await expect(book).toHaveCount(1);
  expect(Math.round((await book.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/browser/book-my-place-320.png" });
});

test("Hub tile shows at 320px when switched on", async ({ page }) => {
  await on(page, true);
  await page.goto("/members");
  const tile = page.getByRole("link", { name: /Book my place/ });
  await expect(tile).toBeVisible({ timeout: 15000 });
  expect(Math.round((await tile.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await tile.screenshot({ path: "/tmp/browser/book-my-place-tile-320.png" });
});

test("switched off: no tile and the page sends members home", async ({ page }) => {
  await on(page, false);
  await page.goto("/members/book");
  await expect(page).toHaveURL(/\/members\/?$/, { timeout: 15000 });
  await expect(page.getByRole("link", { name: /Book my place/ })).toHaveCount(0);
});
