import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe";

// Every mobile check ends with the WCAG 2.1 AA axe scan of the final (populated) state.
test.afterEach(async ({ page }, info) => { if (info.status === "passed") await expectNoAxeViolations(page, info.title); });

const title = "Joint Christmas Party at Guildford Masonic Centre";
const ics = [
  "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
  "UID:public-event-christmas@weybridgelodge.org.uk",
  "DTSTART;TZID=Europe/London:20261219T170000", "DTEND;TZID=Europe/London:20261220T000000",
  `SUMMARY:Social: ${title}`,
  "LOCATION:Guildford Masonic Centre\\, Hitherbury Close\\, Guildford GU2 4DR",
  "URL:https://weybridgelodge.org.uk/events/christmas-party-2026",
  "END:VEVENT", "END:VCALENDAR",
].join("\r\n");

for (const width of [320, 390]) {
  test(`member Christmas calendar is selectable and linked at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/rest/v1/member_calendar_tokens?**", (route) => route.fulfill({ json: { token: "synthetic-calendar-only" } }));
    await page.route("**/functions/v1/member-calendar-feed?**", (route) => route.fulfill({ contentType: "text/calendar", body: ics }));
    await page.goto("/members/calendar");
    await expect(page.getByRole("heading", { name: "Member Calendar" })).toBeVisible();
    // Move from the current month to December 2026 without relying on the runtime date.
    for (let i = 0; i < 24; i++) {
      const heading = await page.locator("h2").filter({ hasText: /\w+ \d{4}/ }).innerText();
      if (heading === "December 2026") break;
      const current = new Date(`${heading} 1`);
      await page.getByRole("button", { name: current < new Date("2026-12-01") ? "Next month" : "Previous month" }).click();
    }
    const day = page.getByRole("button", { name: "Saturday 19 December 2026", exact: true });
    await day.click();
    const link = page.getByRole("link", { name: title, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/events/christmas-party-2026");
    await expect(page.getByText("17:00 – 00:00", { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await link.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/browser/public-event-calendars/member-${width}.png` });
    await link.click();
    await expect(page).toHaveURL(/\/events\/christmas-party-2026$/);
  });
}