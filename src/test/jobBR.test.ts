import { describe, expect, it } from "vitest";
import { hostFromHeaders, normaliseHost, resolveUnitWith, UNKNOWN_SITE_MESSAGE } from "../../supabase/functions/_shared/resolveUnit";
import { eventLodgeOptions, matchLodgeOption } from "@/lib/eventLodges";
import { computeHeadcount, isHostLodge } from "@/lib/festiveBoard";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";

const DOMAINS: Record<string, string> = { "weybridgelodge.org.uk": "weybridge", "www.weybridgelodge.org.uk": "weybridge", localhost: "weybridge" };
const lookup = async (h: string) => DOMAINS[h] ?? null;
const run = (h: Record<string, string>) => resolveUnitWith(new Headers(h), lookup);

describe("resolveUnit", () => {
  it("matches the web address", async () => {
    expect(await run({ origin: "https://weybridgelodge.org.uk" })).toEqual({ ok: true, unitId: "weybridge", host: "weybridgelodge.org.uk" });
  });
  it("www is its own explicit row", async () => {
    expect((await run({ origin: "https://www.weybridgelodge.org.uk" })).ok).toBe(true);
    expect((await resolveUnitWith(new Headers({ origin: "https://www.weybridgelodge.org.uk" }), async (h) => (h === "weybridgelodge.org.uk" ? "weybridge" : null))).ok).toBe(false);
  });
  it("uppercase, port and trailing dot are normalised", async () => {
    expect(normaliseHost("HTTPS://WeybridgeLodge.ORG.uk:8443/x")).toBe("weybridgelodge.org.uk");
    expect(normaliseHost("https://weybridgelodge.org.uk./")).toBe("weybridgelodge.org.uk");
    expect((await run({ origin: "http://localhost:8080" })).ok).toBe(true);
  });
  it("falls back to Referer when Origin is missing or 'null'", async () => {
    expect(hostFromHeaders(new Headers({ referer: "https://weybridgelodge.org.uk/join-us" }))).toBe("weybridgelodge.org.uk");
    expect(hostFromHeaders(new Headers({ origin: "null", referer: "https://weybridgelodge.org.uk/" }))).toBe("weybridgelodge.org.uk");
  });
  it("no match is an error, never a default unit", async () => {
    expect(await run({ origin: "https://other-lodge.example" })).toEqual({ ok: false, error: UNKNOWN_SITE_MESSAGE });
  });
  it("no headers is an error", async () => {
    expect((await run({})).ok).toBe(false);
    expect((await run({ origin: "not a url" })).ok).toBe(false);
  });
  it("a failing lookup is an error, not a throw", async () => {
    expect((await resolveUnitWith(new Headers({ origin: "https://weybridgelodge.org.uk" }), async () => { throw new Error("db"); })).ok).toBe(false);
  });
});

describe("event lodge options", () => {
  const xmas = ["Weybridge Lodge No. 6787", "Astolat Lodge No. 5848"];
  it("hosting lodges as typed, then Another lodge and Guest", () => {
    expect(eventLodgeOptions(xmas, "Weybridge Lodge No. 6787")).toEqual([
      { value: "Weybridge Lodge No. 6787", label: "Weybridge Lodge No. 6787" },
      { value: "Astolat Lodge No. 5848", label: "Astolat Lodge No. 5848" },
      { value: "Other", label: "Another lodge" },
      { value: "Guest", label: "Guest / not a Freemason" },
    ]);
  });
  it("empty hosting lodges offers the owning lodge; blank Unit Setup offers only the fixed two", () => {
    expect(eventLodgeOptions([], "Weybridge Lodge No. 6787").map((o) => o.value)).toEqual(["Weybridge Lodge No. 6787", "Other", "Guest"]);
    expect(eventLodgeOptions(["  ", ""], "").map((o) => o.value)).toEqual(["Other", "Guest"]);
  });
  it("server accepts only this event's options (plus short names from older pages)", () => {
    const opts = eventLodgeOptions(xmas, "");
    expect(matchLodgeOption("Astolat Lodge No. 5848", opts)).toBe("Astolat Lodge No. 5848");
    expect(matchLodgeOption("Guest", opts)).toBe("Guest");
    expect(matchLodgeOption("Other", opts)).toBe("Other");
    expect(matchLodgeOption("Weybridge", opts)).toBe("Weybridge Lodge No. 6787");
    expect(matchLodgeOption("Astolat", eventLodgeOptions(["Weybridge Lodge No 6787"], ""))).toBeNull();
    expect(matchLodgeOption("Some Other Lodge", opts)).toBeNull();
    expect(matchLodgeOption("", opts)).toBeNull();
  });
});

describe("isHostLodge", () => {
  const W = { lodgeName: "Weybridge Lodge", lodgeNumber: "6787" };
  it("matches as the old Weybridge rule did", () => {
    for (const t of ["Weybridge", "weybridge lodge", "Weybridge Lodge No. 6787", "6787", "Lodge 6787", "WEYBRIDGE"]) expect(isHostLodge(t, W)).toBe(true);
    for (const t of ["", null, "Astolat", "Weybridgeshire", "L6787", "67870", "Noel Money 2521"]) expect(isHostLodge(t, W)).toBe(false);
  });
  it("blank Unit Setup matches nothing", () => {
    expect(isHostLodge("Weybridge Lodge 6787", { lodgeName: "", lodgeNumber: "" })).toBe(false);
    expect(isHostLodge("Weybridge", null)).toBe(false);
  });
  it("similar names of another lodge do not match", () => {
    const A = { lodgeName: "Astolat Lodge", lodgeNumber: "5848" };
    expect(isHostLodge("Astolat", A)).toBe(true);
    expect(isHostLodge("Weybridge Lodge No. 6787", A)).toBe(false);
    expect(isHostLodge("Astolatian", A)).toBe(false);
    expect(isHostLodge("58480", A)).toBe(false);
  });
  it("headcount counts host-lodge visitors as members", () => {
    const rows = [{ attendance_status: "booked", member_id: null, visitor_lodge_name: "Weybridge" }, { attendance_status: "booked", member_id: null, visitor_lodge_name: "Astolat" }];
    expect(computeHeadcount(rows, null, W).members).toBe(1);
    expect(computeHeadcount(rows, null, null).members).toBe(0);
  });
});

describe("newsletter footer town line", () => {
  it("comes from the venue's last address line; blank = omitted", () => {
    const w = resolveLodgeSettings({ formal_sender_name: "Weybridge Lodge No. 6787" }, { meeting_place: { town_line: "Guildford, Surrey GU2 4DR" } });
    expect([w.formalSenderName, w.meetingTownLine].filter(Boolean).join(" · ")).toBe("Weybridge Lodge No. 6787 · Guildford, Surrey GU2 4DR");
    expect(resolveLodgeSettings(null).meetingTownLine).toBe("");
  });
});
