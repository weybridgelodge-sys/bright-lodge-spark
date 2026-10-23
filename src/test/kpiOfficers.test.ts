import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { officersHealth, lodgeHealth, ordinal } from "@/lib/kpis";

const member = (id: string) => ({ id, first_name: "A", middle_name: null, last_name: id, full_name: null, status: "active" } as any);
const bundle = (appointments: any[]) => ({
  officerYear: 2026,
  members: ["sec", "tre", "alm", "dc"].map(member),
  wmTerms: [], risks: [], candidates: [], statusHistory: [], installation: null,
  positions: [],
  appointments,
} as any);
const prior = [
  { position_key: "secretary", member_id: "sec", lodge_year: 2025, is_projection: false },
  { position_key: "treasurer", member_id: "tre", lodge_year: 2025, is_projection: false },
  { position_key: "almoner", member_id: "alm", lodge_year: 2025, is_projection: false },
  { position_key: "director_of_ceremonies", member_id: "dc", lodge_year: 2025, is_projection: false },
];

describe("KPI officers use the carry-forward rule", () => {
  it("a holder appointed in a prior year counts as filled", () => {
    const oh = officersHealth(bundle(prior));
    expect(oh.criticals.map((c) => c.holder?.id)).toEqual(["sec", "tre", "alm", "dc"]);
    expect(lodgeHealth(bundle(prior)).components.succession.band).toBe("green");
  });
  it("a vacant critical role makes succession amber and names it", () => {
    const s = lodgeHealth(bundle(prior.filter((a) => a.position_key !== "treasurer"))).components.succession;
    expect(s.band).toBe("amber");
    expect(s.detail).toBe("All progressive offices filled, but Treasurer has no holder");
  });
});

describe("ordinal", () => {
  it.each([[1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"], [21, "21st"], [22, "22nd"], [23, "23rd"], [83, "83rd"], [111, "111th"]])("%i → %s", (n, s) => {
    expect(ordinal(n as number)).toBe(s);
  });
});
