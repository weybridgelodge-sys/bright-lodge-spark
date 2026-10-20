import { describe, it, expect } from "vitest";
import { isChunkLoadError, claimReload, cacheBustUrl, stripCacheBust, shortErrorLabel, CHUNK_RELOAD_KEY } from "@/lib/chunkReload";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("isChunkLoadError", () => {
  it("detects dynamic import failures", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/Hub-abc.js"))).toBe(true);
    expect(isChunkLoadError("Importing a module script failed.")).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "Loading chunk 12 failed" })).toBe(true);
    expect(isChunkLoadError("Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\" for /assets/a.js")).toBe(true);
  });
  it("ignores ordinary errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("claimReload guard", () => {
  it("allows once per 60 seconds", () => {
    const s = mem();
    expect(claimReload(() => s, 1_000_000)).toBe(true);
    expect(claimReload(() => s, 1_030_000)).toBe(false);
    expect(claimReload(() => s, 1_060_001)).toBe(true);
  });
  it("never reloads when the storage accessor throws", () => {
    expect(claimReload(() => { throw new Error("SecurityError"); }, 1)).toBe(false);
  });
  it("never reloads when setItem throws or does not persist", () => {
    expect(claimReload(() => ({ getItem: () => null, setItem: () => { throw new Error("quota"); } }), 1)).toBe(false);
    expect(claimReload(() => ({ getItem: () => null, setItem: () => {} }), 1)).toBe(false);
  });
  it("uses the shared key", () => {
    const s = mem(); claimReload(() => s, 5); expect(s.getItem(CHUNK_RELOAD_KEY)).toBe("5");
  });
});

describe("cache-bust URL", () => {
  it("keeps magic-link hash and query tokens", () => {
    const u = cacheBustUrl("https://a.test/members?code=abc#access_token=t&type=magiclink", 1000);
    const p = new URL(u);
    expect(p.pathname).toBe("/members");
    expect(p.searchParams.get("code")).toBe("abc");
    expect(p.hash).toBe("#access_token=t&type=magiclink");
    expect(stripCacheBust(u)).toBe("/members?code=abc#access_token=t&type=magiclink");
  });
  it("leaves deep links alone when no param", () => {
    expect(stripCacheBust("https://a.test/events/xmas?ref=qr")).toBeNull();
    expect(stripCacheBust("https://a.test/bookings?meeting=5&_r=x")).toBe("/bookings?meeting=5");
  });
});

it("short label has name and message only", () => {
  const e = new TypeError("boom"); e.stack = "secret stack";
  expect(shortErrorLabel(e)).toBe("TypeError boom");
});
