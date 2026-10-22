import { describe, expect, it } from "vitest";
import { includePosition, positionsFor, type PositionRow } from "@/lib/officerPositions";
import { repSlugKey } from "@/components/members/officers/RepresentativesBoard";

const rows: PositionRow[] = [
  { key: "secretary", label: "Secretary", order_index: 130, category: "office" },
  { key: "rep_sports", label: "Sports Rep", order_index: 320, category: "representative", include_in: { summons: true, provincial_return: true } },
  { key: "rep_old", label: "Old Rep", order_index: 330, category: "representative", active: false, include_in: { summons: true } },
  { key: "rep_other_unit", label: "Other", order_index: 340, category: "representative", unit_id: "unit-b", include_in: { summons: true } },
];

describe("positionsFor", () => {
  it("includes representatives on the Summons and Provincial return", () => {
    expect(positionsFor(rows, "summons", "unit-a").map((p) => p.key)).toEqual(["secretary", "rep_sports"]);
    expect(positionsFor(rows, "provincial_return", "unit-a").map((p) => p.key)).toEqual(["secretary", "rep_sports"]);
  });
  it("excludes representatives from UGLE return, progression, ranking, letters, KPIs, Directory, development", () => {
    for (const c of ["ugle_return", "progression", "roll_ranking", "letters", "kpis", "directory", "development"] as const)
      expect(positionsFor(rows, c, "unit-a").map((p) => p.key)).toEqual(["secretary"]);
  });
  it("shows a unit's own positions only to that unit", () => {
    expect(positionsFor(rows, "summons", "unit-b").map((p) => p.key)).toContain("rep_other_unit");
  });
  it("never lists inactive positions", () => {
    expect(includePosition(rows[2], "summons")).toBe(false);
  });
});

describe("repSlugKey", () => {
  it("makes a safe key from any label", () => {
    expect(repSlugKey("Lodge rep to the Province!", "x1")).toBe("rep_lodge_rep_to_the_province_x1");
  });
});
