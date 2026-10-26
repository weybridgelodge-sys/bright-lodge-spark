import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

/**
 * Job CR: the Masonic year select in the Secretary Returns Add/Edit form sits in a
 * half-width column on a phone. The trigger must show only the year ("2026/27") so it
 * is never cut to "Masonic ye…"; the dropdown keeps the full "Masonic year 2026/27".
 */

const YEAR_LABEL = "2026/27";

async function waitForPortal(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function expectNoViewportOverflow(page: Page, context: string) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.body.querySelectorAll<HTMLElement>("button, a, input, textarea, [role='button'], [role='combobox']")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .map((element) => ({
        tag: element.tagName,
        text: (element.innerText || element.getAttribute("aria-label") || "").trim().slice(0, 80),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return { viewportWidth, documentWidth: document.documentElement.scrollWidth, offenders };
  });
  expect.soft(result.offenders, `OVERFLOW ${context}`).toEqual([]);
  expect.soft(result.documentWidth, `OVERFLOW ${context}: document`).toBeLessThanOrEqual(result.viewportWidth);
  await expectNoAxeViolations(page, context);
}

/** The visible text inside a select trigger plus whether it is clipped. */
async function triggerText(page: Page, ariaLabel: string, scope = "") {
  const span = page.locator(`${scope}[aria-label="${ariaLabel}"] > span`).first();
  const box = await span.evaluate((el) => ({
    text: (el.textContent ?? "").trim(),
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  return box;
}

test("Add-return form: Masonic year trigger shows the whole year, dropdown keeps the full label", async ({ page }) => {
  await page.goto("/members/admin/returns");
  await waitForPortal(page);
  await expectNoViewportOverflow(page, "returns list");

  await page.getByRole("button", { name: /Log a new return/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);

  const trigger = await triggerText(page, "Masonic year");
  expect.soft(trigger.text, "trigger shows the short year label").toBe(YEAR_LABEL);
  expect.soft(trigger.scrollWidth, "trigger text is not clipped horizontally").toBeLessThanOrEqual(trigger.clientWidth + 1);
  expect.soft(trigger.scrollHeight, "trigger text is not clipped vertically").toBeLessThanOrEqual(trigger.clientHeight + 1);

  // The dropdown keeps the descriptive wording.
  await page.locator('[aria-label="Masonic year"]').click();
  const option = page.getByRole("option", { name: `Masonic year ${YEAR_LABEL}` });
  await expect(option).toBeVisible();
  await option.click();
  await page.waitForTimeout(200);

  const afterPick = await triggerText(page, "Masonic year");
  expect.soft(afterPick.text, "trigger still shows the short label after picking").toBe(YEAR_LABEL);

  await expectNoViewportOverflow(page, "return form dialog");
});

test("All-years filter trigger shows the whole year once a year is chosen", async ({ page }) => {
  await page.goto("/members/admin/returns");
  await waitForPortal(page);

  const before = await triggerText(page, "All years");
  expect.soft(before.text, "filter starts on All years").toBe("All years");

  await page.locator('[aria-label="All years"]').click();
  await page.getByRole("option", { name: `Masonic year ${YEAR_LABEL}` }).click();
  await page.waitForTimeout(250);

  const after = await triggerText(page, "All years");
  expect.soft(after.text, "filter trigger shows the short year label").toBe(YEAR_LABEL);
  expect.soft(after.scrollWidth, "filter trigger text is not clipped").toBeLessThanOrEqual(after.clientWidth + 1);

  await expectNoViewportOverflow(page, "returns list filtered by year");
});
