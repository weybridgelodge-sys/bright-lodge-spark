import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");

describe("migration 0148 drops host-lodge unit defaults", () => {
  const m = read("drizzle/migrations/0148_drop_host_unit_defaults.sql");
  it.each(["newsletter_subscribers", "lodge_fee_settings", "lodge_contact_settings"])("%s default dropped", (t) => {
    expect(m).toContain(`ALTER TABLE public.${t} ALTER COLUMN unit_id DROP DEFAULT;`);
  });
  it("keeps NOT NULL, leaves profiles alone, rewrites no rows", () => {
    expect(m).not.toMatch(/NOT NULL|profiles|^\s*(UPDATE|DELETE|INSERT|TRUNCATE)\b/im);
  });
});

describe("inserters supply unit_id explicitly", () => {
  it("newsletter-subscribe inserts with the resolved unit", () => {
    expect(read("supabase/functions/newsletter-subscribe/index.ts")).toMatch(/\.insert\(\{ email: e, unit_id: UNIT_ID,/);
  });
  it("no edge function or screen inserts/upserts these tables without a unit", () => {
    const files = ["supabase/functions/newsletter-confirm/index.ts", "supabase/functions/newsletter-unsubscribe/index.ts",
      "supabase/functions/broadcast-newsletter/index.ts", "supabase/functions/submit-enquiry/index.ts", "supabase/functions/_shared/lodgeSettings.ts"];
    for (const f of files) {
      expect(read(f)).not.toMatch(/from\(["'](newsletter_subscribers|lodge_fee_settings|lodge_contact_settings)["']\)\s*\.(insert|upsert)/);
    }
  });
});
