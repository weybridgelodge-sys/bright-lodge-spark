// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, waitFor } from "@testing-library/react";
import { useUnitProfile } from "@/lib/unitProfile";
import { __resetUnitProfileFetch, fetchUnitProfileRow } from "@/lib/unitProfileFetch";

const row = { lodge_name: "Testbury Lodge", lodge_number: "1234", venue_name: "Test Hall" };

function Probe({ id }: { id: string }) {
  const u = useUnitProfile();
  return <p data-testid={id}>{u.lodgeName}</p>;
}

beforeEach(() => {
  __resetUnitProfileFetch();
  sessionStorage.clear();
  localStorage.clear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon");
});

describe("public unit profile startup", () => {
  it("Header, Footer and NextMeeting consumers share one request", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(row), { status: 200 }));
    vi.stubGlobal("fetch", f);
    void fetchUnitProfileRow(); // main.tsx early start
    const r = render(<><Probe id="h" /><Probe id="f" /><Probe id="n" /></>);
    await waitFor(() => expect(r.getByTestId("n").textContent).toBe("Testbury Lodge"));
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("unit-profile-last-good-v1")!).lodge_name).toBe("Testbury Lodge");
  });

  it("failure leaves fields empty and does not throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const r = render(<Probe id="h" />);
    await expect(fetchUnitProfileRow()).resolves.toBeNull();
    expect(r.getByTestId("h").textContent).toBe("");
  });

  it("ignores malformed localStorage and uses a good one on first render", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    localStorage.setItem("unit-profile-last-good-v1", "{not json");
    expect(render(<Probe id="a" />).getByTestId("a").textContent).toBe("");
    localStorage.setItem("unit-profile-last-good-v1", JSON.stringify([1, 2]));
    expect(render(<Probe id="b" />).getByTestId("b").textContent).toBe("");
    localStorage.setItem("unit-profile-last-good-v1", JSON.stringify(row));
    expect(render(<Probe id="c" />).getByTestId("c").textContent).toBe("Testbury Lodge");
  });
});

describe("hero text", () => {
  it("has no opacity-0 entrance on the h1/subtitle/paragraph", () => {
    const src = readFileSync("src/components/Hero.tsx", "utf8");
    const block = src.slice(src.indexOf('<div className="max-w-2xl'), src.indexOf("</h1>"));
    expect(block).not.toMatch(/hero-rise-in|hero-fade-in|opacity-0/);
  });
});

describe("non-blocking stylesheet", () => {
  it("rewrites Vite's entry stylesheet to preload + onload swap with a noscript fallback", async () => {
    const { nonBlockingCss } = await import("../../vite-plugin-non-blocking-css");
    const out = nonBlockingCss().transformIndexHtml.handler('<link rel="stylesheet" crossorigin href="/assets/index-abc.css">');
    expect(out).toContain('rel="preload" as="style"');
    expect(out).toContain("this.rel='stylesheet'");
    expect(out).toContain('<noscript><link rel="stylesheet" crossorigin href="/assets/index-abc.css"></noscript>');
  });
  it("app mount waits for the sheet but never longer than the timeout", async () => {
    const { appCssReady } = await import("@/lib/appCssReady");
    const l = document.createElement("link"); l.rel = "preload"; l.setAttribute("data-app-css", ""); document.head.appendChild(l);
    let done = false; void appCssReady(50).then(() => { done = true; });
    await new Promise((r) => setTimeout(r, 10)); expect(done).toBe(false);
    await new Promise((r) => setTimeout(r, 80)); expect(done).toBe(true);
    l.remove();
  });
});

describe("hero paragraph matches the static first paint", () => {
  it("index.html skeleton paragraph has the same text as the Hero paragraph", () => {
    const norm = (t: string) => t.replace(/\s+/g, " ").trim();
    const html = readFileSync("index.html", "utf8");
    const skel = norm(html.match(/<p class="skeleton-lede">([\s\S]*?)<\/p>/)![1]);
    const hero = readFileSync("src/components/Hero.tsx", "utf8");
    const p = norm(hero.match(/font-light leading-relaxed[^>]*>([\s\S]*?)<\/p>/)![1]);
    expect(skel).toBe(p);
  });
});
