import { describe, it, expect } from "vitest";
import { formatEntryNumber, entryNumberMatches, compareWithinEntry } from "@/lib/treasurer/entryNumber";

describe("journal entry document numbers", () => {
  it("formats as JE-000123", () => {
    expect(formatEntryNumber(123)).toBe("JE-000123");
    expect(formatEntryNumber(1)).toBe("JE-000001");
    expect(formatEntryNumber(1234567)).toBe("JE-1234567");
    expect(formatEntryNumber(null)).toBe("");
    expect(formatEntryNumber(0)).toBe("");
  });

  it("is stable: same number always formats the same", () => {
    expect(formatEntryNumber(42)).toBe(formatEntryNumber(42));
  });

  it("searches by number in any common form", () => {
    expect(entryNumberMatches(123, "123")).toBe(true);
    expect(entryNumberMatches(123, "JE-000123")).toBe(true);
    expect(entryNumberMatches(123, "je-123")).toBe(true);
    expect(entryNumberMatches(123, "124")).toBe(false);
    expect(entryNumberMatches(123, "")).toBe(true);
  });

  it("groups lines of one entry together, debits first then account code", () => {
    const lines = [
      { entryNumber: 2, debit: 0, code: "1010" },
      { entryNumber: 1, debit: 0, code: "4100" },
      { entryNumber: 2, debit: 500, code: "1000" },
      { entryNumber: 1, debit: 100, code: "5420" },
      { entryNumber: 1, debit: 900, code: "1010" },
    ];
    const sorted = [...lines].sort(compareWithinEntry);
    expect(sorted.map((l) => `${l.entryNumber}:${l.code}`)).toEqual(["1:1010", "1:5420", "1:4100", "2:1000", "2:1010"]);
  });
});
