import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Mocked only: create-checkout replies 409 (duplicate); no booking or Stripe session is created.
const MSG = "You already have a booking for this event. If you need to change or cancel it, please contact the Assistant Secretary at assistantsecretary@weybridgelodge.org.uk.";
const day = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const ev = { id: "ev1", slug: "test-meeting", title: "Regular Meeting and Festive Board", intro: "Join us.", intro_heading: null,
  event_date: `${day}T18:00:00+00:00`, tyling_time: "5pm", dining_time: "7pm", location: "Test Hall", dress_code: "Dark suit", event_label: null,
  booking_deadline: null, header_image_url: null, published: true, sort_order: 0, archived_at: null };

test.use({ viewport: { width: 320, height: 800 } });

test("duplicate 409: toast wraps at 320px, form keeps step and values", { timeout: 90_000 }, async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "application/javascript",
    body: "window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback('tok'),10);return 'w'},reset(){},remove(){}};" }));
  await page.route("**/rest/v1/lodge_events**", (r) => r.fulfill({ json: [ev] }));
  await page.route("**/rest/v1/lodge_event_courses**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/lodge_event_dining_options**", (r) => r.fulfill({ json: [{ id: "d1", event_id: "ev1", label: "Festive Board", price_pence: 3500, position: 0, is_default: true }] }));
  await page.route("**/rest/v1/rpc/get_published_meeting_for_event**", (r) => r.fulfill({ json: [{ id: "m1", event_key: ev.slug }] }));
  await page.route("**/rest/v1/rpc/get_public_booking_details**", (r) => r.fulfill({ json: { lodge_name: "Sample Lodge", lodge_number: "1", contact_email: null } }));
  await page.route("**/rest/v1/module_settings**", (r) => r.fulfill({ json: [] }));
  const calls: unknown[] = [];
  await page.route("**/functions/v1/create-checkout", (r) => { calls.push(1); return r.fulfill({ status: 409, json: { error: MSG, duplicate: true } }); });
  await page.route("**/functions/v1/save-meeting-response", (r) => r.abort());

  await page.goto("/bookings?e2e_as=visitor");
  await expect(page.getByRole("heading", { name: "Booking Form" })).toBeVisible({ timeout: 20000 });
  await page.locator("#evf-title").selectOption("Mr");
  await page.locator("#evf-first").fill("Repeat");
  await page.locator("#evf-last").fill("Booker");
  await page.locator("#evf-email").fill("repeat@example.invalid");
  await page.locator("#evf-phone").fill("07000000000");
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator("#evf-meeting").selectOption("meeting-and-festive-board");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /Debit/ }).check();
  await page.getByRole("button", { name: "Submit Booking" }).click();

  const toast = page.locator("li[data-state=open]").filter({ hasText: "Checkout error" });
  await expect(toast).toBeVisible({ timeout: 30000 });
  await expect(toast).toContainText(MSG);
  expect(calls.length).toBeGreaterThan(0);
  // Toast fits inside the 320px viewport with gutters; nothing clipped.
  const box = await toast.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(15);
  expect(box!.x + box!.width).toBeLessThanOrEqual(305);
  const clipped = await toast.locator("div.text-sm").evaluateAll((els) => els.some((e) => e.scrollWidth > e.clientWidth));
  expect(clipped).toBe(false);
  const close = await toast.getByRole("button", { name: "Close notification" }).boundingBox();
  expect(close!.width).toBeGreaterThanOrEqual(44); expect(close!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  // Form is back on step 3 with every value kept; no checkout panel / skeleton left behind.
  await expect(page.getByRole("heading", { name: "Secure Card Payment" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /Debit/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "Submit Booking" })).toBeVisible();
  await expectNoAxeViolations(page, "checkout error toast");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator("#evf-meeting")).toHaveValue("meeting-and-festive-board");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator("#evf-first")).toHaveValue("Repeat");
  await expect(page.locator("#evf-email")).toHaveValue("repeat@example.invalid");
});
