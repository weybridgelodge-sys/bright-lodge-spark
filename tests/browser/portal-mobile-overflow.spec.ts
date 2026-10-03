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

test("Admin member list Grand Lodge number editor fits 320px with 48px targets", async ({ page }) => {
  const id = "11111111-2222-3333-4444-555555555555";
  await page.route("**/rest/v1/rpc/get_admin_profiles**", (r) => r.fulfill({ json: [{ id, email: "long.name@example.com", title: "W Bro", first_name: "Bartholomew-Maximilian", last_name: "Featherstonehaugh-Wolstenholme", degree: "master_mason", status: "active", is_past_master: false, is_royal_arch: false, is_honorary_member: false, initiation_date: "2026-05-13" }] }));
  await page.route("**/rest/v1/rpc/get_profiles_pii**", (r) => r.fulfill({ json: [{ id, ugle_reg_number: null }] }));
  await page.goto(`/members/admin#member-${id}`);
  await waitForPortal(page);
  const input = page.getByLabel("Grand Lodge Ref. No.");
  if (!(await input.isVisible().catch(() => false))) test.skip(true, "Synthetic identity cannot manage members");
  await expect(input).toBeFocused();
  const save = page.getByRole("button", { name: "Save" });
  for (const box of [await input.boundingBox(), await save.boundingBox()]) {
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
  const doc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(doc).toBeLessThanOrEqual(320);
});
