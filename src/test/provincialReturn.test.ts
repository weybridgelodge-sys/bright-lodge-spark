import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { groupPastMasters, missingRollEntries, rollName, PROVINCIAL_ROWS, formatAddress } from "@/lib/provincialReturn";

const person = (id: string, f: string, m: string | null, l: string) => ({ id, first_name: f, middle_name: m, last_name: l, full_name: `${f} ${l}`, post_nominals: null, email: null, status: "active", initiation_date: null });

describe("provincial return", () => {
  it("formats roll names as initials + surname", () => {
    expect(rollName(person("a", "Julien", "Philip", "Tidmarsh"))).toBe("J P Tidmarsh");
  });
  it("groups a Past Master's years on one line, ordered by first year", () => {
    const g = groupPastMasters([
      { display_name: "J T Coleman", lodge_year: 2009, member_id: "c" },
      { display_name: "J T Coleman", lodge_year: 1997, member_id: "c" },
      { display_name: "K P Brennan", lodge_year: 2003, member_id: null },
    ]);
    expect(g).toEqual([{ name: "J T Coleman", years: [1997, 2009] }, { name: "K P Brennan", years: [2003] }]);
  });
  it("appends only confirmed, earlier, missing WM years", () => {
    const people = { j: person("j", "Julien", "Philip", "Tidmarsh"), m: person("m", "Murray", null, "Grubb") };
    const appts = [
      { position_key: "worshipful_master", member_id: "j", lodge_year: 2025, is_projection: false },
      { position_key: "worshipful_master", member_id: "j", lodge_year: 2026, is_projection: false },
      { position_key: "worshipful_master", member_id: "m", lodge_year: 2024, is_projection: false },
      { position_key: "worshipful_master", member_id: "m", lodge_year: 2023, is_projection: true },
    ];
    const out = missingRollEntries(2026, appts, [{ member_id: "m", lodge_year: 2024 }], people);
    expect(out).toEqual([{ member_id: "j", lodge_year: 2025, display_name: "J P Tidmarsh" }]);
  });
  it("fills MO and LMO from the same office and never fills Organist", () => {
    expect(PROVINCIAL_ROWS.filter((r) => r.key === "membership_officer").map((r) => r.label)).toEqual(["MO", "LMO"]);
    expect(PROVINCIAL_ROWS.find((r) => r.label === "Organist")?.key).toBeNull();
  });
  it("joins address parts, skipping blanks", () => {
    expect(formatAddress({ address_line1: "1 High St", address_line2: " ", town: "Guildford", postcode: "GU1 1AA" })).toBe("1 High St, Guildford, GU1 1AA");
  });
});
