import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  callerUnitFrom, loadCallerUnit, noCallerUnitMessage, recordUnitMatches,
} from "../../supabase/functions/_shared/callerUnit.ts";
import { NO_CALLER_UNIT_MESSAGE } from "../../supabase/functions/_shared/pendingAccountUnit.ts";

const fn = (p: string) => readFileSync(join(process.cwd(), "supabase/functions", p), "utf8");

// Signed-in functions that now take the caller's own profile unit.
const CALLER_FUNCS: Record<string, string> = {
  "submit-installation-return/index.ts": "submit the return",
  "submit-provincial-return/index.ts": "submit the return",
  "send-summons-email/index.ts": "send a summons",
  "send-summons-to-visitors/index.ts": "send invitations",
  "send-event-invite/index.ts": "send an event invitation",
  "dues-create-checkout/index.ts": "start a dues payment",
  "dues-apply-price-change/index.ts": "apply a dues change",
  "dues-notify-price-change/index.ts": "send a dues notice",
  "notify-unlock-requested/index.ts": "request an unlock",
  "broadcast-newsletter/index.ts": "send the newsletter",
};
const CHANGED = [
  ...Object.keys(CALLER_FUNCS),
  "_shared/returnFiling.ts",
  "_shared/stripe-events.ts",
  "_shared/transactional-email-templates/send-email.ts",
];

describe("JOB CC: caller unit helper", () => {
  it("takes the trimmed profile unit, blank otherwise", () => {
    expect(callerUnitFrom({ unit_id: " weybridge " })).toBe("weybridge");
    expect(callerUnitFrom({ unit_id: "" })).toBe("");
    expect(callerUnitFrom({ unit_id: null })).toBe("");
    expect(callerUnitFrom(null)).toBe("");
  });
  it("loads the unit for the verified user id, blank when missing", async () => {
    const db = (row: unknown) => ({
      from: () => ({ select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: id === "u1" ? row : null }) }) }) }),
    });
    expect(await loadCallerUnit(db({ unit_id: "lodge-a" }), "u1")).toBe("lodge-a");
    expect(await loadCallerUnit(db({ unit_id: "  " }), "u1")).toBe("");
    expect(await loadCallerUnit(db({ unit_id: "lodge-a" }), "u2")).toBe("");
    expect(await loadCallerUnit({ from: () => { throw new Error("x"); } }, "u1")).toBe("");
  });
  it("cross-unit check refuses a different lodge, allows same or blank record unit", () => {
    expect(recordUnitMatches("lodge-a", "lodge-a")).toBe(true);
    expect(recordUnitMatches("lodge-b", "lodge-a")).toBe(false);
    expect(recordUnitMatches(null, "lodge-a")).toBe(true);
  });
  it("keeps the existing invite refusal wording byte-identical", () => {
    expect(NO_CALLER_UNIT_MESSAGE).toBe(
      "Your member record has no lodge set, so you cannot add members. Ask an administrator to set your lodge first.",
    );
  });
});

describe("JOB CC: every changed function passes the caller's unit and refuses a blank one", () => {
  for (const [file, action] of Object.entries(CALLER_FUNCS)) {
    it(file, () => {
      const src = fn(file);
      expect(src).toMatch(/loadCallerUnit\(admin, (user\.id|userId)\)/);
      const refuse = src.indexOf(`noCallerUnitMessage("${action}")`);
      expect(refuse).toBeGreaterThan(-1);
      expect(src).toMatch(/if \(!callerUnit\)/);
      expect(src).toMatch(/loadLodgeSettings\(callerUnit\)/);
      // The refusal happens before any lodge settings are loaded.
      expect(src.indexOf("loadLodgeSettings(callerUnit)")).toBeGreaterThan(src.indexOf("if (!callerUnit)"));
    });
  }
  it("officer holder lookups in scope pass the unit", () => {
    for (const f of ["send-summons-email/index.ts", "notify-unlock-requested/index.ts", "_shared/returnFiling.ts"]) {
      const calls = fn(f).match(/current_officer_holder"[^)]*\)/g) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const c of calls) expect(c).toMatch(/_unit:/);
    }
  });
  it("returns pass the caller's unit to the Cc lookup", () => {
    for (const f of ["submit-installation-return/index.ts", "submit-provincial-return/index.ts"]) {
      expect(fn(f)).toContain("resolveReturnCc(admin, configured, callerUnit)");
    }
  });
  it("dues checkout refuses a member of another lodge", () => {
    expect(fn("dues-create-checkout/index.ts")).toMatch(/recordUnitMatches\(\(profile as any\)\.unit_id, callerUnit\)\) return json\(\{ error: CROSS_UNIT_MESSAGE \}, 403\)/);
  });
  it("service-role summons sends must name a unit", () => {
    expect(fn("send-summons-email/index.ts")).toContain('if (isServiceRole) callerUnit = typeof body.unit_id === "string" ? body.unit_id.trim() : "";');
  });
});

describe("JOB CC: no changed function loads settings with no argument", () => {
  for (const f of CHANGED) {
    it(f, () => expect(fn(f)).not.toMatch(/loadLodgeSettings\(\s*\)/));
  }
  it("newsletter and visitor invitations keep no module-level lodge", () => {
    expect(fn("broadcast-newsletter/index.ts")).not.toMatch(/^let LODGE/m);
    expect(fn("send-summons-to-visitors/index.ts")).not.toMatch(/^let LODGE/m);
    expect(fn("broadcast-newsletter/index.ts")).toContain("lodgeBox.run(");
  });
});
