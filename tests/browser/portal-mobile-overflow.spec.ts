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