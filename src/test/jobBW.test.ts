import { describe, it, expect, vi } from "vitest";
import { ownUnit, unitFor } from "../../supabase/functions/_shared/requestUnit";
import { resolveUnitWith, UNKNOWN_SITE_MESSAGE } from "../../supabase/functions/_shared/resolveUnit";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

describe("request unit (meeting/event own unit, else web address)", () => {
  it("uses the record's own unit and never asks the web address", async () => {
    const resolve = vi.fn();
    expect(await unitFor(" weybridge ", resolve)).toEqual({ ok: true, unitId: "weybridge", host: "" });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("falls back to the web address when the record has no unit", async () => {
    const h = new Headers({ origin: "https://www.weybridgelodge.org.uk" });
    const r = await unitFor(null, () => resolveUnitWith(h, async (host) => (host === "www.weybridgelodge.org.uk" ? "weybridge" : null)));
    expect(r).toMatchObject({ ok: true, unitId: "weybridge" });
  });

  it("refuses with the resolveUnit message when neither is known (no default unit)", async () => {
    const r = await unitFor("", () => resolveUnitWith(new Headers(), async () => "weybridge"));
    expect(r).toEqual({ ok: false, error: UNKNOWN_SITE_MESSAGE });
  });

  it("treats blank/non-text unit values as missing", () => {
    expect(ownUnit("  ")).toBe("");
    expect(ownUnit(42)).toBe("");
  });
});

describe("request-scoped functions pass a unit to lodge settings", () => {
  const files = [
    "supabase/functions/create-checkout/index.ts",
    "supabase/functions/save-meeting-response/index.ts",
    "supabase/functions/create-event-checkout/index.ts",
    "supabase/functions/_shared/send-booking-emails.ts",
    "supabase/functions/newsletter-unsubscribe/index.ts",
  ];
  it.each(files)("%s has no unit-less loadLodgeSettings()", (f) => {
    expect(read(f)).not.toMatch(/loadLodgeSettings\(\)/);
  });
  it("meeting bookings store the resolved unit on the booking", () => {
    for (const f of files.slice(0, 2)) expect(read(f)).toMatch(/unit_id: unit\.unitId/);
  });
});
