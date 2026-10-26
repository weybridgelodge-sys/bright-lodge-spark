// JOB CV stage 1: every no-session caller of officer_lookup_unit passes its lodge explicitly.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { resolveReturnHolders } from "../../supabase/functions/_shared/returnSigners";

const HOLDERS: Record<string, string> = {
  "A:worshipful_master": "wmA", "A:secretary": "secA",
  "B:worshipful_master": "wmB", "B:secretary": "secB",
};
function twoLodgeDb() {
  const calls: any[] = [];
  return {
    calls,
    rpc: async (_fn: string, a: any) => {
      calls.push(a);
      // No _unit = the old guess; a two-lodge database gives nothing.
      return { data: a._unit ? HOLDERS[`${a._unit}:${a._position_key}`] ?? null : null };
    },
  };
}
const read = (p: string) => fs.readFileSync(p, "utf8");

describe("returnSigners passes the caller's lodge", () => {
  it("lodge A and lodge B each get their own signers", async () => {
    const db = twoLodgeDb();
    expect(await resolveReturnHolders(db as any, "2026-10-01", "A")).toEqual({ worshipful_master: "wmA", secretary: "secA" });
    expect(await resolveReturnHolders(db as any, "2026-10-01", "B")).toEqual({ worshipful_master: "wmB", secretary: "secB" });
    expect(db.calls.every((c) => c._unit)).toBe(true);
  });
  it("blank lodge = no signers and no lookup", async () => {
    const db = twoLodgeDb();
    expect(await resolveReturnHolders(db as any, "2026-10-01", "")).toEqual({ worshipful_master: null, secretary: null });
    expect(await resolveReturnHolders(db as any, "2026-10-01", null)).toEqual({ worshipful_master: null, secretary: null });
    expect(db.calls).toHaveLength(0);
  });
  it("both return functions pass ctx.unitId", () => {
    expect(read("supabase/functions/generate-provincial-return/index.ts")).toMatch(/resolveReturnHolders\(admin, installDate, ctx\.unitId\)/);
    expect(read("supabase/functions/sign-installation-return/index.ts")).toMatch(/resolveReturnHolders\(admin, signed\.iso, ctx\.unitId\)/);
  });
});

describe("edge callers never call current_officer_holder without _unit", () => {
  const files = [
    "supabase/functions/submit-enquiry/index.ts",
    "supabase/functions/newsletter-confirm/index.ts",
    "supabase/functions/_shared/send-booking-emails.ts",
    "supabase/functions/_shared/returnSigners.ts",
  ];
  for (const f of files) {
    it(f, () => {
      const calls = read(f).match(/rpc\(\s*['"]current_officer_holder['"][^)]*\)/g) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const c of calls) expect(c).toMatch(/_unit: unit(Id)?\b/);
    });
  }
  it("submit-enquiry passes the web-address lodge", () => {
    const s = read("supabase/functions/submit-enquiry/index.ts");
    expect(s).toMatch(/lookupOfficer\(supabase, UNIT_ID, 'secretary'/);
    expect(s).toMatch(/lookupOfficer\(supabase, UNIT_ID, 'membership_officer'/);
  });
  it("newsletter-confirm uses the subscriber's lodge; blank skips", () => {
    const s = read("supabase/functions/newsletter-confirm/index.ts");
    expect(s).toMatch(/wmName\(\(unitId \?\? ""\)\.trim\(\)\)/);
    expect(s).toMatch(/if \(!unitId\) return null;/);
  });
  it("send-booking-emails skips the lookup for a blank booking lodge", () => {
    expect(read("supabase/functions/_shared/send-booking-emails.ts")).toMatch(/if \(!unitId\) return \{ secretaryName, secretaryOffice \}/);
  });
});
