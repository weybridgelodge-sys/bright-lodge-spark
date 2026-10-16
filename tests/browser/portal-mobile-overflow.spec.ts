import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const routesSource = fs.readFileSync(path.resolve("src/MembersRoutes.tsx"), "utf8");
const routePaths = [...routesSource.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((route) => route && route !== "*" && route !== "login" && route !== "pending" && route !== "dashboard" && !route.includes(":"))
  .map((route) => `/members/${route}`.replace(/\/$/, ""));

const requiredToolRoutes = [
  "/members/admin/treasurer",
  "/members/admin/secretary",
  "/members/admin/installation-return",
  "/members/admin/returns",
  "/members/admin/minutes",
  "/members/summons",
];

const treasurerTabs = [
  "Direct Payment",
  "Direct Receipt",
  "Creditors",
  "General Journal",
  "New Member Fees",
  "Event Accounts",
  "Balance Sheet",
  "Income & Expenditure",
  "Trial Balance",
  "Transaction Detail",
  "Creditor & Debtor Balances",
  "Membership Breakeven",
  "Budget",
  "Bank Statement Repository",
  "Bank Reconciliation",
  "Dining Reconciliation",
  "Year End",
  "Period Close",
  "Property Register",
];

async function waitForPortal(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function expectNoViewportOverflow(page: Page, context: string) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.body.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [role='button'], [role='tab'], [role='combobox']")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .map((element) => ({
        tag: element.tagName,
        text: (element.innerText || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").trim().slice(0, 100),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      offenders,
    };
  });

  expect(result.offenders, `${context}: interactive controls outside the viewport`).toEqual([]);
  expect(result.documentWidth, `${context}: document overflowed`).toBeLessThanOrEqual(result.viewportWidth);
  expect(result.bodyWidth, `${context}: body overflowed`).toBeLessThanOrEqual(result.viewportWidth);
}

test("route discovery includes the Treasurer and Secretary tool pages", () => {
  expect(routePaths).toEqual(expect.arrayContaining(requiredToolRoutes));
});

for (const route of routePaths) {
  test(`${route} stays within a 320px viewport`, async ({ page }) => {
    await page.goto(route);
    await waitForPortal(page);
    await expectNoViewportOverflow(page, route);
  });
}

