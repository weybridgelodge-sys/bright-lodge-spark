import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { insertOnce, isUniqueViolation } from "../../supabase/functions/_shared/insertOnce";

// Fake table enforcing the same rule as uq_journal_entries_booking_refund.
function fakeJournal() {
  const rows: { source_type: string; source_id: string }[] = [];
  return {
    rows,
    insert: async (r: { source_type: string; source_id: string }) => {
      if (r.source_type === "booking_refund" && rows.some((x) => x.source_type === r.source_type && x.source_id === r.source_id))
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      rows.push(r);
      return { data: { id: String(rows.length) }, error: null };
    },
  };
}

describe("refunds are posted once", () => {
  it("first post works", async () => {
    const t = fakeJournal();
    const r = await insertOnce("x", () => t.insert({ source_type: "booking_refund", source_id: "b1" }));
    expect(r).toEqual({ status: "inserted", data: { id: "1" } });
  });
  it("duplicate post is a no-op, not an error", async () => {
    const t = fakeJournal();
    vi.spyOn(console, "log").mockImplementation(() => {});
    await insertOnce("x", () => t.insert({ source_type: "booking_refund", source_id: "b1" }));
    const r = await insertOnce("x", () => t.insert({ source_type: "booking_refund", source_id: "b1" }));
    expect(r.status).toBe("already_posted");
    expect(t.rows).toHaveLength(1);
  });
  it("another booking's (or unit's) refund is unaffected", async () => {
    const t = fakeJournal();
    await insertOnce("x", () => t.insert({ source_type: "booking_refund", source_id: "b1" }));
    const r = await insertOnce("x", () => t.insert({ source_type: "booking_refund", source_id: "b2" }));
    expect(r.status).toBe("inserted");
    expect(t.rows).toHaveLength(2);
  });
  it("other errors still fail", async () => {
    await expect(insertOnce("x", async () => ({ data: null, error: { code: "23503" } }))).rejects.toEqual({ code: "23503" });
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });
  it("refund inserts use insertOnce; dues webhook no longer upserts on the partial index", () => {
    const wh = readFileSync("supabase/functions/payments-webhook/index.ts", "utf8");
    const dr = readFileSync("supabase/functions/dues-refund/index.ts", "utf8");
    expect(wh).toContain("insertOnce(`booking refund");
    expect(wh).toContain("insertOnce(`dues refund");
    expect(wh).not.toContain('onConflict: "stripe_refund_id"');
    expect(dr).toContain("insertOnce(`dues refund");
  });
});
