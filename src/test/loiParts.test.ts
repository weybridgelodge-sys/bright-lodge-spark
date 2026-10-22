import { describe, expect, it } from "vitest";
import { buildPartOptions, partLabelFrom, partToSave, normalisePart, isOfficePart } from "@/lib/loiParts";
import type { PositionRow } from "@/lib/officerPositions";

const rows: PositionRow[] = [
  { key: "tyler", label: "Tyler", order_index: 190, category: "office" },
  { key: "inner_guard", label: "Inner Guard", order_index: 30, category: "office" },
  { key: "immediate_past_master", label: "Immediate Past Master", order_index: 100, category: "office" },
  { key: "secretary", label: "Secretary", order_index: 130, category: "office" },
  { key: "old_office", label: "Old", order_index: 5, category: "office", active: false },
  { key: "rep_sports", label: "Sports Rep", order_index: 320, category: "representative", include_in: { development: true } },
];

describe("rehearsal part options", () => {
  const opts = buildPartOptions(rows);
  it("lists Candidate, every active office in order, then Observing and Other; no reps", () => {
    expect(opts.map((o) => o.value)).toEqual(["candidate", "inner_guard", "immediate_past_master", "secretary", "tyler", "observing", "other"]);
  });
  it("legacy values still display", () => {
    expect(partLabelFrom(opts, "ipm")).toBe("Immediate Past Master");
    expect(partLabelFrom([], "ipm")).toBe("Immediate Past Master");
    expect(partLabelFrom([], "director_of_ceremonies")).toBe("Director of Ceremonies");
    expect(partLabelFrom([], "observing")).toBe("Observing / No Part");
    expect(partLabelFrom(opts, "other", " Lecture ")).toBe("Lecture");
    expect(partLabelFrom([], "some_unknown")).toBe("Some Unknown");
  });
  it("legacy ipm selects the IPM office and is kept unchanged when not edited", () => {
    expect(normalisePart("ipm")).toBe("immediate_past_master");
    expect(partToSave("immediate_past_master", "ipm")).toBe("ipm");
    expect(partToSave("tyler", "ipm")).toBe("tyler");
  });
  it("Tyler can be chosen and is saved as its office key, one holder per session", () => {
    expect(opts.some((o) => o.value === "tyler" && o.label === "Tyler")).toBe(true);
    expect(partToSave("tyler", null)).toBe("tyler");
    expect(isOfficePart("tyler")).toBe(true);
    expect(isOfficePart("observing")).toBe(false);
  });
});