test("every Treasurer tab stays within a 320px viewport", async ({ page }) => {
  await page.goto("/members/admin/treasurer");
  await waitForPortal(page);

  for (const name of treasurerTabs) {
    const tab = page.getByRole("tab", { name, exact: true });
    await expect(tab, `Treasurer tab missing from coverage: ${name}`).toBeVisible();
    await tab.click();
    await page.waitForTimeout(150);
    await expectNoViewportOverflow(page, `Treasurer / ${name}`);
  }
});
test("Meeting Events archive controls stay within 320px with 48px targets", async ({ page }) => {
  const future = new Date(Date.now() + 20 * 86400_000).toISOString();
  const past = new Date(Date.now() - 200 * 86400_000).toISOString();
  const base = { intro_heading: null, tyling_time: "Tyling at 6.00 pm prompt", dining_time: "Dining 7.45 pm", location: "Guildford Masonic Centre", dress_code: "Dark suit", booking_deadline: null, header_image_url: null, sort_order: 0, archived_by: null };
  const rows = [
    { ...base, id: "e1", slug: "e1", title: "Double Initiation Ceremony — December Meeting", intro: "Intro paragraph one.\n\nIntro two.", event_date: future, published: false, archived_at: null },
    { ...base, id: "e2", slug: "e2", title: "Installation Meeting and Charitable White Table", intro: "Archived intro text to copy.", event_date: past, published: false, archived_at: past },
  ];
  await page.route("**/rest/v1/lodge_events?**", (r) => {
    const u = r.request().url();
    const one = u.includes("id=eq.e2") ? rows[1] : null;
    return r.fulfill({ json: one ?? rows, headers: { "content-range": "0-1/2" } });
  });
  await page.route("**/rest/v1/lodge_event_courses?**", (r) => r.fulfill({ json: [{ id: "c1", event_id: "e2", course_label: "Main", dish: "Roast beef with all the trimmings", description: "", position: 1 }] }));
  await page.route("**/rest/v1/lodge_event_dining_options?**", (r) => r.fulfill({ json: [{ id: "o1", event_id: "e2", label: "Three-course dinner", price_pence: 3500, position: 1, is_default: true }] }));
  await page.route("**/rest/v1/bookings?**", (r) => r.fulfill({ json: [], headers: { "content-range": "*/3" } }));

  await page.goto("/members/events");
  await waitForPortal(page);
  const archiveBtn = page.getByRole("button", { name: /^Archive Double Initiation/ });
  if (!(await archiveBtn.isVisible().catch(() => false))) test.skip(true, "Synthetic identity cannot edit meetings");
  await expectNoViewportOverflow(page, "Meeting Events list");
  for (const name of [/^Archive Double Initiation/, /^Delete Double Initiation/, /^Archived \(1\)/]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box!.height, `${name} touch target`).toBeGreaterThanOrEqual(48);
  }
  const activeActions = await Promise.all([
    page.getByRole("button", { name: /^Archive Double Initiation/ }).boundingBox(),
    page.getByRole("button", { name: /^Delete Double Initiation/ }).boundingBox(),
  ]);
  expect(activeActions[0]?.y).toBe(activeActions[1]?.y);
  expect(Math.abs((activeActions[0]?.width ?? 0) - (activeActions[1]?.width ?? 0))).toBeLessThanOrEqual(1);
  const title = await page.getByText("Double Initiation Ceremony — December Meeting").boundingBox();
  expect(title?.width).toBeGreaterThan(180);
  await archiveBtn.click();
  await expect(page.getByRole("alert")).toContainText(/\d+ bookings?/);
  await expectNoViewportOverflow(page, "Archive confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: /^Archived \(1\)/ }).click();
  await page.getByRole("button", { name: /Show content/ }).click();
  await expect(page.getByText("Roast beef with all the trimmings")).toBeVisible();
  await expectNoViewportOverflow(page, "Archived meetings");
  const archivedActions = await Promise.all([
    page.getByRole("button", { name: /^Restore Installation/ }).boundingBox(),
    page.getByRole("button", { name: /^Delete Installation/ }).boundingBox(),
  ]);
  expect(archivedActions[0]?.height).toBeGreaterThanOrEqual(48);
  expect(archivedActions[1]?.height).toBeGreaterThanOrEqual(48);
  expect(archivedActions[0]?.y).toBe(archivedActions[1]?.y);
  expect(Math.abs((archivedActions[0]?.width ?? 0) - (archivedActions[1]?.width ?? 0))).toBeLessThanOrEqual(1);

  await page.locator("main").evaluate((main) => window.scrollTo(0, main.getBoundingClientRect().bottom + window.scrollY));
  const lastCard = await page.locator("main article").last().boundingBox();
  const bottomNav = await page.getByRole("link", { name: "Hub", exact: true }).locator("..").boundingBox();
  expect(lastCard && bottomNav ? lastCard.y + lastCard.height <= bottomNav.y : false, "last meeting card clears the fixed bottom navigation").toBe(true);
});

test("Grand Lodge number deep link opens Edit Member with the field focused at 320px (Secretary)", async ({ page }) => {
  const id = "11111111-2222-3333-4444-555555555555";
  await page.route("**/rest/v1/rpc/get_admin_profiles**", (r) => r.fulfill({ json: [{ id, email: "long.name@example.com", title: "W Bro", first_name: "Bartholomew-Maximilian", last_name: "Featherstonehaugh-Wolstenholme", degree: "master_mason", status: "active", is_past_master: false, is_royal_arch: false, is_honorary_member: false, initiation_date: "2026-05-13" }] }));
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [{ id, ugle_reg_number: "123456", mmh_number: "1270787", rose_croix_number: "RC-998877" }] }));
  await page.goto(`/members/admin?e2e_as=secretary#member-${id}`);
  await waitForPortal(page);
  const input = page.getByLabel("Grand Lodge Ref. No.");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("123456");
  // No standalone Save button next to the field: it saves with the form.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  for (const [label, val] of [["MMH Number", "1270787"], ["Rose Croix Number", "RC-998877"]] as const) {
    const f = page.getByLabel(label);
    await expect(f).toBeVisible();
    await expect(f).toHaveValue(val);
    const b = await f.boundingBox();
    expect(b!.height).toBeGreaterThanOrEqual(44);
    expect(b!.x + b!.width).toBeLessThanOrEqual(320);
  }
  const box = await input.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await expectNoViewportOverflow(page, "Edit Member with Grand Lodge, MMH and Rose Croix numbers");
});

