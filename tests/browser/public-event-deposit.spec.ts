import { expect, test, type Page } from "@playwright/test";

// Synthetic data only: every backend call is mocked, nothing is booked, paid or written.
const ev = {
  id: "00000000-0000-4000-8000-000000000002", slug: "deposit-test", name: "Deposit Test", public_title: "Deposit Test Dinner With A Long Name",
  tagline: null, intro_copy: null, theme: "default", event_date: "2099-08-14", start_time: "18:30:00", end_time: "23:30:00", venue: null,
  booking_deadline: null, capacity: 100, adult_price_pence: 9000, child_price_pence: 3000, hosting_lodges: [], highlights: [], dress_code: null,
  seats_taken: 0, useful_stuff: {}, menu_items: [], dietary_choices: [], event_type: "dinner_festival", modules: { sections: {} },
  payment_mode: "full_or_deposit", deposit_percent: 33.333, balance_due_date: "2099-07-01", fee_cover_enabled: true,
  seo_title: null, seo_description: null, og_image_url: null,
};

async function mockEvent(page: Page, sent: any[]) {
  await page.route("**/rest/v1/**", (route) => {
    const t = new URL(route.request().url()).pathname.split("/").pop()!;
    if (t === "public_events") return route.fulfill({ json: (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object") ? ev : [ev] });
    return route.fulfill({ json: [] });
  });
  await page.route("**/functions/v1/create-event-checkout", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 400, json: { error: "Synthetic test — no booking made." } });
  });
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const width of [320, 390]) {
  test(`deposit choice shows deposit, balance and due date at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sent: any[] = [];
    await mockEvent(page, sent);
    await page.goto("/events/deposit-test");
    await page.locator("#pev-name").fill("Jane Tester");
    await page.locator("#pev-email").fill("julientidmarsh@pm.me");
    await page.getByPlaceholder("Name").first().fill("Jane Tester");
    await expect(page.getByText("Bank transfer", { exact: true })).toBeVisible();
    await page.getByLabel(/Pay deposit now/).check();
    // Bank transfer is not offered for deposits.
    await expect(page.getByText("We'll show you the account details and a reference")).toHaveCount(0);
    await expect(page.getByText("Deposit now", { exact: true })).toBeVisible();
    await expect(page.getByText(/Balance of £60\.00 due by/)).toBeVisible();
    await page.getByRole("button", { name: /Continue to payment · £30\.80/ }).click(); // £30.00 + card fee 2% + 20p
    await expect(page.getByText("Synthetic test — no booking made.")).toBeVisible();
    expect(sent[0]).toMatchObject({ plan: "deposit", payment_method: "card", cover_fee: true });
    expect(await noOverflow(page)).toBe(true);
  });

  test(`balance page: pay balance and choose menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sent: any[] = [];
    await page.route("**/functions/v1/get-event-balance", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action === "choices") { sent.push(body); return route.fulfill({ json: { ok: true } }); }
      return route.fulfill({ json: {
        reference: "LF27-0001", name: "Jane", event_title: "Deposit Test Dinner With A Long Name", event_date: "2099-08-14", event_slug: "deposit-test",
        order_pence: 9000, amount_paid_pence: 3000, balance_due_pence: 6000, balance_due_date: "2099-07-01", overdue: false, can_pay: true, fee_cover_enabled: true,
        undecided: [{ guest_name: "Jane Tester", is_child: false, courses: [{ choice_id: "00000000-0000-4000-8000-0000000000b1", course_name: "Main", options: [{ id: "00000000-0000-4000-8000-0000000000b2", label: "Roast sirloin" }] }] }],
      } });
    });
    await page.route("**/functions/v1/create-event-balance-checkout", async (route) => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ status: 400, json: { error: "Synthetic test — no payment made." } });
    });
    await page.goto(`/events/balance/${"A".repeat(43)}`);
    await expect(page.getByRole("heading", { name: "Pay your balance" })).toBeVisible();
    await expect(page.getByText(/Balance due: £60\.00 by/)).toBeVisible();
    await expect(page.getByText("We'll show you the account details and a reference")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Main" }).selectOption({ label: "Roast sirloin" });
    await page.getByRole("button", { name: "Save menu choices" }).click();
    await expect(page.getByText("Thank you — your choices have been saved.")).toBeVisible();
    await page.getByRole("button", { name: /Pay balance · £61\.40/ }).click(); // £60.00 + 2% + 20p
    await expect(page.getByText("Synthetic test — no payment made.")).toBeVisible();
    expect(sent[1]).toMatchObject({ method: "card", cover_fee: true });
    expect(await noOverflow(page)).toBe(true);
  });
}

test("invalid balance link fails safely", async ({ page }) => {
  await page.route("**/functions/v1/get-event-balance", (route) => route.fulfill({ status: 404, json: { error: "This link is no longer valid. Please contact the Secretary if you think this is wrong." } }));
  await page.goto("/events/balance/used-or-wrong");
  await expect(page.getByRole("heading", { name: "Link not valid" })).toBeVisible();
});
