import { expect, test, type Page, type Route } from "@playwright/test";

// Synthetic data only: every backend call is mocked, nothing is booked or written.
const base = {
  id: "00000000-0000-4000-8000-000000000001", name: "Test", tagline: null, intro_copy: null, theme: "default",
  event_date: "2099-08-14", start_time: "18:30:00", end_time: "23:30:00", venue: null, booking_deadline: null, capacity: 100,
  adult_price_pence: 7500, child_price_pence: 3000, hosting_lodges: ["Weybridge Lodge No. 6787"], highlights: [], dress_code: null,
  seats_taken: 0, useful_stuff: {}, menu_items: [], dietary_choices: [], payment_mode: "full", deposit_percent: null, balance_due_date: null,
  seo_title: null, seo_description: null, og_image_url: null,
};
const simple = { ...base, slug: "simple-test", public_title: "Simple Test Party", event_type: "simple", modules: {}, fee_cover_enabled: true };
const festival = {
  ...base, slug: "festival-test", public_title: "Festival Test Dinner With A Long Name To Check Wrapping", event_type: "dinner_festival",
  modules: { courses: true, kids_menu: false, catalogue: true, info_blocks: true, courses_decide_later: true, sections: {} }, fee_cover_enabled: false,
};
const C = "00000000-0000-4000-8000-0000000000c1", O1 = "00000000-0000-4000-8000-0000000000a1", CAT = "00000000-0000-4000-8000-0000000000d1", IT = "00000000-0000-4000-8000-0000000000e1";
const tables: Record<string, unknown[]> = {
  event_courses: [{ id: C, menu_set: "adult", name: "Main", sort_order: 0 }],
  event_course_options: [{ id: O1, course_id: C, label: "Roast sirloin of beef", active: true, dietary_tags: ["GF"], sort_order: 0 }],
  event_catalogue_categories: [{ id: CAT, name: "Sparkling", sort_order: 0 }],
  event_catalogue_items: [{ id: IT, category_id: CAT, name: "Prosecco", description: null, unit_note: "75cl bottle", price_pence: 2800, kind: "drink", max_per_booking: 6, active: true, sort_order: 0 }],
  event_info_blocks: [{ id: "00000000-0000-4000-8000-0000000000f1", title: "Hotel rooms", body: "Rooms held until 1 July.\nQuote the lodge name.", image_path: null, image_alt: null, link_url: "https://example.com", sort_order: 0 }],
};

async function mock(page: Page, ev: Record<string, unknown>, sent: unknown[]) {
  await page.route("**/rest/v1/**", (route: Route) => {
    const u = new URL(route.request().url());
    const t = u.pathname.split("/").pop()!;
    if (t === "public_events") {
      const one = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
      return route.fulfill({ json: one ? ev : [ev] });
    }
    return route.fulfill({ json: tables[t] ?? [] });
  });
  await page.route("**/functions/v1/create-event-checkout", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 400, json: { error: "Synthetic test — no booking made." } });
  });
}

async function fillContact(page: Page) {
  await page.locator("#pev-name").fill("Jane Tester");
  await page.locator("#pev-email").fill("julientidmarsh@pm.me");
  await page.getByPlaceholder("Name").first().fill("Jane Tester");
}

for (const width of [320, 390]) {
  test(`simple event: phone optional, request unchanged, no overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sent: any[] = [];
    await mock(page, simple, sent);
    await page.goto("/events/simple-test");
    await expect(page.getByRole("heading", { name: "Book your places" })).toBeVisible();
    await expect(page.getByText("Pre-order drinks")).toHaveCount(0);
    await expect(page.locator("#pev-phone")).not.toHaveAttribute("required", "");
    await fillContact(page);
    await page.getByRole("button", { name: /Continue to payment/ }).click();
    await expect(page.getByText("Synthetic test — no booking made.")).toBeVisible();
    const { origin, ...body } = sent[0];
    expect(body).toEqual({
      slug: "simple-test", contact_name: "Jane Tester", contact_email: "julientidmarsh@pm.me", contact_phone: "", lodge_label: "Weybridge",
      adults: 1, children: 0, guests: [{ name: "Jane Tester", age: null, is_child: false, dietary: "", dietary_choice: null }],
      payment_method: "card", cover_fee: true, website: "",
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`festival modules: courses, decide later, drinks, info cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const sent: any[] = [];
    await mock(page, festival, sent);
    await page.goto("/events/festival-test");
    await expect(page.getByRole("heading", { name: "Hotel rooms" })).toBeVisible();
    await fillContact(page);
    // Fee cover is off for this event, so no fee question.
    await expect(page.getByRole("radiogroup", { name: "Processing fee preference" })).toHaveCount(0);
    await page.getByRole("button", { name: /Continue to payment/ }).click();
    await expect(page.getByText("Please choose a dish for every course for each guest.")).toBeVisible();
    expect(sent).toHaveLength(0);
    await page.getByLabel("Main for Adult 1").selectOption({ label: "Decide later (we'll remind you)" });
    await page.getByLabel("More prosecco").click();
    await page.getByLabel("More prosecco").click();
    await expect(page.getByText("Pre-orders: £56.00")).toBeVisible();
    await page.getByRole("button", { name: /Continue to payment · £131.00/ }).click();
    await expect(page.getByText("Synthetic test — no booking made.")).toBeVisible();
    expect(sent[0].contact_phone).toBe("");
    expect(sent[0].cover_fee).toBe(false);
    expect(sent[0].items).toEqual([{ item_id: IT, qty: 2 }]);
    expect(sent[0].guests[0].courses).toEqual([{ course_id: C, option_id: null, decide_later: true }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/browser/public-event-modules-${width}.png` });
  });
}
