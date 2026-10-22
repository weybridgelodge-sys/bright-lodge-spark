import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "drizzle/migrations");
const latest = readdirSync(dir).filter((f) => f.endsWith(".sql"))
  .filter((f) => readFileSync(join(dir, f), "utf8").includes("FUNCTION public.swap_member_signature"))
  .sort().pop()!;
const sql = readFileSync(join(dir, latest), "utf8");
const fn = readFileSync(join(process.cwd(), "supabase/functions/signature-upload/index.ts"), "utf8");

describe("swap_member_signature (unit ids are text)", () => {
  it("latest definition never casts unit_id to uuid", () => {
    expect(sql).not.toMatch(/'unit_id'\)\s*::\s*uuid/);
    expect(sql).toContain("_row->>'unit_id',");
  });
  it("uuid/date casts match member_signatures column types", () => {
    for (const c of ["id", "member_id"]) expect(sql).toContain(`(_row->>'${c}')::uuid`);
    expect(sql).toContain("NULLIF(_row->>'consent_date','')::date");
    expect(sql).toContain("NULLIF(_row->>'consent_recorded_by','')::uuid");
  });
  it("upload function passes unit_id straight through (no uuid conversion)", () => {
    expect(fn).toMatch(/unit_id:\s*targetUnit/);
  });
});
