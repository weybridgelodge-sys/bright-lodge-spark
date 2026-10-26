// JOB DB2: public lodge-detail helpers send the site's own lodge (two-lodge mock).
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = { site: "A" as string | null, rpc: [] as any[] };
const DATA: Record<string, any> = {
  get_meeting_pattern: { A: { schedule: [{ month: 2, ordinal: "3", weekday: 3 }] }, B: { schedule: [{ month: 5, ordinal: "2", weekday: 4 }] } },
  get_public_lodge_figures: { A: { subscribing_count: 11 }, B: { subscribing_count: 22 } },
  get_join_us_costs: { A: [{ annual_dues_pence: 10000 }], B: [{ annual_dues_pence: 20000 }] },
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (fn: string, args: any) => { state.rpc.push({ fn, args }); return { data: DATA[fn]?.[args?._unit] ?? {}, error: null }; },
  },
}));
import { resetSiteUnit } from "@/lib/siteUnit";
import { fetchPublicMeetingPattern } from "@/lib/meetingPattern";
import { loadLodgeFigures, BLANK_FIGURES } from "@/lib/lodgeFigures";
import { fetchJoinUsCostRow } from "@/lib/joinUsCosts";
import { fetchUnitProfileRow, __resetUnitProfileFetch } from "@/lib/unitProfileFetch";

const fetchMock = vi.fn(async (url: string, init?: any) => {
  if (String(url).includes("resolve-site-unit")) return new Response(JSON.stringify({ unit_id: state.site }), { status: 200 });
  const u = JSON.parse(init?.body ?? "{}")._unit;
  return new Response(JSON.stringify({ lodge_name: `Lodge ${u}` }), { status: 200 });
});

beforeEach(() => {
  state.rpc = []; resetSiteUnit(); __resetUnitProfileFetch(); fetchMock.mockClear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon");
  vi.stubGlobal("fetch", fetchMock);
});

describe("helpers send the resolved lodge", () => {
  it("lodge B site: every helper asks for B", async () => {
    state.site = "B";
    expect((await fetchPublicMeetingPattern())?.perYear).toBe(1);
    expect((await loadLodgeFigures()).subscribingCount).toBe(22);
    expect((await fetchJoinUsCostRow())?.annual_dues_pence).toBe(20000);
    expect(state.rpc).toEqual([
      { fn: "get_meeting_pattern", args: { _unit: "B" } },
      { fn: "get_public_lodge_figures", args: { _unit: "B" } },
      { fn: "get_join_us_costs", args: { _unit: "B" } },
    ]);
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes("resolve-site-unit"))).toHaveLength(1); // resolved once
  });
  it("lodge A site gets A's figures", async () => {
    state.site = "A";
    expect((await loadLodgeFigures()).subscribingCount).toBe(11);
  });
  it("unknown site: empty states and no lodge-detail call at all", async () => {
    state.site = null;
    expect(await fetchPublicMeetingPattern()).toBeNull();
    expect(await loadLodgeFigures()).toEqual(BLANK_FIGURES);
    expect(await fetchJoinUsCostRow()).toBeNull();
    expect(await fetchUnitProfileRow()).toBeNull();
    expect(state.rpc).toHaveLength(0);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("get_public_unit_profile"))).toBe(false);
  });
});

describe("pre-React profile fetch", () => {
  it("resolves the lodge first, then asks for that lodge", async () => {
    state.site = "B";
    expect(await fetchUnitProfileRow()).toEqual({ lodge_name: "Lodge B" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/functions/v1/resolve-site-unit");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/rpc/get_public_unit_profile");
    expect(JSON.parse((fetchMock.mock.calls[1] as any)[1].body)).toEqual({ _unit: "B" });
  });
});
