import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "drizzle/migrations");
const file = readdirSync(dir).find((f) => /^\d+_revoke_client_sequences\.sql$/.test(f));
const sql = file ? readFileSync(join(dir, file), "utf8").replace(/--.*$/gm, "") : "";

describe("JOB CB: two sequences have no client grants", () => {
  it("revokes all on both sequences from PUBLIC, anon and authenticated", () => {
    expect(file).toBeTruthy();
    expect(sql).toMatch(
      /REVOKE\s+ALL\s+ON\s+SEQUENCE\s+public\.journal_entry_number_seq\s*,\s*public\.officer_appointment_audit_id_seq\s+FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*;/i,
    );
  });
  it("leaves service_role and everything else alone", () => {
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/\bGRANT\b|DEFAULT\s+PRIVILEGES|CREATE|DROP|ALTER/i);
  });
});
