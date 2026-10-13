import { describe, it, expect } from "vitest";
import { attendanceOptions, diningEventLabel, lodgeRequired } from "@/lib/bookingTitles";

describe("booking form titles", () => {
  it("Masonic titles get three options with the meeting label", () => {
    expect(attendanceOptions("W. Bro", "White Table").map((o) => o.label)).toEqual([
      "Attending Meeting + White Table", "Attending Meeting ONLY", "Not Attending (Apologies for absence)",
    ]);
  });
  it("Mr and Mrs get no meeting-only option", () => {
    for (const t of ["Mr", "Mrs"]) {
      expect(attendanceOptions(t, "White Table").map((o) => o.value)).toEqual(["meeting-and-festive-board", "apologies"]);
      expect(attendanceOptions(t, "White Table")[0].label).toBe("Attending White Table");
    }
  });
  it("lodge is optional only for Mr/Mrs", () => {
    expect(lodgeRequired("Mr")).toBe(false);
    expect(lodgeRequired("Mrs")).toBe(false);
    expect(lodgeRequired("Bro")).toBe(true);
  });
  it("label defaults to Festive Board", () => {
    expect(diningEventLabel(null)).toBe("Festive Board");
    expect(diningEventLabel("  ")).toBe("Festive Board");
  });
});
