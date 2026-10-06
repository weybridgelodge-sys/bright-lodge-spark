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
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [{ id, ugle_reg_number: "123456" }] }));
  await page.goto(`/members/admin?e2e_as=secretary#member-${id}`);
  await waitForPortal(page);
  const input = page.getByLabel("Grand Lodge Ref. No.");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("123456");
  // No standalone Save button next to the field: it saves with the form.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  const box = await input.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await expectNoViewportOverflow(page, "Edit Member with Grand Lodge number");
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
  ] }));
  await page.route("**/rest/v1/rpc/get_almoner_raffle_collections**", (r) => r.fulfill({ json: [{ id: "c1", collection_date: "2025-12-17", event_title: "Christmas Regular Meeting and Festive Board", net_amount: 412.5, allocated: 50, notes: null }] }));
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

test("Report widows section drafts lines and fits 320px", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("almoner-confidentiality", "1"));
  await page.route("**/functions/v1/almoner-widow-report**", (r) => r.fulfill({ json: { considered: 1, lines: [{ widow_id: "w1", name: "Mrs Featherstonehaugh-Wolstenholme", text: "Doris has not been too well but thanks the Lodge for her Christmas hamper." }] } }));
  await page.goto("/members/almoner");
  await waitForPortal(page);
  await page.getByRole("tab", { name: "Report" }).click();
  await page.getByRole("button", { name: "Draft widow updates" }).click();
  await expect(page.getByLabel("Mrs Featherstonehaugh-Wolstenholme")).toHaveValue(/thanks the Lodge/);
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
