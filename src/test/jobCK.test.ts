import { describe, it, expect } from "vitest";
import { fakeDb } from "./helpers/fakeDb";
import { resolveRecipientUnit } from "../../supabase/functions/_shared/authRecipientUnit";
import { authRenderContext, createUnitBrandLookups, TEXT_ONLY_BRAND } from "../../supabase/functions/_shared/authEmailBrand";

const S: Record<string, any> = {
  u1: { lodgeName: "Alpha Lodge", lodgeNumber: "1111", provinceName: "A", crestImageUrl: "https://alpha.example/c.png", configuredSiteUrl: "https://alpha.example" },
  u2: { lodgeName: "Beta Lodge", lodgeNumber: "2222", provinceName: "B", crestImageUrl: "https://beta.example/c.png", configuredSiteUrl: "https://beta.example" },
};
const unknown = { email: "nobody@x.test", userId: "", appUnit: "" };
const ctxFor = async (db: any, r = unknown) => {
  const { unitId } = await resolveRecipientUnit(db, r);
  return authRenderContext(await createUnitBrandLookups({ load: async (u) => S[u], warn: () => {} }).get(unitId), "https://root.example");
};

describe("JOB CK auth-email-hook single-unit fallback", () => {
  it("one unit + unknown recipient = that unit's brand (source single_unit)", async () => {
    const db = fakeDb({ units: [{ id: "u1" }], profiles: [], pending_account_units: [] });
    expect(await resolveRecipientUnit(db, unknown)).toEqual({ unitId: "u1", source: "single_unit" });
    expect((await ctxFor(db)).brand.lodgeName).toBe("Alpha Lodge");
  });
  it("two units + unknown recipient = neutral", async () => {
    const db = fakeDb({ units: [{ id: "u1" }, { id: "u2" }], profiles: [], pending_account_units: [] });
    expect(await resolveRecipientUnit(db, unknown)).toEqual({ unitId: "", source: "none" });
    expect((await ctxFor(db)).brand).toEqual(TEXT_ONLY_BRAND);
  });
  it("zero units = neutral", async () => {
    const db = fakeDb({ units: [], profiles: [], pending_account_units: [] });
    expect(await resolveRecipientUnit(db, unknown)).toEqual({ unitId: "", source: "none" });
    expect((await ctxFor(db)).brand).toEqual(TEXT_ONLY_BRAND);
  });
  it("known recipient still wins over the single unit", async () => {
    const db = fakeDb({ units: [{ id: "u1" }], profiles: [{ id: "p2", email: "b@x.test", unit_id: "u2" }], pending_account_units: [] });
    expect(await resolveRecipientUnit(db, { email: "b@x.test", userId: "p2", appUnit: "" })).toEqual({ unitId: "u2", source: "profile" });
    expect(await resolveRecipientUnit(db, { email: "", userId: "", appUnit: "u2" })).toEqual({ unitId: "u2", source: "app_metadata" });
  });
  it("units lookup failing = neutral, never throws", async () => {
    const bad = { from: () => { throw new Error("down"); } };
    expect(await resolveRecipientUnit(bad, unknown)).toEqual({ unitId: "", source: "none" });
  });
  it("hook never logs an address", async () => {
    const src = (await import("node:fs")).readFileSync("supabase/functions/auth-email-hook/index.ts", "utf8");
    const logs = src.match(/console\.log\([^\n]*/g) ?? [];
    expect(logs.some((l) => l.includes("source="))).toBe(true);
    expect(logs.every((l) => !/email/i.test(l.replace("auth-email-hook", "")))).toBe(true);
  });
});
