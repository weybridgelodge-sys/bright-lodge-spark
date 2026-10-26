// JOB DB1: five lodge-detail functions take an optional trailing _unit; NULL keeps today's path.
import { describe, it, expect } from "vitest";
import fs from "node:fs";

const file = fs.readdirSync("drizzle/migrations").find((f) => f.startsWith("0176_"))!;
const sql = fs.readFileSync(`drizzle/migrations/${file}`, "utf8");
const FNS = ["get_join_us_costs", "get_lodge_identity", "get_meeting_pattern", "get_public_lodge_figures", "get_public_unit_profile"];

describe("DB1 migration", () => {
  for (const fn of FNS) {
    it(`${fn}: old signature dropped, new one defaulted`, () => {
      expect(sql).toContain(`DROP FUNCTION public.${fn}();`);
      expect(sql).toContain(`CREATE FUNCTION public.${fn}(_unit text DEFAULT NULL::text)`);
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\(text\\) TO (PUBLIC, )?anon, authenticated, service_role;`));
    });
  }
  it("NULL _unit still resolves through current_unit_id(); explicit unit never falls back", () => {
    expect(sql.match(/WHEN _unit IS NULL THEN public\.current_unit_id\(\)/g)?.length).toBe(4);
    expect(sql).toContain("IF _unit IS NULL THEN\n    _u := public.current_unit_id();");
    expect(sql.match(/x\.id = nullif\(btrim\(_unit\), ''\)/g)?.length).toBe(5);
  });
  it("only get_join_us_costs keeps PUBLIC execute", () => {
    expect(sql.match(/TO PUBLIC, anon/g)?.length).toBe(1);
    for (const fn of FNS.slice(1)) expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn}(text) FROM PUBLIC;`);
  });
});
