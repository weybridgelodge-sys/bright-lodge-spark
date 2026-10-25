import { describe, it, expect, vi, afterEach } from "vitest";
import { confirmNewsletterToken } from "@/pages/NewsletterConfirm";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("newsletter confirm page request", () => {
  it("returns 'timeout' when the server does not answer within the limit", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) => new Promise((_, rej) => {
      init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    })));
    const p = confirmNewsletterToken("a".repeat(64), 20_000);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await p).toBe("timeout");
  });
  it("network failure without timeout stays 'error'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await confirmNewsletterToken("a".repeat(64))).toBe("error");
  });
  it("already-used link still reads 'invalid'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "invalid" }))));
    expect(await confirmNewsletterToken("a".repeat(64))).toBe("invalid");
  });
});