test("Secretary-only Member Management fits 320px and shows approve/suspend, hides admin-only controls", async ({ page }) => {
  const id = "11111111-2222-3333-4444-555555555556";
  await page.route("**/rest/v1/rpc/get_admin_profiles**", (r) => r.fulfill({ json: [{ id, email: "long.name@example.com", title: "W Bro", first_name: "Bartholomew-Maximilian", last_name: "Featherstonehaugh-Wolstenholme", degree: "master_mason", status: "pending", is_past_master: false, is_royal_arch: false, is_honorary_member: false, initiation_date: "2026-05-13" }] }));
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [{ id, ugle_reg_number: null }] }));
  await page.goto("/members/admin?e2e_as=secretary");
  await waitForPortal(page);
  await expect(page.getByLabel("Grand Lodge Ref. No.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit member" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Suspend", exact: true })).toBeVisible();
  const statusMenu = page.getByRole("combobox", { name: /^Change status for/ }).first();
  await expect(statusMenu).toBeVisible();
  for (const v of ["pending", "active", "year_out", "suspended", "resigned", "excluded", "deceased"]) {
    await expect(statusMenu.locator(`option[value="${v}"]`)).toHaveCount(1);
  }
  const box = await statusMenu.boundingBox();
  expect(box && box.height >= 48).toBeTruthy();
  await statusMenu.selectOption("deceased");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expectNoViewportOverflow(page, "Secretary status confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  for (const name of ["Make admin", "Assign Almoner role", "Delete member"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: /^notices$/i })).toHaveCount(0);
  await expectNoViewportOverflow(page, "Secretary member list");
  await page.getByRole("button", { name: "Edit member" }).click();
  await expectNoViewportOverflow(page, "Secretary edit member form");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("Secretary member import preview fits 320px", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_admin_profiles**", (r) => r.fulfill({ json: [] }));
  await page.route("**/functions/v1/admin-import-members**", (r) => r.fulfill({ json: { ok: true, dry_run: true,
    summary: { create: 1, fill: 1, unchanged: 0, error: 1 },
    results: [
      { row: 2, email: "bartholomew.maximilian.featherstonehaugh@example-long-domain.co.uk", action: "create", fields: ["first_name", "last_name", "initiation_date", "dietary_requirements"] },
      { row: 3, email: "a@b.com", action: "fill", fields: ["town"] },
      { row: 4, email: "bad", action: "error", message: "valid email is required; date_of_birth is not a real date (use dd/mm/yyyy or yyyy-mm-dd)" },
    ] } }));
  await page.goto("/members/admin?e2e_as=secretary");
  await waitForPortal(page);
  await page.getByRole("button", { name: /^import$/i }).click();
  await page.locator('input[type=file]').setInputFiles({ name: "members.csv", mimeType: "text/csv",
    buffer: Buffer.from("email,first_name,last_name\na@b.com,A,B\nc@d.com,C,D\nbad,E,F\n") });
  await expect(page.getByRole("button", { name: /Import 2 rows/ })).toBeVisible();
  const box = await page.getByRole("button", { name: /Import 2 rows/ }).boundingBox();
  expect(box && box.height >= 44).toBeTruthy();
  await expectNoViewportOverflow(page, "Member import preview");
});

test("Almoner portal read-only view (WM) fits 320px and hides write controls", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await page.goto("/members/almoner?e2e_almoner=readonly");
  await waitForPortal(page);
  await expect(page.getByText("Read-only view")).toBeVisible();
  for (const name of ["New log entry", "Log absence", "Add event", "New entry", "New referral"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
  await expectNoViewportOverflow(page, "Almoner read-only");
});

test("Widows register read-only view (WM) fits 320px and hides write controls", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await page.goto("/members/almoner?e2e_almoner=readonly");
  await waitForPortal(page);
  await page.getByRole("tab", { name: /Widows/ }).click();
  await expect(page.getByRole("heading", { name: /Widows & Dependants/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add widow" })).toHaveCount(0);
  await expectNoViewportOverflow(page, "Widows read-only");
});

test("Widows register editor form fits 320px with 48px controls", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await page.goto("/members/almoner");
  await waitForPortal(page);
  await page.getByRole("tab", { name: /Widows/ }).click();
  await page.getByRole("button", { name: "Add widow" }).click();
  await expect(page.getByLabel("Year (if known)")).toBeVisible();
  const box = await page.getByRole("button", { name: "Add widow" }).last().boundingBox();
  expect(box && box.height >= 44).toBeTruthy();
  await expectNoViewportOverflow(page, "Widows add form");
  // Care-home-only fields (name, address, contact hours) appear without overflow
  await page.getByLabel("Lives in").click();
  await page.getByRole("option", { name: "Care home" }).click();
  await expect(page.getByLabel("Contact hours")).toBeVisible();
  await expectNoViewportOverflow(page, "Widows care-home fields");
});

const mockWidow = async (page: import("@playwright/test").Page) => {
  const widow = { id: "w1", full_name: "Doris Featherstonehaugh-Wolstenholme", preferred_address: "Mrs Featherstonehaugh", address: null, home_type: "own_home", care_home_name: null, care_home_address: null, care_home_contact_hours: null, phone: null, dob_day: null, dob_month: null, dob_year: null, husband_name: null, husband_lodge: null, connection_source: "smwa", smwa_reference: null, smwa_liaison: null, status: "active", deceased_on: null, contact_interval_days: 90, notes: null, created_at: "2025-01-01T00:00:00Z" };
  await page.route("**/rest/v1/almoner_widows?**", (r) => r.fulfill({ json: [widow] }));
  await page.route("**/rest/v1/almoner_widow_contacts?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/almoner_widow_kin?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/almoner_widow_gifts?**", (r) => r.fulfill({ json: [
    { id: "g1", widow_id: "w1", lodge_year: 2025, gift_type: "cheque", description: null, amount: 50, date_sent: "2025-12-10", funding_collection_id: "c1", notes: null, logged_by: null },
    { id: "g2", widow_id: "w1", lodge_year: 2024, gift_type: "hamper", description: null, amount: null, date_sent: "2024-12-12", funding_collection_id: null, notes: null, logged_by: null },
    { id: "g3", widow_id: "w1", lodge_year: 2025, gift_type: "voucher", description: null, amount: 25, date_sent: "2025-12-10", funding_collection_id: "c2", notes: null, logged_by: null },
  ] }));
  await page.route("**/rest/v1/rpc/get_almoner_raffle_collections**", (r) => r.fulfill({ json: [{ id: "c1", collection_date: "2025-12-17", event_title: "Christmas Regular Meeting and Festive Board", net_amount: 412.5, allocated: 50, notes: null }, { id: "c2", collection_date: "2025-12-10", event_title: null, net_amount: 300, allocated: 0, notes: null }] }));
};

test("Widow gifts section fits 320px; editor form has 48px controls", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await mockWidow(page);
  await page.goto("/members/almoner");
  await waitForPortal(page);
  await page.getByRole("tab", { name: /Widows/ }).click();
  await page.getByText("Doris Featherstonehaugh-Wolstenholme").first().click();
  await expect(page.getByText("Hamper 2024 · Cheque £50 2025")).toBeVisible();
  await page.getByRole("button", { name: "Record gift" }).click();
  await page.getByLabel("Gift type").click();
  await page.getByRole("option", { name: "Cheque" }).click();
  await expect(page.getByLabel("Amount (£)")).toBeVisible();
  const box = await page.getByRole("button", { name: "Save gift" }).boundingBox();
  expect(box && box.height >= 44).toBeTruthy();
  await expectNoViewportOverflow(page, "Widow gifts form");
});

test("Widow gifts read-only (WM) hides write controls at 320px", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await mockWidow(page);
  await page.goto("/members/almoner?e2e_almoner=readonly");
  await waitForPortal(page);
  await page.getByRole("tab", { name: /Widows/ }).click();
  await page.getByText("Doris Featherstonehaugh-Wolstenholme").first().click();
  await expect(page.getByText("Hamper 2024 · Cheque £50 2025")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record gift" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove gift record" })).toHaveCount(0);
  await expectNoViewportOverflow(page, "Widow gifts read-only");
});

