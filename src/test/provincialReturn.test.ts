import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { groupPastMasters, rollEntriesFromIpm, rollName, PROVINCIAL_ROWS, LOWER_ROWS, formatAddress } from "@/lib/provincialReturn";

const person = (id: string, f: string, m: string | null, l: string) => ({ id, first_name: f, middle_name: m, last_name: l, full_name: `${f} ${l}`, post_nominals: null, email: null, status: "active", initiation_date: null });
const wm = (id: string, y: number, proj = false) => ({ position_key: "worshipful_master", member_id: id, lodge_year: y, is_projection: proj });
const ipm = (id: string, y: number) => ({ position_key: "immediate_past_master", member_id: id, lodge_year: y, is_projection: false });

describe("provincial return", () => {
  it("formats roll names as initials + surname", () => {
    expect(rollName(person("a", "Julien", "Philip", "Tidmarsh"))).toBe("J P Tidmarsh");
  });
  it("groups a Past Master's years on one line", () => {
    const g = groupPastMasters([
      { display_name: "J T Coleman", lodge_year: 2009, member_id: "c" },
      { display_name: "J T Coleman", lodge_year: 1997, member_id: "c" },
      { display_name: "K P Brennan", lodge_year: 2003, member_id: null },
    ]);
    expect(g).toEqual([{ name: "J T Coleman", years: [1997, 2009] }, { name: "K P Brennan", years: [2003] }]);
  });
  it("does not add a Master staying in the chair (no IPM yet)", () => {
    const people = { j: person("j", "Julien", "Philip", "Tidmarsh") };
    expect(rollEntriesFromIpm(2026, [wm("j", 2025), wm("j", 2026)], [], people)).toEqual([]);
  });
  it("adds the full career once confirmed as IPM", () => {
    const people = { j: person("j", "Julien", "Philip", "Tidmarsh") };
    const out = rollEntriesFromIpm(2027, [wm("j", 2025), wm("j", 2026), ipm("j", 2027)], [], people);
    expect(out.map((o) => o.lodge_year)).toEqual([2025, 2026]);
  });
  it("merges a second, non-consecutive term into the existing roll name", () => {
    const people = { r: person("r", "Richard", "David", "Smith") };
    const roll = [{ display_name: "R D Smith", lodge_year: 2016, member_id: "r" }];
    const out = rollEntriesFromIpm(2023, [wm("r", 2016), wm("r", 2022), ipm("r", 2017), ipm("r", 2023)], roll, people);
    expect(out).toEqual([{ member_id: "r", lodge_year: 2022, display_name: "R D Smith" }]);
  });
  it("ignores projected IPM and WM rows", () => {
    const people = { m: person("m", "Murray", null, "Grubb") };
    const appts = [wm("m", 2024, true), { ...ipm("m", 2025), is_projection: true }];
    expect(rollEntriesFromIpm(2025, appts, [], people)).toEqual([]);
  });
  it("fills MO and LMO from the same office, never fills Organist rows", () => {
    const all = [...PROVINCIAL_ROWS, ...LOWER_ROWS];
    expect(all.filter((r) => r.key === "membership_officer").map((r) => r.label)).toEqual(["MO", "LMO"]);
    expect(all.filter((r) => r.label.startsWith("ORG")).every((r) => r.key === null)).toBe(true);
  });
  it("joins address parts, skipping blanks", () => {
    expect(formatAddress({ address_line1: "1 High St", address_line2: " ", town: "Guildford", postcode: "GU1 1AA" })).toBe("1 High St, Guildford, GU1 1AA");
  });
});

import { buildRepRow } from "@/lib/provincialReturn";
describe("representative rows", () => {
  const byId: any = { m1: { id: "m1", first_name: "Anthony", middle_name: "John", last_name: "Mallard", post_nominals: "MBE" } };
  it("splits a linked member like an officer", () => {
    const r = buildRepRow("SPORTS REP", { name: "W Bro A.J. Mallard (Tony) MBE, PPAGDC", member_id: "m1" }, byId);
    expect([r.firstNames, r.surname, r.decorations]).toEqual(["Anthony John", "MALLARD", "MBE"]);
  });
  it("falls back to the free text whole when unlinked", () => {
    const r = buildRepRow("HALLS REP", { name: "Bro  D Blackburn" }, byId);
    expect([r.firstNames, r.surname]).toEqual(["Bro D Blackburn", ""]);
    expect(buildRepRow("PET'NS REP", { name: "" }, byId).vacantRep).toBe(true);
  });
});
