import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Summons/accounts link failures name the Secretary from the public lodge profile; no typed address.
for (const [path, heading] of [["/summons/1", "Summons unavailable"], ["/accounts/2026", "Accounts unavailable"]] as const) {
  for (const [label, email] of [["with address", "secretary.with.a.long.name@example-lodge-domain.org"], ["no address", null]] as const) {
    test(`${heading} at 320px: ${label}`, async ({ page }) => {
      await page.addInitScript(() => sessionStorage.clear());
      await page.route("**/rest/v1/rpc/get_public_unit_profile**", (r) => r.fulfill({ json: { lodge_name: "Example Lodge", secretary_email: email } }));
      await page.goto(path); // no ?k= key, so the page shows its error state without calling the server
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15000 });
      const p = page.getByText(/please contact the Secretary/);
      if (email) await expect(page.locator(`a[href="mailto:${email}"]`)).toBeVisible();
      else { await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0); await expect(p).not.toContainText(/null|undefined|@/); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await expectNoAxeViolations(page, `${path} ${label}`);
    });
  }
}
