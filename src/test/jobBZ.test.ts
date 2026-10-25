import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "drizzle/migrations");
const file = readdirSync(dir).find((f) => /^\d+_revoke_client_pending_account_units\.sql$/.test(f));
const sql = file ? readFileSync(join(dir, file), "utf8").replace(/--.*$/gm, "") : "";

describe("JOB BZ: pending_account_units has no client grants", () => {
  it("revokes all from PUBLIC, anon and authenticated", () => {
    expect(file).toBeTruthy();
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+public\.pending_account_units\s+FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*;/i);
  });
  it("does not touch service_role or anything else", () => {
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/\bGRANT\b|handle_new_user|CREATE|DROP|ALTER/i);
  });
});
