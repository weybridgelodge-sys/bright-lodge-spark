// Job AS-2: sends before archives, image fetch timeout, one crest load per send. Run: deno test.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { once, runSendsThenArchives } from "./newsletterDispatch.ts";
import { buildNewsletterArchivePdf } from "./newsletterArchivePdf.ts";

const brand = { crestUrl: "https://example.test/crest.png", lodgeName: "Testbury Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire", masthead: "The Testbury Chronicle", footerNote: "Members' newsletter" };
const content = { sections: [{ heading: "Pics", blocks: [{ type: "image" as const, url: "https://example.test/slow.jpg" }] }] };

Deno.test("all audiences' sends happen before any archive build; status set in between", async () => {
  const events: string[] = [];
  await runSendsThenArchives({
    audiences: ["members", "visitors", "all"],
    send: async (a) => { events.push(`send:${a}`); return { a, archive: async () => { events.push(`pdf:${a}`); } }; },
    afterSends: async () => { events.push("status"); },
  });
  assertEquals(events, ["send:members", "send:visitors", "send:all", "status", "pdf:members", "pdf:visitors", "pdf:all"]);
});

Deno.test("a failing archive does not stop the others; failed sends have no archive", async () => {
  const done: string[] = [];
  const rs = await runSendsThenArchives({
    audiences: ["a", "b", "c"],
    send: async (a) => ({ a, archive: a === "b" ? undefined : async () => { if (a === "a") throw new Error("pdf boom"); done.push(a); } }),
    log: () => {},
  });
  assertEquals(rs.length, 3);
  assertEquals(done, ["c"]);
});

Deno.test("image fetch times out -> [Image unavailable] line, PDF still built", async () => {
  let aborted = false;
  const hang = ((_u: string, init?: RequestInit) => new Promise((_, rej) => {
    init?.signal?.addEventListener("abort", () => { aborted = true; rej(new Error("aborted")); });
  })) as unknown as typeof fetch;
  const warns: unknown[] = []; const orig = console.warn; console.warn = (...a) => warns.push(a);
  const t0 = performance.now();
  try {
    const bytes = await buildNewsletterArchivePdf({ subject: "S", audienceLabel: "Members", recipientCount: 1, content, brand, loadCrestImpl: async () => null, fetchImpl: hang, imageTimeoutMs: 200 });
    assert(bytes.byteLength > 500);
  } finally { console.warn = orig; }
  const ms = performance.now() - t0;
  assert(aborted, "fetch aborted");
  assert(ms < 1500, `took ${ms}ms`);
  assert(JSON.stringify(warns).includes("timed out"));
});

Deno.test("default image limit is 10 seconds", async () => {
  const { IMAGE_FETCH_TIMEOUT_MS } = await import("./newsletterArchivePdf.ts");
  assertEquals(IMAGE_FETCH_TIMEOUT_MS, 10_000);
});

Deno.test("crest loaded once and reused across several audiences' PDFs", async () => {
  let loads = 0;
  const crest = once(async () => { loads++; return null; });
  for (let i = 0; i < 3; i++) {
    await buildNewsletterArchivePdf({ subject: "S", audienceLabel: `A${i}`, recipientCount: 1, content: { sections: [] }, brand, loadCrestImpl: () => crest() });
  }
  assertEquals(loads, 1);
});

Deno.test("once() turns a rejected load into null", async () => {
  const f = once(() => Promise.reject(new Error("x")));
  assertEquals(await f(), null);
  assertEquals(await f(), null);
});