test("Raffle funding label never repeats 'Raffle' at 320px", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await mockWidow(page);
  await page.goto("/members/almoner");
  await waitForPortal(page);
  await page.getByRole("tab", { name: /Widows/ }).click();
  await page.getByText("Doris Featherstonehaugh-Wolstenholme").first().click();
  // Untitled collection: date and net amount only, once the prefix is added.
  await expect(page.getByText("Funded by: Raffle — 10 Dec 2025 · net £300.00").first()).toBeVisible();
  await expect(page.getByText("Raffle — Raffle")).toHaveCount(0);
  await page.getByRole("button", { name: "Record gift" }).click();
  await page.getByLabel("Funded by").click();
  await expect(page.getByRole("option", { name: "Raffle — 10 Dec 2025 · net £300.00" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Raffle — Raffle" })).toHaveCount(0);
  await expectNoViewportOverflow(page, "Raffle funding labels");
});

test("Report widows section drafts lines and fits 320px", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await page.route("**/functions/v1/almoner-widow-report**", (r) => r.fulfill({ json: { considered: 1, lines: [{ widow_id: "w1", name: "Mrs Featherstonehaugh-Wolstenholme", text: "Doris has not been too well but thanks the Lodge for her Christmas hamper." }] } }));
  await page.goto("/members/almoner");
  await waitForPortal(page);
  await page.getByRole("tab", { name: "Report" }).click();
  await page.getByRole("button", { name: "Draft widow updates" }).click();
  await expect(page.getByRole("textbox", { name: "Mrs Featherstonehaugh-Wolstenholme" })).toHaveValue(/thanks the Lodge/);
  const box = await page.getByRole("button", { name: /widow updates/ }).boundingBox();
  expect(box && box.height >= 44).toBeTruthy();
  await expectNoViewportOverflow(page, "Report widows section");
});

test("Report widows section is read-only for WM at 320px", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await page.goto("/members/almoner?e2e_almoner=readonly");
  await waitForPortal(page);
  await page.getByRole("tab", { name: "Report" }).click();
  await expect(page.getByRole("region", { name: "Widows and dependants" })).toBeVisible();
  await expect(page.getByRole("button", { name: /widow updates/ })).toHaveCount(0);
  await expectNoViewportOverflow(page, "Report widows read-only");
});

