import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe";

// Mocked data only; no backend writes. The mock store behaves like the server:
// partial saves merge onto the stored value.
type Store = Record<string, Record<string, unknown>>;
function seed(): Store {
  return {
    bank_details: { account_name: "Sample Account", sort_code: "11-22-33", account_number: "12345678", reference_pattern: "Dining + {surname}" },
    payment_wording: { card_wording: "Pay online by card", cheque_payee: "Sample Lodge No 1234" },
    booking_contact_email: { email: "bookings@example.invalid" },
    sign_off: { override: "Yours, the Sample Lodge" },
    meeting_place: { venue_id: "v1" },
    web_social: { facebook_url: "https://facebook.example.invalid/sample", instagram_url: "https://instagram.example.invalid/sample", twitter_url: "https://x.example.invalid/sample" },
    registrations: { ico_number: "ZZ000001" },
    province: { name: "Province of Example" },
    newsletter: { masthead: "Sample Masthead", footer_note: "Sample Hall, AB1 2CD" },
    calendar_feed: { name: "Sample Calendar" },
    return_files: { provincial: "L1234-Provincial-Return-{year}", installation: "Installation-Return-1234-{year}" },
  };
}
async function mock(page: Page, edit: boolean, saved: any[], store: Store = seed(), fail = false) {
  await page.route("**/rest/v1/rpc/can_view_unit_setup**", (r) => r.fulfill({ json: true }));
  await page.route("**/rest/v1/rpc/can_edit_unit_setup**", (r) => r.fulfill({ json: edit }));
  await page.route("**/rest/v1/rpc/get_lodge_identity**", (r) => r.fulfill({ json: { unit_id: "u1", lodge_name: "Sample Lodge with an Unusually Long Name", lodge_number: "1234", consecration_date: "1950-01-01", secretary_email: "secretary@example.invalid" } }));
  await page.route("**/rest/v1/unit_settings?**", (r) => r.fulfill({ json: Object.entries(store).map(([key, value]) => ({ key, value })) }));
  await page.route("**/rest/v1/unit_settings_audit**", (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/get_unit_setup**", (r) => r.fulfill({ json: { contacts: { assistant_secretary_email: "asst@example.invalid", webmaster_email: "web@example.invalid", communications_email: "comms@example.invalid", site_url: "https://example.invalid", sender_name: "Sample Lodge", formal_sender_name: "Sample Lodge No. 1234" },
    venues: [{ id: "v1", name: "A Very Long Shared Venue Name For Layout Testing", address: "1 Road, Town", display_lines: ["A Very Long Shared Venue Name For Layout Testing,", "1 Road,", "Town AB1 2CD"] }], province_emails: { provincial_return: "prov@example.invalid" } } }));
  await page.route("**/rest/v1/rpc/save_unit_setup**", (r) => {
    const body = r.request().postDataJSON(); saved.push(body);
    if (fail) return r.fulfill({ status: 400, json: { message: "Server refused", code: "22023" } });
    let v = { ...(store[body._key] ?? {}), ...body._value };
    if (body._key === "bank_details") { const d = String(v.sort_code).replace(/\D/g, ""); v = { ...v, sort_code: `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}` }; }
    store[body._key] = v;
    return r.fulfill({ json: v });
  });
}
const overflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const open = async (page: Page) => { await page.goto("/members/admin/unit-setup"); await expect(page.getByRole("heading", { name: "Unit Setup" })).toBeVisible({ timeout: 20000 }); };

test("every field shows its stored value", async ({ page }) => {
  await mock(page, true, []);
  await open(page);
  const expected: [string, string][] = [
    ["Lodge name", "Sample Lodge with an Unusually Long Name"], ["Lodge number", "1234"], ["Consecration date", "1950-01-01"],
    ["Assistant Secretary email", "asst@example.invalid"], ["Webmaster email", "web@example.invalid"], ["Communications email", "comms@example.invalid"],
    ["Email sender name", "Sample Lodge"], ["Formal lodge title", "Sample Lodge No. 1234"], ["Website address", "https://example.invalid"],
    ["Facebook link", "https://facebook.example.invalid/sample"], ["Instagram link", "https://instagram.example.invalid/sample"], ["X (Twitter) link", "https://x.example.invalid/sample"],
    ["ICO registration number", "ZZ000001"], ["Province name", "Province of Example"], ["Masthead and footer name", "Sample Masthead"], ["Footer address line", "Sample Hall, AB1 2CD"],
    ["Calendar name", "Sample Calendar"], ["Provincial return file name", "L1234-Provincial-Return-{year}"], ["Installation return file name", "Installation-Return-1234-{year}"],
    ["Account name", "Sample Account"], ["Sort code", "11-22-33"], ["Account number", "12345678"], ["Payment reference pattern", "Dining + {surname}"],
    ["Card payment option wording", "Pay online by card"], ["Cheques payable to", "Sample Lodge No 1234"], ["Booking queries email", "bookings@example.invalid"],
    ["Optional sign-off override", "Yours, the Sample Lodge"], ["Meeting place", "v1"],
  ];
  for (const [label, value] of expected) await expect(page.getByLabel(label, { exact: true }), label).toHaveValue(value);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await expectNoAxeViolations(page, "unit setup loaded");
});

