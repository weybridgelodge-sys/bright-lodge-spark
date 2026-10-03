import { describe, expect, it } from "vitest";
import {
  findMissing,
  idempotencyKey,
  isSendWindow,
  ukDate,
} from "../../supabase/functions/secretary-ugle-reminder/logic";

const row = (o: Record<string, unknown>) => ({ id: crypto.randomUUID(), status: "active", first_name: "A", last_name: "B", ...o });

describe("secretary UGLE reminder", () => {
  it("selects active initiated members with blank numbers, oldest first", () => {
    const out = findMissing([
      row({ first_name: "Late", initiation_date: "2026-05-13", ugle_reg_number: null }),
      row({ first_name: "Early", initiation_date: "2025-02-01", ugle_reg_number: "  " }),
      row({ first_name: "Empty", initiation_date: "2025-09-01", ugle_reg_number: "" }),
      row({ first_name: "Has", initiation_date: "2024-01-01", ugle_reg_number: "123456" }),
      row({ first_name: "NoInit", initiation_date: null, ugle_reg_number: null }),
      row({ first_name: "Gone", status: "resigned", initiation_date: "2020-01-01", ugle_reg_number: null }),
    ]);
    expect(out.map((e) => e.name)).toEqual(["Early B", "Empty B", "Late B"]);
    expect(out[2].initiationLabel).toBe("13 May 2026");
    expect(JSON.stringify(out)).not.toContain("123456");
  });

  it("formats UK dates", () => expect(ukDate("2026-01-01")).toBe("1 January 2026"));

  it("key changes with content, stable for same list", () => {
    const a = findMissing([row({ id: "x", initiation_date: "2025-01-01" })]);
    const b = findMissing([row({ id: "y", initiation_date: "2025-01-01" })]);
    expect(idempotencyKey("2026-11-01", a)).toBe(idempotencyKey("2026-11-01", a));
    expect(idempotencyKey("2026-11-01", a)).not.toBe(idempotencyKey("2026-11-01", b));
    expect(idempotencyKey("2026-11-01", a)).not.toBe(idempotencyKey("2026-12-01", a));
  });

  it("send window is 07:00 UK on the 1st in both GMT and BST", () => {
    expect(isSendWindow(new Date("2026-12-01T07:10:00Z"))).toBe(true); // GMT
    expect(isSendWindow(new Date("2026-06-01T06:10:00Z"))).toBe(true); // BST
    expect(isSendWindow(new Date("2026-06-01T07:10:00Z"))).toBe(false);
    expect(isSendWindow(new Date("2026-06-02T06:10:00Z"))).toBe(false);
  });
});