test("KPI candidate change keeps scroll position at 320px", async ({ page }) => {
  const cand = { id: "cand1", first_name: "Bartholomew", last_name: "Featherstonehaugh", email: "b@example.com", phone: null, proposer: "W Bro. Smith", seconder: null, stage: "enquiry", notes: null, date_of_enquiry: "2026-09-01", initiation_scheduled_date: null, converted_member_id: null, referral_source: null, created_at: "2026-09-01", updated_at: "2026-09-01" };
  await page.route("**/rest/v1/candidates?**", (r) => r.request().method() === "PATCH" ? r.fulfill({ status: 204, body: "" }) : r.fulfill({ json: [cand] }));
  await page.goto("/members/kpis");
  await waitForPortal(page);
  const row = page.locator("#candidate-cand1");
  await row.waitFor({ state: "visible", timeout: 15_000 });
  await row.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 50));
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(300);
  await row.locator("select").first().selectOption({ index: 1 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.scrollY);
  expect(Math.abs(after - before)).toBeLessThan(50);
  await expectNoViewportOverflow(page, "KPI candidates");
});

for (const secretary of [false, true]) {
  for (const width of [320, 360, 390]) {
    test(`Users names and actions remain readable at ${width}px (${secretary ? "Secretary" : "admin"})`, async ({ browser }) => {
      const context = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width, height: 900 }, isMobile: true, hasTouch: true,
        userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" });
      const page = await context.newPage();
      const id = "11111111-2222-3333-4444-555555555557";
      const name = "W Bro. Bartholomew-Maximilian Featherstonehaugh-Wolstenholme";
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/rest/v1/**", (r) => r.fulfill({ json: r.request().url().includes("get_admin_profiles") ? [{
        id, email: "bartholomew.maximilian.featherstonehaugh@example-long-domain.co.uk",
        full_name: name, title: "W Bro", first_name: "Bartholomew-Maximilian", last_name: "Featherstonehaugh-Wolstenholme",
        provincial_rank: "Past Provincial Junior Grand Warden", degree: "installed_master", status: "active", is_past_master: true, is_royal_arch: true, is_honorary_member: true,
      }, {
        id: "11111111-2222-3333-4444-555555555558", email: "alexander@example.com", full_name: "Bro. Alexander Montgomery-Smythe",
        title: "Bro", first_name: "Alexander", last_name: "Montgomery-Smythe", degree: "entered_apprentice", status: "pending",
      }] : [] }));
      await page.goto(`/members/admin${secretary ? "?e2e_as=secretary" : ""}`);
      const row = page.locator(`#member-${id}`);
      await expect(row.getByRole("button", { name: "Edit member", exact: true })).toBeVisible();
      const nameElement = row.locator("[data-member-name]");
      await expect(nameElement).toContainText("Featherstonehaugh-Wolstenholme");
      await expect(nameElement).toContainText("Bartholomew-Maximilian");
      const geometry = await nameElement.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const covered = [0.1, 0.5, 0.9].some((fraction) => {
          const top = document.elementFromPoint(rect.left + rect.width * fraction, rect.top + rect.height / 2);
          return !top || (top !== el && !el.contains(top));
        });
        return { left: rect.left, right: rect.right, width: rect.width, bottom: rect.bottom, clipped: el.scrollWidth > el.clientWidth, covered };
      });
      expect(geometry.width).toBeGreaterThanOrEqual(width - 70);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.clipped).toBe(false);
      expect(geometry.covered).toBe(false);
      // A bounding box and textContent alone do not prove the text is painted.
      for (const detail of ["[data-member-name]", "[data-member-email]", "[data-member-rank]", "[data-member-status]"]) {
        const element = row.locator(detail);
        await expect(element).toBeVisible();
        const painted = await element.evaluate((el) => {
          const style = getComputedStyle(el);
          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = [...range.getClientRects()];
          return { opacity: style.opacity, color: style.color, clipped: el.scrollWidth > el.clientWidth,
            inside: rects.length > 0 && rects.every((rect) => rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth) };
        });
        expect(painted.opacity).toBe("1");
        expect(painted.color).not.toBe("rgba(0, 0, 0, 0)");
        expect(painted.clipped).toBe(false);
        expect(painted.inside).toBe(true);
      }
      const actions = await row.locator("[data-member-actions]").boundingBox();
      expect(actions && actions.y >= geometry.bottom).toBe(true);
      for (const button of await row.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box && box.height >= 48 && box.width >= 48).toBe(true);
      }
      const actionLines = await row.locator("[data-member-actions] button, [data-member-actions] select").evaluateAll((els) =>
        new Set(els.map((el) => Math.round(el.getBoundingClientRect().top))).size);
      // Secretary has fewer controls; only the full admin action set needs wrapping.
      if (!secretary) expect(actionLines).toBeGreaterThan(1);
      const headerEnd = await page.getByRole("button", { name: "Sign out", exact: true }).boundingBox();
      expect(headerEnd && headerEnd.x + headerEnd.width <= width - 16).toBe(true);
      await expect(page.locator("header").getByRole("img", { name: "Weybridge Lodge crest" })).toBeVisible();
      await expectNoViewportOverflow(page, `Populated Users ${width}px ${secretary ? "Secretary" : "admin"}`);
      await page.screenshot({ path: `/tmp/browser/member-admin-${secretary ? "secretary" : "admin"}-${width}.png` });
      await row.getByRole("button", { name: "Edit member", exact: true }).click();
      await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Bartholomew-Maximilian");
      await expect(page.getByLabel("Last name", { exact: true })).toHaveValue("Featherstonehaugh-Wolstenholme");
      await expectNoViewportOverflow(page, `Edit selected member ${width}px`);
      await context.close();
    });
  }
}

test("Users retains a desktop table when resizing from phone", async ({ page }) => {
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: r.request().url().includes("get_admin_profiles") ? [{
    id: "desktop-member", full_name: "W Bro. Alexander Montgomery-Smythe", first_name: "Alexander", last_name: "Montgomery-Smythe",
    email: "alexander@example.com", status: "active", degree: "installed_master",
  }] : [] }));
  await page.goto("/members/admin");
  await expect(page.locator("[data-member-name]")).toBeVisible();
  await expect(page.locator("#member-desktop-member")).toHaveJSProperty("tagName", "DIV");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("table", { name: "Members" })).toBeVisible();
  await expect(page.locator("#member-desktop-member")).toHaveJSProperty("tagName", "TR");
  await expect(page.locator("thead th").filter({ hasText: "Actions" })).toBeVisible();
  expect(await page.locator("[data-member-actions]").evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
  await page.screenshot({ path: "/tmp/browser/member-admin-desktop.png" });
});

test("Almoner system auto-log entries are marked on the board and distinct in the Welfare Log at 320px", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  const member = { id: "m1", full_name: "Wilberforce Aldington-Smythe-Featherstone", preferred_name: null, first_name: "Wilberforce", last_name: "Aldington-Smythe-Featherstone", title: "W Bro.", initiation_date: "2010-01-01", joined_lodge_date: null, joined_year: null, status: "active" };
  const sysEntry = { id: "s1", member_id: "m1", contact_date: "2026-09-12", contact_type: "none", contact_nature: "routine", nature_detail: null, notes: "System: missed without apology — 13 May 2026, 12 Sept 2026 (2 consecutive meetings).", action_taken: null, follow_up_date: null, logged_by: null, created_at: "2026-10-11T06:00:00Z", is_system: true };
  await page.route("**/rest/v1/profiles?**", (r) => r.fulfill({ json: [member] }));
  await page.route("**/rest/v1/welfare_log_entries?**", (r) => r.fulfill({ json: [sysEntry] }));
  await page.goto("/members/almoner");
  await waitForPortal(page);
  await expect(page.getByText(/System flag/)).toBeVisible();
  await expect(page.getByText(/Last contact:/).first()).toContainText("Never");
  await expectNoViewportOverflow(page, "Welfare Board system flag");
  await page.getByRole("button", { name: /Wilberforce/ }).first().click();
  const entry = page.locator("[data-system-entry]");
  await expect(entry).toBeVisible();
  await expect(entry.getByText("Automatic entry — no contact made")).toBeVisible();
  const box = await entry.getByRole("button", { name: "Dismiss" }).boundingBox();
  expect(box && box.height >= 44).toBeTruthy();
  await expectNoViewportOverflow(page, "Welfare Log system entry");
});

test("Summons visitor email dialog fits 320px with worst-case names", async ({ page }) => {
  const visitors = [
    { id: "v1", name: "W Bro. Bartholomew Featherstonehaugh-Wolstenholme", email: "bartholomew.featherstonehaugh-wolstenholme@example.com", lodge_name: "United Grand Lodge of England Mark Master Masons", lodge_number: "6787", created_at: "2026-01-01T00:00:00Z" },
    { id: "v2", name: "Ben Dickson", email: "ben.dickson@example.com", lodge_name: null, lodge_number: null, created_at: "2026-01-01T00:00:00Z" },
  ];
  await page.route("**/rest/v1/visitor_contacts**", (r) => r.fulfill({ json: visitors }));
  await page.route("**/rest/v1/visitor_attendances**", (r) => r.fulfill({ json: [
    { visitor_contact_id: "v1", festive_board_attendance: { attendance_status: "Attended", festive_board_meetings: { meeting_date: "2026-05-13" } } },
    { visitor_contact_id: "v2", festive_board_attendance: { attendance_status: "Apologies", festive_board_meetings: { meeting_date: "2026-10-21" } } },
  ] }));
  await page.goto("/members/summons");
  await waitForPortal(page);
  await page.getByRole("button", { name: "Email to Visitors…" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Email Summons to Visitors")).toBeVisible();
  // Long names/emails must render; the apology-only visitor shows "Not yet attended"
  await expect(dialog.getByText("W Bro. Bartholomew Featherstonehaugh-Wolstenholme").first()).toBeVisible();
  await expect(dialog.getByText("Not yet attended").first()).toBeVisible();
  // Salutation inputs remain reachable inside the scrollable table
  await expect(dialog.getByPlaceholder("e.g. W Bro Smith").first()).toBeVisible();
  await expectNoViewportOverflow(page, "Summons visitor email dialog");
});

test("Public Events cards and editor stay within 320px with 44px+ targets", async ({ page }) => {
  const row = { id: "x1", name: "Christmas Party 2026", public_title: "Joint Christmas Party at Guildford Masonic Centre — a very long festive title", slug: "christmas-party-2026", event_date: "2026-12-19", start_time: null, end_time: null, is_public: false, archived_at: null, status: "planning", highlights: ["Hot buffet"], hosting_lodges: ["Weybridge Lodge No. 6787", "Astolat Lodge No. 5848"], menu_items: ["Hot buffet"], dietary_choices: [], useful_stuff: {}, theme: "christmas" };
  await page.route("**/rest/v1/event_accounts?**", (r) => r.fulfill({ json: [row] }));
  await page.goto("/members/public-events");
  await waitForPortal(page);
  const edit = page.getByRole("button", { name: "Edit" });
  if (!(await edit.isVisible().catch(() => false))) test.skip(true, "Synthetic identity cannot manage public events");
  await expectNoViewportOverflow(page, "Public Events list");
  for (const name of ["Edit", "Publish", "Archive", "Delete"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box!.height, `${name} touch target`).toBeGreaterThanOrEqual(44);
  }
  await edit.click();
  await expect(page.getByLabel("Public title")).toBeVisible();
  await expectNoViewportOverflow(page, "Public Events editor");
});

test("Summons candidate card has labelled fields and 44px+ targets at 320px", async ({ page }) => {
  await page.goto("/members/summons");
  await waitForPortal(page);
  await page.getByRole("button", { name: /Add candidate/ }).click();

  const fields = [
    ["Name", "Bartholomew Featherstonehaugh-Wolstenholme"],
    ["Occupation", "Chartered Certified Accountant & Company Director"],
    ["Address", "12 Queen Charlotte Street, Guildford, Surrey GU1 4AAA, United Kingdom"],
    ["Proposer", "W Bro. Bartholomew Featherstonehaugh-Wolstenholme PProvJGW"],
    ["Seconder", "W Bro. A Very Long Surname Indeed"],
  ] as const;
  for (const [label, value] of fields) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-05-14");
  await page.getByLabel("Date proposed", { exact: true }).fill("2026-10-21");

  for (const label of ["Name", "Ceremony", "Date of birth", "Occupation", "Address", "Proposer", "Seconder", "Date proposed"]) {
    await expect(page.getByLabel(label, { exact: true }), `${label} field`).toBeVisible();
  }
  await expect(page.getByText("The meeting at which the candidate was proposed.")).toBeVisible();

  for (const label of ["Name", "Ceremony", "Date of birth", "Occupation", "Address", "Proposer", "Seconder", "Date proposed"]) {
    const box = await page.getByLabel(label, { exact: true }).boundingBox();
    expect(box, `${label} is measurable`).not.toBeNull();
    expect(box!.height, `${label} touch target`).toBeGreaterThanOrEqual(44);
    expect(box!.width, `${label} fits the viewport`).toBeLessThanOrEqual(320);
  }

  // Phone layout stacks to a single column: every field shares the same left edge.
  const layout = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const labels = ["Name", "Ceremony", "Date of birth", "Occupation", "Address", "Proposer", "Seconder", "Date proposed"];
    const lefts: number[] = [];
    let card: HTMLElement | null = null;
    for (const text of labels) {
      const el = [...document.querySelectorAll<HTMLElement>("label")].find((l) => l.textContent?.trim() === text);
      const control = el?.htmlFor ? document.getElementById(el.htmlFor) : document.querySelector(`[aria-label="${text}"]`);
      if (!control || !el) continue;
      lefts.push(Math.round(control.getBoundingClientRect().left));
      card ??= el.closest("div.border") as HTMLElement | null;
    }
    if (!card) return { error: "candidate card not found" };
    const cardBox = card.getBoundingClientRect();
    const offenders = [...card.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [role='combobox']")]
      .filter((el) => {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden") return false;
        const r = el.getBoundingClientRect();
        return r.left < -1 || r.right > vw + 1;
      })
      .map((el) => (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40));
    return {
      lefts,
      offenders,
      cardRight: Math.round(cardBox.right),
      cardScrolls: card.scrollWidth > card.clientWidth + 1,
      viewportWidth: vw,
    };
  });
  expect(layout).not.toHaveProperty("error");
  expect(layout.lefts).toHaveLength(8);
  expect(new Set(layout.lefts).size, "single column on phones").toBe(1);
  expect(layout.offenders, "candidate card controls inside the viewport").toEqual([]);
  expect(layout.cardRight).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.cardScrolls, "candidate card needs no horizontal scrolling").toBe(false);

  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Bartholomew Featherstonehaugh-Wolstenholme");
});
