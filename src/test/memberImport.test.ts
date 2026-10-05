import { describe, it, expect } from "vitest";
import { parseCSV, csvToObjects } from "@/lib/csv";
import { fillBlanks, normaliseHeader, parseDate, validateRow } from "../../supabase/functions/_shared/memberImport";

describe("csv", () => {
  it("handles quotes, commas, newlines and BOM", () => {
    expect(parseCSV('\uFEFFa,b\r\n"x, y","l1\nl2"\r\n')).toEqual([["a", "b"], ["x, y", "l1\nl2"]]);
    expect(csvToObjects("email,first_name\nA@b.com,Tom")).toEqual([{ email: "A@b.com", first_name: "Tom" }]);
  });
});

describe("member import validation", () => {
  const n = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [normaliseHeader(k), v]));
  it("parses UK and ISO dates and rejects impossible ones", () => {
    expect(parseDate("05/10/2026")).toBe("2026-10-05");
    expect(parseDate("2026-10-05")).toBe("2026-10-05");
    expect(parseDate("31/02/2026")).toBe("invalid");
  });
  it("maps aliases, ignores role columns and normalises values", () => {
    const { record, errors } = validateRow(n({ Email: "Tom@X.com", "First Name": "Tom", Surname: "Smith", "Grand Lodge Number": "123", Title: "W Bro.", role: "admin", is_royal_arch: "yes" }));
    expect(errors).toEqual([]);
    expect(record!.email).toBe("tom@x.com");
    expect(record!.ugle_reg_number).toBe("123");
    expect(record!.title).toBe("W Bro");
    expect(record!.is_royal_arch).toBe(true);
    expect("role" in record!).toBe(false);
  });
  it("reports errors", () => {
    expect(validateRow({ email: "bad", first_name: "", last_name: "X", status: "boss" }).errors.length).toBe(3);
  });
});

describe("fillBlanks", () => {
  const rec = validateRow({ email: "a@b.com", first_name: "New", last_name: "Name", town: "Guildford", is_royal_arch: "yes", is_honorary_member: "no", status: "resigned", degree: "fellow_craft" }).record!;
  it("never overwrites, only fills blanks, never touches status/degree/email", () => {
    const patch = fillBlanks({ first_name: "Old", last_name: "Name", town: "", is_royal_arch: false, is_honorary_member: true, status: "active", degree: "master_mason" }, rec);
    expect(patch).toEqual({ town: "Guildford", is_royal_arch: true });
  });
  it("is idempotent", () => {
    const existing = { first_name: "Old", last_name: "Name", town: "", is_royal_arch: false };
    const after = { ...existing, ...fillBlanks(existing, rec) };
    expect(fillBlanks(after, rec)).toEqual({});
  });
});
