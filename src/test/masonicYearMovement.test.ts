// KPI dashboard / Members — Masonic year rule and Movement period tests.
import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import {
  installationDateFor,
  getMasonicYear,
  getMasonicYearRange,
  type InstallationConfig,
} from "@/lib/masonicYear";
import { movement, movementPeriod, type KpiMember, type StatusHistoryRow } from "@/lib/kpis";

const rule = {
  mode: "weekday_rule" as const,
  installation_month: 10,
  installation_ordinal: "3" as const,
  installation_weekday: 3,
  fixed_day: null,
  applies_from_year: null,
};
const cfg: InstallationConfig = { rule, stored: {} };

const member = (o: Partial<KpiMember>): KpiMember =>
  ({ id: "m1", status: "active", initiation_date: null, joined_lodge_date: null, status_changed_at: null, updated_at: "2026-10-17", ...o }) as KpiMember;
const row = (o: Partial<StatusHistoryRow>): StatusHistoryRow =>
  ({ profile_id: "m1", kind: "status", status: "active", effective_date: "2020-01-01", created_at: "2026-01-01", ...o }) as StatusHistoryRow;

describe("installation rule", () => {
  it("3rd Wednesday of October", () => {
    expect(installationDateFor(2025, cfg)).toBe("2025-10-15");
    expect(installationDateFor(2026, cfg)).toBe("2026-10-21");
    expect(installationDateFor(2027, cfg)).toBe("2027-10-20");
  });
  it("stored override beats the rule", () => {
    const c = { rule, stored: { 2026: "2026-10-28" } };
    expect(installationDateFor(2026, c)).toBe("2026-10-28");
    expect(getMasonicYear("2026-10-21", c)?.startYear).toBe(2025);
  });
  it("dates before applies_from_year have no rule date", () => {
    const c = { rule: { ...rule, applies_from_year: 2026 }, stored: {} };
    expect(installationDateFor(2025, c)).toBeNull();
    expect(getMasonicYear("2026-01-10", c)).toBeNull();
  });
  it("installation day belongs to the new year", () => {
    expect(getMasonicYear("2025-10-15", cfg)?.startYear).toBe(2025);
    expect(getMasonicYear("2025-10-14", cfg)?.startYear).toBe(2024);
    expect(getMasonicYearRange(2025, cfg)).toMatchObject({ start: "2025-10-15", end: "2026-10-20" });
  });
  it("supports 'last' ordinal and fixed-date mode", () => {
    expect(installationDateFor(2026, { rule: { ...rule, installation_ordinal: "last" }, stored: {} })).toBe("2026-10-28");
    expect(installationDateFor(2026, { rule: { ...rule, mode: "fixed_date", fixed_day: 31, installation_month: 2 }, stored: {} })).toBe("2026-02-28");
  });
  it("period with no next installation yet is open-ended to today", () => {
    const c = { rule: null, stored: { 2025: "2025-10-15" } };
    const p = movementPeriod("current", c, "2026-10-17")!;
    expect(p.start).toBe("2025-10-15");
    expect(p.end).toBe("2026-10-17");
    expect(p.rangeLabel).toContain("not yet set");
  });
});

describe("movement", () => {
  const year = { start: "2025-10-15", end: "2026-10-20" };
  it("Stamper case: joined on installation day, resigned later — Joined 1, Resigned 1", () => {
    const m = member({ status: "resigned", initiation_date: "1985-10-18", joined_lodge_date: "2025-10-15", status_changed_at: "2026-09-13" });
    const mv = movement([m], year);
    expect(mv.joined.length).toBe(1);
    expect(mv.resigned.length).toBe(1);
    expect(mv.net).toBe(0);
  });
  it("join then resign inside the period (history)", () => {
    const m = member({ status: "resigned" });
    const h = [row({ kind: "joined", effective_date: "2025-11-01" }), row({ status: "active", effective_date: "2025-11-01" }), row({ status: "resigned", effective_date: "2026-03-01" })];
    const mv = movement([m], { ...year, history: h });
    expect([mv.joined.length, mv.resigned.length]).toEqual([1, 1]);
  });
  it("joined 2 days before period start then resigned inside it", () => {
    const m = member({ status: "resigned", joined_lodge_date: "2025-10-13", initiation_date: "1990-01-01", status_changed_at: "2026-05-01" });
    const mv = movement([m], year);
    expect([mv.joined.length, mv.resigned.length, mv.net]).toEqual([0, 1, -1]);
  });
  it("rejoin after resignation counts both events", () => {
    const m = member({ status: "active" });
    const h = [row({ kind: "joined", effective_date: "2010-01-01" }), row({ status: "resigned", effective_date: "2025-12-01" }), row({ status: "active", effective_date: "2026-06-01" })];
    const mv = movement([m], { ...year, history: h });
    expect([mv.joined.length, mv.resigned.length, mv.net]).toEqual([1, 1, 0]);
  });
  it("uses status_changed_at, not updated_at", () => {
    const m = member({ status: "resigned", status_changed_at: "2024-01-01", updated_at: "2026-01-01" });
    expect(movement([m], year).resigned.length).toBe(0);
  });
  it("Joined excludes joined date equal to initiation date", () => {
    const m = member({ initiation_date: "2026-02-18", joined_lodge_date: "2026-02-18" });
    const mv = movement([m], year);
    expect([mv.initiated.length, mv.joined.length]).toEqual([1, 0]);
  });
});
