// JOB DE: Hero, Join Us and FAQ take the member age range from the live lodge figures.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const state = { figures: { youngest_age: 32, oldest_age: 82 } as any, rpc: [] as string[] };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (fn: string) => {
      state.rpc.push(fn);
      return fn === "get_public_lodge_figures" ? { data: state.figures, error: null } : { data: null, error: null };
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  },
}));
vi.mock("@/lib/siteUnit", async (orig) => ({ ...(await orig<any>()), resolveSiteUnit: async () => "A" }));

import Hero from "@/components/Hero";
import { resetSharedLodgeFigures, heroAgeClause } from "@/lib/lodgeFigures";
import { buildProfilePoints } from "@/pages/JoinUs";
import FAQ, { eligibilityAnswer } from "@/pages/FAQ";

const wrap = (ui: React.ReactNode) => render(<HelmetProvider><MemoryRouter>{ui}</MemoryRouter></HelmetProvider>);
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
(globalThis as any).IntersectionObserver ??= IO;
beforeEach(() => { resetSharedLodgeFigures(); state.rpc = []; state.figures = { youngest_age: 32, oldest_age: 82 }; });

describe("live age range", () => {
  it("Hero shows the live range after load", async () => {
    const { container } = wrap(<Hero />);
    await waitFor(() => expect(container.textContent).toContain("men in Guildford — aged from 32 to 82 — who meet"));
  });
  it("Hero omits the clause cleanly when figures are unavailable", async () => {
    state.figures = {};
    const { container } = wrap(<Hero />);
    await waitFor(() => expect(state.rpc).toContain("get_public_lodge_figures"));
    expect(container.textContent).toContain("men in Guildford who meet");
    expect(container.textContent).not.toMatch(/aged|NaN/);
  });
  it("Hero clause helper", () => {
    expect(heroAgeClause({ youngestAge: 32, oldestAge: 82 })).toBe(" — aged from 32 to 82 —");
    expect(heroAgeClause({ youngestAge: null, oldestAge: 82 })).toBe("");
  });
  it("Join Us profile point with and without figures", () => {
    expect(buildProfilePoints("from 32 to 82")[0].text).toBe("You're a man of any adult age — our members currently range from 32 to 82 — living in or near Guildford, Woking, Godalming, Farnham, Cranleigh or Leatherhead.");
    expect(buildProfilePoints("")[0].text).toBe("You're a man of any adult age living in or near Guildford, Woking, Godalming, Farnham, Cranleigh or Leatherhead.");
  });
  it("FAQ eligibility answer", () => {
    expect(eligibilityAnswer("Get in touch.", "from 32 to 82")).toBe("Get in touch. Our members currently range in age from 32 to 82.");
    expect(eligibilityAnswer("Get in touch.", "")).toBe("Get in touch.");
  });
  for (const [label, figs, expected] of [
    ["live", { youngest_age: 32, oldest_age: 82 }, "Our members currently range in age from 32 to 82."],
    ["unavailable", {}, null],
  ] as const) {
    it(`FAQ schema answer equals visible answer (${label})`, async () => {
      state.figures = figs;
      wrap(<FAQ />);
      await waitFor(() => expect(state.rpc).toContain("get_public_lodge_figures"));
      fireEvent.click(screen.getByRole("button", { name: "Can anyone join a Masonic Lodge in Surrey?" }));
      await waitFor(() => {
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent || "{}"));
        const all = ld.flatMap((j) => (Array.isArray(j["@graph"]) ? j["@graph"] : [j]));
        const q = all.flatMap((j: any) => j.mainEntity ?? []).find((e: any) => e.name === "Can anyone join a Masonic Lodge in Surrey?");
        expect(q).toBeTruthy();
        const text = q.acceptedAnswer.text as string;
        if (expected) expect(text.endsWith(expected)).toBe(true); else expect(text).not.toMatch(/range in age/);
        expect(document.body.textContent).toContain(text);
      });
    });
  }
  it("one shared figures request across components", async () => {
    wrap(<><Hero /><Hero /></>);
    await waitFor(() => expect(state.rpc.filter((f) => f === "get_public_lodge_figures").length).toBe(1));
  });
  it("no hard-coded 83 range in the three files", () => {
    for (const f of ["src/components/Hero.tsx", "src/pages/JoinUs.tsx", "src/pages/FAQ.tsx", "index.html"]) {
      expect(readFileSync(f, "utf8").replace(/00 to 00/g, "")).not.toMatch(/18 to 83|18 and 83|\b83\b/);
    }
  });
});
