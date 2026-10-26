// JOB CW: public pages resolve their own lodge and pass it as _unit (two-lodge mock).
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";

const state = { site: "A" as string | null, rpc: [] as any[] };
const DATA: Record<string, any> = { A: { lodge_name: "Lodge A" }, B: { lodge_name: "Lodge B" } };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: async () => ({ data: { unit_id: state.site }, error: null }) },
    rpc: async (fn: string, args: any) => { state.rpc.push({ fn, args }); return { data: args?._unit ? DATA[args._unit] ?? {} : DATA.A, error: null }; },
  },
}));
import { loadBookingDetails } from "@/lib/bookingDetails";
import { resetSiteUnit, resolveSiteUnit } from "@/lib/siteUnit";

beforeEach(() => {
  state.rpc = []; resetSiteUnit();
  // Site lookup is a plain fetch to resolve-site-unit since Job DB2.
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon");
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ unit_id: state.site }), { status: 200 }));
});

describe("booking details use the site's lodge", () => {
  it("lodge B site gets lodge B", async () => {
    state.site = "B";
    expect((await loadBookingDetails()).lodgeName).toBe("Lodge B");
    expect(state.rpc).toEqual([{ fn: "get_public_booking_details", args: { _unit: "B" } }]);
  });
  it("lodge A site gets lodge A", async () => {
    state.site = "A";
    expect((await loadBookingDetails()).lodgeName).toBe("Lodge A");
  });
  it("unknown site = error, no call without a lodge", async () => {
    state.site = null;
    await expect(loadBookingDetails()).rejects.toThrow();
    expect(state.rpc).toHaveLength(0);
    expect(await resolveSiteUnit()).toBeNull();
  });
});

describe("Officers page passes the lodge", () => {
  const src = fs.readFileSync("src/pages/Officers.tsx", "utf8");
  it("both calls carry _unit and wait for the resolver", () => {
    expect(src).toMatch(/rpc\("get_officers_public", \{ _year: null, _unit: unit \}\)/);
    expect(src).toMatch(/rpc\("get_officers_public_year", \{ _unit: unit \}\)/);
    expect(src.indexOf("await resolveSiteUnit()")).toBeLessThan(src.indexOf('rpc("get_officers_public"'));
    expect(src).toMatch(/if \(!unit\) \{ setRpcRows\(\[\]\); return; \}/);
  });
  it("no other src caller omits _unit", () => {
    expect(fs.readFileSync("src/lib/bookingDetails.ts", "utf8")).toMatch(/"get_public_booking_details", \{ _unit: unit \}/);
  });
});