test("untouched save sends nothing; optional clear works; required clear refused", async ({ page }) => {
  const saved: any[] = [];
  await mock(page, true, saved);
  await open(page);
  const pay = page.getByRole("region", { name: /Card payment wording/ });
  await pay.getByRole("button", { name: "Save" }).click();
  await expect(pay.getByText("No changes to save.")).toBeVisible();
  const web = page.getByRole("region", { name: "Web and social" });
  await web.getByRole("button", { name: "Save" }).click();
  await expect(web.getByText("No changes to save.")).toBeVisible();
  expect(saved).toHaveLength(0);

  await page.getByLabel("Cheques payable to").fill("");
  await pay.getByRole("button", { name: "Save" }).click();
  await expect(pay.getByText("This field is required and cannot be cleared.")).toBeVisible();
  expect(saved).toHaveLength(0);
  await expectNoAxeViolations(page, "unit setup required clear");

  await page.getByLabel("Facebook link").fill("");
  await web.getByRole("button", { name: "Save" }).click();
  await expect(web.getByText(/^Saved at \d\d:\d\d\.$/)).toBeVisible();
  expect(saved).toEqual([{ _key: "web_social", _value: { facebook_url: "" } }]);
  await expect(page.getByLabel("Facebook link")).toHaveValue("");
  await expect(page.getByLabel("Instagram link")).toHaveValue("https://instagram.example.invalid/sample");
  // The cheque payee the user is still editing stays as typed after another section's refresh.
  await expect(page.getByLabel("Cheques payable to")).toHaveValue("");

  await page.getByLabel("Sort code").fill("445566");
  const bank = page.getByRole("region", { name: /Bank details/ });
  await bank.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel("Sort code")).toHaveValue("44-55-66");
  expect(saved[1]).toEqual({ _key: "bank_details", _value: { sort_code: "445566" } });
  expect((await bank.getByRole("button", { name: "Save" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});

test("failed save shows the error and keeps what was typed", async ({ page }) => {
  await mock(page, true, [], seed(), true);
  await open(page);
  await page.getByLabel("Calendar name").fill("New calendar");
  const cal = page.getByRole("region", { name: "Calendar feed" });
  await cal.getByRole("button", { name: "Save" }).click();
  await expect(cal.getByText(/Not saved: Server refused/)).toBeVisible();
  await expect(page.getByLabel("Calendar name")).toHaveValue("New calendar");
  await expectNoAxeViolations(page, "unit setup failed save");
});

test("validation still blocks bad bank details", async ({ page }) => {
  const saved: any[] = [];
  await mock(page, true, saved);
  await open(page);
  await page.getByLabel("Sort code").fill("12345");
  await page.getByLabel("Account number").fill("123");
  await page.getByRole("region", { name: /Bank details/ }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Sort code must be 6 digits.")).toBeVisible();
  await expect(page.getByText("Account number must be 8 digits.")).toBeVisible();
  expect(saved).toHaveLength(0);
});

test("load failure keeps Save off instead of showing blanks", async ({ page }) => {
  await mock(page, true, []);
  await page.route("**/rest/v1/unit_settings?**", (r) => r.fulfill({ status: 403, json: { message: "permission denied", code: "42501" } }));
  await open(page);
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  for (const b of await page.getByRole("button", { name: "Save" }).all()) await expect(b).toBeDisabled();
  await expectNoAxeViolations(page, "unit setup load failure");
});

test("Unit Setup read-only for viewers", async ({ page }) => {
  await mock(page, false, []);
  await open(page);
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByLabel("Sort code")).toHaveAttribute("readonly", "");
  await expectNoAxeViolations(page, "unit setup read-only");
});
