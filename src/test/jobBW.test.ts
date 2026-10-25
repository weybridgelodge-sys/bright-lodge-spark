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

import { matchBookingToMember } from "@/lib/bookingMemberMatch";

describe("meeting booking → member match is scoped to the meeting's unit", () => {
  const profiles = [
    { id: "w1", email: "john.smith@example.com", first_name: "John", last_name: "Smith", status: "active", unit_id: "weybridge" },
    { id: "o1", email: "alan.jones@other.org", first_name: "Alan", last_name: "Jones", status: "active", unit_id: "other" },
    { id: "n1", email: "nobody@unit.org", first_name: "Nora", last_name: "Blank", status: "active", unit_id: null },
  ];
  it("links a home-unit member by email (case/space as before)", () => {
    expect(matchBookingToMember({ email: " John.Smith@Example.com " }, profiles, "weybridge")).toEqual({ kind: "member", memberId: "w1" });
  });
  it("treats a member of another unit as a visitor (email and name)", () => {
    expect(matchBookingToMember({ email: "alan.jones@other.org", firstName: "Alan", lastName: "Jones" }, profiles, "weybridge")).toEqual({ kind: "visitor" });
  });
  it("a member row with no unit never matches a unit-owned meeting", () => {
    expect(matchBookingToMember({ email: "nobody@unit.org" }, profiles, "weybridge")).toEqual({ kind: "visitor" });
  });
  it("a meeting with no unit keeps today's all-units match", () => {
    expect(matchBookingToMember({ email: "alan.jones@other.org" }, profiles, null)).toEqual({ kind: "member", memberId: "o1" });
    expect(matchBookingToMember({ email: "alan.jones@other.org" }, profiles, "")).toEqual({ kind: "member", memberId: "o1" });
  });
});

describe("migration 0146/0147 shape", () => {
  const m146 = read("drizzle/migrations/0146_unit_aware_member_matching.sql");
  const m147 = read("drizzle/migrations/0147_officer_holder_unscoped_positions.sql");
  it("drops the old signatures instead of overloading them", () => {
    expect(m146).toMatch(/DROP FUNCTION public\.booking_name_member_suspect\(text, text\);/);
    expect(m146).toMatch(/DROP FUNCTION public\.current_officer_holder\(text, date\);/);
  });
  it("keeps grants: suspect service_role only, officer holder public", () => {
    expect(m146).toMatch(/REVOKE ALL ON FUNCTION public\.booking_name_member_suspect\(text, text, text\) FROM PUBLIC, anon, authenticated;/);
    expect(m146).toMatch(/GRANT EXECUTE ON FUNCTION public\.current_officer_holder\(text, date, text\) TO PUBLIC, anon, authenticated, service_role;/);
  });
  it("trigger passes the meeting unit everywhere it matches members", () => {
    expect(m146).toMatch(/unit_id = v_meeting\.unit_id\) LIMIT 1;/);
    expect(m146.match(/booking_name_member_suspect\([^)]*v_meeting\.unit_id\)/g)).toHaveLength(2);
  });
  it("drops the host-lodge default on bookings.unit_id and writes no rows", () => {
    expect(m146).toMatch(/ALTER TABLE public\.bookings ALTER COLUMN unit_id DROP DEFAULT;/);
    expect(m146 + m147).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO public\.festive_board_attendance\s+SELECT)\b/);
    expect(m146 + m147).not.toMatch(/'weybridge'/);
  });
  it("positions with no unit stay visible when a unit is passed", () => {
    expect(m147).toMatch(/coalesce\(op\.unit_id, ''\) = ''/);
  });
  it("only create-checkout and save-meeting-response insert bookings, both with a unit", () => {
    for (const f of ["supabase/functions/create-checkout/index.ts", "supabase/functions/save-meeting-response/index.ts"]) {
      expect(read(f)).toMatch(/unit_id: unit\.unitId/);
    }
  });
});
