import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Mocked data only: no backend writes, no real booking.
const far = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const day = far(30);
const ev = { id: "ev1", slug: "test-installation", title: "Installation Meeting of the Worshipful Master Elect and Festive Board", intro: "Join us.", intro_heading: null,
  event_date: `${day}T18:00:00+00:00`, tyling_time: "5pm", dining_time: "7pm", location: "Test Hall", dress_code: "Dark suit", event_label: null,
  booking_deadline: null, header_image_url: null, published: true, sort_order: 0, archived_at: null };
const item = { kind: "meeting", id: "m1", title: ev.title, event_date: day, price_pence: 3500, booking_deadline: null, book_path: "/bookings", bookings: [], register: [] };

async function mock(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "application/javascript",
    body: "window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback('tok'),10);return 'w'},reset(){},remove(){}};" }));
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [ev] }));
  await page.route("**/rest/v1/lodge_event_courses**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_event_dining_options**", (r) => r.fulfill({ json: [{ id: "d1", event_id: "ev1", label: "Festive Board", price_pence: 3500, position: 0, is_default: true }] }));
  await page.route("**/rest/v1/rpc/get_published_meeting_for_event**", (r) => r.fulfill({ json: [{ id: "m1", event_key: ev.slug }] }));
  await page.route("**/rest/v1/rpc/get_my_bookable_items**", (r) => r.fulfill({ json: [item] }));
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [{ dietary_requirements: "No shellfish" }] }));
  await page.route("**/rest/v1/rpc/get_public_booking_details**", (r) => r.fulfill({ json: { lodge_name: "Sample Lodge with a Very Long Name", lodge_number: "1234",
    account_name: "Sample Account", sort_code: "11-22-33", account_number: "12345678", reference_pattern: "Dining + {surname}", card_wording: "", cheque_payee: "Sample Payee",
    sign_off_override: null, contact_email: "queries@example.invalid" } }));
  await page.route("**/rest/v1/module_settings**", (r) => r.fulfill({ json: r.request().url().includes("member_bookings") && !r.request().url().includes("in.") ? { value: true } : [] }));
}

async function fillAndSubmitBank(page: Page, bodies: unknown[]) {
  await page.route("**/functions/v1/save-meeting-response", async (r) => { bodies.push(r.request().postDataJSON()); await r.fulfill({ json: { bookingId: "b1" } }); });
  await page.locator("#evf-meeting").selectOption("meeting-and-festive-board");
  await page.locator("#evf-guests").selectOption("1");
  await page.locator("#g0").fill("Guest Person");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /Bank Transfer/ }).check();
  await page.getByRole("button", { name: "Submit Booking" }).click();
}

test("public Bookings: visitor flow unchanged (bank transfer, 1 guest)", { timeout: 90_000 }, async ({ page }) => {
  await mock(page);
  await page.goto("/bookings?e2e_as=visitor");
  await expect(page.getByRole("heading", { name: "Booking Form" })).toBeVisible({ timeout: 20000 });
  await page.locator("#evf-title").selectOption("Mr");
  await page.locator("#evf-first").fill("Visiting");
  await page.locator("#evf-last").fill("Person");
  await page.locator("#evf-email").fill("visitor@example.invalid");
  await page.locator("#evf-phone").fill("07000000000");
  await page.getByRole("button", { name: "Next" }).click();
  const bodies: any[] = [];
  await fillAndSubmitBank(page, bodies);
  await expect(page.getByRole("heading", { name: "Booking Confirmed" })).toBeVisible();
  await expect(page.getByText("Sort code: 11-22-33")).toBeVisible();
  await expect(page.getByText("Reference: Dining + Person")).toBeVisible();
  await expect(page.getByText("WM Sample Lodge with a Very Long Name 1234")).toBeVisible();
  expect(page.url()).toContain("/bookings");
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ event_key: ev.slug, meeting_id: "m1", contact_email: "visitor@example.invalid", meeting_option: "meeting-and-festive-board", website: "" });
  expect(bodies[0].details).toMatchObject({ guestCount: 1, paymentMethod: "bank-transfer", unitPricePence: 3500, totalPence: 7000, dietary: "" });
  expect(await page.getByRole("link", { name: /Back to Home/ }).getAttribute("href")).toBe("/");
});

test("portal booking form at 320px: prefilled, guests, bank transfer, axe", { timeout: 90_000 }, async ({ page }) => {
  await mock(page);
  await page.goto("/members/book");
  const book = page.getByRole("link", { name: /Book my place\s*:/ });
  await expect(book).toHaveAttribute("href", "/members/book/meeting/m1", { timeout: 20000 });
  await book.click();
  await expect(page.getByRole("heading", { level: 1, name: ev.title })).toBeVisible({ timeout: 20000 });
  await expect(page.locator("#evf-title")).toHaveValue("W. Bro");
  await expect(page.locator("#evf-first")).toHaveValue("Bartholomew");
  await expect(page.locator("#evf-last")).toHaveValue("Montgomery-Smythe");
  await expect(page.locator("#evf-lodge")).toHaveValue("Sample Lodge with a Very Long Name No. 1234");
  await expect(page.locator("#evf-email")).toHaveValue("portal-layout-test@localhost.invalid");
  await expect(page.locator("#website, #evf-website")).toHaveCount(1);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "portal booking step 1");
  await page.locator("#evf-phone").fill("07000000000");
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator("#evf-meeting").selectOption("meeting-and-festive-board");
  await page.locator("#evf-guests").selectOption("1");
  await page.locator("#g0").fill("A Guest With An Extraordinarily Long Name For Testing");
  await expect(page.locator("#evf-dietary")).toHaveValue("No shellfish");
  expect(await overflow()).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "portal booking step 2 with guest");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("radio", { name: /Bank Transfer/ })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "portal booking payment step");
  await page.screenshot({ path: "/tmp/browser/portal-booking-pay-320.png" });
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  const bodies: any[] = [];
  await page.route("**/functions/v1/save-meeting-response", async (r) => { bodies.push(r.request().postDataJSON()); await r.fulfill({ json: { bookingId: "b1" } }); });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /Bank Transfer/ }).check();
  await page.getByRole("button", { name: "Submit Booking" }).click();
  await expect(page.getByRole("heading", { name: "Booking Confirmed" })).toBeVisible();
  expect(bodies[0].details).toMatchObject({ guestCount: 1, paymentMethod: "bank-transfer", totalPence: 7000 });
  const back = page.getByRole("link", { name: /Back to Book my place/ }).last();
  expect(await back.getAttribute("href")).toBe("/members/book");
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "portal booking confirmation");
  await page.screenshot({ path: "/tmp/browser/portal-booking-done-320.png" });
});

test("public Bookings stays put for a visitor even when switches are on", async ({ page }) => {
  await mock(page);
  await page.goto("/bookings?e2e_as=visitor");
  await expect(page.getByRole("heading", { name: "Booking Form" })).toBeVisible({ timeout: 20000 });
  expect(new URL(page.url()).pathname).toBe("/bookings");
});
