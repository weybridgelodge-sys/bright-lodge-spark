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
  { kind: "event", id: "e4", title: "Closed event", event_date: far(3), price_pence: 4000, booking_deadline: far(-1), book_path: "/events/w", bookings: [{ status: "apologies" }] },
  { kind: "event", id: "e5", title: "Closed not booked", event_date: far(3), price_pence: 4000, booking_deadline: far(-1), book_path: "/events/v", bookings: [] },
  { kind: "event", id: "e6", title: "Closed booked", event_date: far(3), price_pence: 4000, booking_deadline: far(-1), book_path: "/events/u", bookings: [{ status: "paid" }] },
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
  await expect(page.getByRole("listitem")).toHaveCount(7);
  for (const s of ["Not booked", "Pending payment", "Waitlisted", "Apologies"]) await expect(page.getByText(s, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Booking closed, contact the Secretary.")).toHaveCount(1);
  await expect(page.getByText("Your apologies are recorded. To attend, contact the Secretary.")).toHaveCount(1);
  await expect(page.getByText("You are booked. To change this booking, contact the Secretary.")).toHaveCount(2);
  await expect(page.getByText("You are on the waiting list. The Secretary will contact you if a place becomes free.")).toHaveCount(1);
  const book = page.getByRole("link", { name: /Book my place\s*:/ });
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

test("event editor shows the host lodge read-only at 320px", async ({ page }) => {
  const row = { id: "e1", name: "Party", public_title: "Party", slug: "party", event_date: far(40), start_time: "17:00:00", end_time: "23:00:00",
    is_public: false, archived_at: null, adult_price_pence: 3500, child_price_pence: 1500, useful_stuff: {}, short_link: null, unit_id: "u1" };
  await page.route("**/rpc/is_lodge_secretary**", (r) => r.fulfill({ json: true }));
  await page.route("**/rpc/is_current_officer**", (r) => r.fulfill({ json: true }));
  await page.route("**/rest/v1/event_accounts?**", (r) => r.fulfill({ json: [row] }));
  await page.route("**/rest/v1/units?**", (r) => r.fulfill({ json: { name: "Example Lodge of Very Long Name No. 99999" } }));
  await page.goto("/members/public-events");
  await page.getByRole("button", { name: /^Edit/ }).first().click();
  await expect(page.getByText("Example Lodge of Very Long Name No. 99999")).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel(/Host lodge/i)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("pending card: Continue to payment resumes the same booking once; expired hold books again; bank pending unchanged (320px)", async ({ page }) => {
  const soon = new Date(Date.now() + 40 * 6e4).toISOString();
  const gone = new Date(Date.now() - 5 * 6e4).toISOString();
  const cardItems = [
    { kind: "meeting", id: "m1", title: "Regular Meeting", event_date: far(30), price_pence: 3500, booking_deadline: null, book_path: "/bookings",
      bookings: [{ id: "11111111-1111-4111-8111-111111111111", status: "pending", method: "card", card: true, total_pence: 3590, hold_until: soon }] },
    { kind: "meeting", id: "m2", title: "Expired hold meeting", event_date: far(31), price_pence: 3500, booking_deadline: null, book_path: "/bookings",
      bookings: [{ id: "22222222-2222-4222-8222-222222222222", status: "pending", method: "card", card: true, total_pence: 3590, hold_until: gone }] },
    { kind: "meeting", id: "m3", title: "Bank transfer meeting", event_date: far(32), price_pence: 3500, booking_deadline: null, book_path: "/bookings",
      bookings: [{ id: "33333333-3333-4333-8333-333333333333", status: "pending", method: "bank-transfer", card: false, total_pence: 3500, hold_until: gone }] },
  ];
  await page.route("**/rest/v1/module_settings**", (r) => r.request().url().includes("member_bookings") ? r.fulfill({ json: { value: true } }) : r.fallback());
  await page.route("**/rest/v1/rpc/get_my_bookable_items**", (r) => r.fulfill({ json: cardItems }));
  const calls: string[] = [];
  await page.route("**/functions/v1/resume-booking-checkout", async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 200, body: "ok" });
    calls.push(JSON.parse(r.request().postData() || "{}").booking_id);
    await new Promise((res) => setTimeout(res, 400));
    return r.fulfill({ json: { state: "released" } });
  });
  await page.goto("/members/book");
  const btn = page.getByRole("button", { name: /Continue to payment\s*:\s*Regular Meeting/ });
  await expect(btn).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/£35\.90 \(including the card fee\)/)).toBeVisible();
  await expect(page.getByText(/Held until \d\d:\d\d/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue to payment/ })).toHaveCount(1);
  expect(Math.round((await btn.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/browser/resume-card-320.png" });
  await btn.dblclick();
  await expect(page.getByText("Your card hold has been released. You can book again.")).toBeVisible();
  expect(calls).toEqual(["11111111-1111-4111-8111-111111111111"]);
  await expect(page.getByRole("link", { name: /Book my place\s*:\s*Expired hold meeting/ })).toBeVisible();
  await expect(page.getByText("Your card payment is being held. If it is not completed within the hour the hold is released.")).toHaveCount(1);
});
