import type { Page } from "@playwright/test";
// The test server runs on 127.0.0.1, which is not a lodge web address, so public
// pages would (correctly) find no lodge. Specs that need one answer the site lookup.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
export const mockSiteUnit = (page: Page, unitId: string) =>
  page.route("**/functions/v1/resolve-site-unit**", (r) =>
    r.request().method() === "OPTIONS"
      ? r.fulfill({ status: 200, headers: cors, body: "ok" })
      : r.fulfill({ status: 200, headers: cors, json: { unit_id: unitId } }));
