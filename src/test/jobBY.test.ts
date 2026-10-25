import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { callerUnitFrom, NO_CALLER_UNIT_MESSAGE, reserveAccountUnit } from "../../supabase/functions/_shared/pendingAccountUnit";
import { isNoMembershipAuthError, isUnknownMemberOtpError } from "@/lib/authAccess";

const read = (p: string) => readFileSync(p, "utf8");
const strict = read("drizzle/migrations/0150_handle_new_user_requires_unit.sql");
const drop = read("drizzle/migrations/0151_drop_profiles_unit_default.sql");
const invite = read("supabase/functions/admin-invite-member/index.ts");
const imp = read("supabase/functions/admin-import-members/index.ts");
const reviewer = read("supabase/functions/reviewer-signin/index.ts");
const login = read("src/pages/members/Login.tsx");

function fakeDb() {
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    from: () => ({ upsert: async (r: Record<string, unknown>) => { rows.push(r); return { error: null }; } }),
  };
}

describe("new accounts take the creator's lodge", () => {
  it("trigger uses the trusted unit (server table, then server app_metadata)", () => {
    expect(strict).toMatch(/FROM public\.pending_account_units WHERE email = lower\(btrim\(NEW\.email\)\)/);
    expect(strict).toMatch(/raw_app_meta_data->>'unit_id'/);
    expect(strict).toMatch(/unit_id\)\s*VALUES[\s\S]*_unit\)/);
    expect(strict).not.toMatch(/raw_user_meta_data->>'unit/);
    expect(strict).not.toMatch(/weybridge/i);
  });
  it("trigger with no unit rejects with a stable error", () => {
    expect(strict).toMatch(/IF _unit IS NULL THEN\s*RAISE EXCEPTION 'no_membership_for_account'/);
  });
  it("default dropped in its own migration, NOT NULL kept", () => {
    const stmts = drop.split("\n").filter((l) => l.trim() && !l.trim().startsWith("--"));
    expect(stmts).toEqual(["ALTER TABLE public.profiles ALTER COLUMN unit_id DROP DEFAULT;"]);
  });
  it("reserves the caller's unit, keyed by lower-case email", async () => {
    const db = fakeDb();
    expect(await reserveAccountUnit(db, " New@Example.org ", "unit-a", "caller")).toBeNull();
    expect(db.rows[0]).toMatchObject({ email: "new@example.org", unit_id: "unit-a", created_by: "caller" });
  });
  it("blank caller unit is refused, nothing written", async () => {
    const db = fakeDb();
    expect(callerUnitFrom({ unit_id: "  " })).toBe("");
    expect(callerUnitFrom(null)).toBe("");
    expect(await reserveAccountUnit(db, "a@b.org", " ", "c")).toBe(NO_CALLER_UNIT_MESSAGE);
    expect(db.rows).toHaveLength(0);
  });
  it("invite reserves the caller's own unit before creating the sign-in", () => {
    expect(invite.indexOf("reserveAccountUnit(admin, b.email, unitId")).toBeGreaterThan(-1);
    expect(invite.indexOf("reserveAccountUnit(")).toBeLessThan(invite.indexOf("inviteUserByEmail("));
    expect(invite).toMatch(/if \(!unitId\) return json\(\{ error: NO_CALLER_UNIT_MESSAGE \}, 400\)/);
  });
  it("import reserves before invite and still writes profile.unit_id", () => {
    expect(imp.indexOf("reserveAccountUnit(admin, record.email, unitId")).toBeLessThan(imp.indexOf("inviteUserByEmail("));
    expect(imp).toMatch(/profile\.unit_id = unitId/);
  });
  it("reviewer gets its unit from the site, never a typed lodge", () => {
    expect(reviewer).toMatch(/resolveUnit\(req, admin\)/);
    expect(reviewer).not.toMatch(/weybridge'|"weybridge"/i);
  });
  it("existing users never hit the rejection: the trigger fires on INSERT only", () => {
    expect(strict).not.toMatch(/UPDATE ON auth\.users/);
    expect(isNoMembershipAuthError("otp_expired Email link is invalid or has expired")).toBe(false);
  });
  it("Google stranger gets the friendly message on the Login page", () => {
    expect(isNoMembershipAuthError("server_error Database error saving new user")).toBe(true);
    expect(isNoMembershipAuthError("Signups not allowed for this instance")).toBe(true);
    expect(isNoMembershipAuthError("Google sign-in failed")).toBe(false);
    expect(login).toMatch(/NO_MEMBERSHIP_MESSAGE/);
    expect(login).toMatch(/setView\("register"\)[\s\S]*Request portal access/);
    expect(isUnknownMemberOtpError("Signups not allowed for otp")).toBe(true);
  });
});
