import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

test.afterEach(async ({ page }, info) => { if (info.status === "passed") await expectNoAxeViolations(page, info.title); });

const doc = (over: Record<string, unknown>) => ({
  id: "d", title: "Doc", description: null, category: "other", file_path: "other/d.pdf", file_size_bytes: 1000,
  created_at: "2026-10-21T12:00:00Z", required_degree: null, is_general: true, ...over,
});

test("Documents shows the Returns filter and card at 320px when a return is visible", async ({ page }) => {
  await page.route("**/rest/v1/lodge_documents**", (r) => r.fulfill({ json: [
    doc({ id: "r1", title: "Provincial Installation Return 2026/27 (sent 21 Oct 2026)", category: "returns", file_path: "returns/provincial_return/2026/L6787-Provincial-Return-2026-1.pdf", is_general: false }),
    doc({ id: "o1", title: "Lodge by-laws" }),
  ] }));
  await page.goto("/members/documents");
  const filter = page.getByRole("button", { name: "Returns", exact: true });
  await expect(filter).toBeVisible({ timeout: 15000 });
  await filter.click();
  await expect(page.getByText("Provincial Installation Return 2026/27 (sent 21 Oct 2026)")).toBeVisible();
  await expect(page.getByText("Lodge by-laws")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("Documents hides the Returns filter when no return is visible", async ({ page }) => {
  await page.route("**/rest/v1/lodge_documents**", (r) => r.fulfill({ json: [doc({ id: "o1", title: "Lodge by-laws" })] }));
  await page.goto("/members/documents");
  await expect(page.getByText("Lodge by-laws")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Returns", exact: true })).toHaveCount(0);
});

test("Data Protection hides the signatures sentence while signatures are off", async ({ page }) => {
  await page.route("**/rest/v1/rpc/officer_signatures_enabled**", (r) => r.fulfill({ json: false }));
  await page.goto("/data-protection");
  await expect(page.getByRole("heading", { name: /Members Portal/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/choose to store your signature/)).toHaveCount(0);
});

test("Data Protection shows the signatures sentence when signatures are on", async ({ page }) => {
  await page.route("**/rest/v1/rpc/officer_signatures_enabled**", (r) => r.fulfill({ json: true }));
  await page.goto("/data-protection");
  await expect(page.getByText(/choose to store your signature/)).toBeVisible({ timeout: 15000 });
});
