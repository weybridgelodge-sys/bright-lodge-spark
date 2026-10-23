// Job AO: newsletter archive PDF on the shared brand header. Run: deno test (no network, no backend).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { buildNewsletterArchivePdf } from "./newsletterArchivePdf.ts";
import { loadCrest } from "./pdfLibBrand.ts";

const brand = {
  crestUrl: "https://example.test/crest.png", lodgeName: "Testbury Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire",
  masthead: "The Testbury Chronicle", footerNote: "Members' newsletter",
};
const content = {
  sections: Array.from({ length: 8 }, (_, i) => ({
    heading: `Section ${i + 1}`,
    blocks: [{ type: "text" as const, text: "Brethren gathered for the meeting. ".repeat(40) }],
  })),
};
const noFetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;

async function crestPng(): Promise<Uint8Array> {
  const { Image } = await import("npm:imagescript@1.3.0");
  const img = new Image(1006, 1006); img.fill(0x1B2A4AFF);
  return await img.encode();
}

async function textOf(bytes: Uint8Array) {
  // pdf-lib writes standard-font text as hex strings; decode them for assertions.
  let raw = new TextDecoder("latin1").decode(bytes);
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      const buf = Uint8Array.from(m[1], (ch) => ch.charCodeAt(0));
      const out = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
      raw += new TextDecoder("latin1").decode(out);
    } catch { /* not deflate */ }
  }
  return [...raw.matchAll(/<([0-9A-Fa-f]+)> Tj/g)].map((m) => m[1].match(/../g)!.map((h) => String.fromCharCode(parseInt(h, 16))).join("")).join("\n");
}

Deno.test("header shows lodge identity, masthead and wording; every page has Page x of y", async () => {
  const bytes = await buildNewsletterArchivePdf({ subject: "Autumn issue", audienceLabel: "Members", recipientCount: 22, content, brand, loadCrestImpl: async () => null, fetchImpl: noFetch, now: new Date("2026-10-23") });
  const t = await textOf(bytes);
  const n = (await PDFDocument.load(bytes)).getPageCount();
  for (const s of ["Testbury Lodge", "No. 1234 — Province of Testshire", "The Testbury Chronicle", "MONTHLY CHRONICLE & LABOURS", "Autumn issue", "Section 8", `Page ${n} of ${n}`, "© 2026 The Testbury Chronicle · Members' newsletter"]) {
    assert(t.includes(s), `missing: ${s}`);
  }
  assert(n >= 2);
});

Deno.test("crest failure: PDF still built with no image", async () => {
  for (const impl of [async () => null, async () => { throw new Error("boom"); }, async () => ({ bytes: new Uint8Array([1, 2, 3]), format: "png" as const })]) {
    const bytes = await buildNewsletterArchivePdf({ subject: "S", audienceLabel: "Members", recipientCount: 1, content, brand, loadCrestImpl: impl as any, fetchImpl: noFetch });
    assert(bytes.length > 1000);
    assert(!/\/Subtype\s*\/Image/.test(new TextDecoder("latin1").decode(bytes)));
  }
});

Deno.test("loadCrest: network error, HTTP error, non-image, blank, timeout all give null", async () => {
  assertEquals(await loadCrest("https://x/c.png", { fetchImpl: noFetch }), null);
  assertEquals(await loadCrest("https://x/c.png", { fetchImpl: async () => new Response("no", { status: 404 }) }), null);
  assertEquals(await loadCrest("https://x/c.png", { fetchImpl: async () => new Response("<html>", { headers: { "content-type": "text/html" } }) }), null);
  assertEquals(await loadCrest("", { fetchImpl: noFetch }), null);
  assertEquals(await loadCrest("http://insecure/c.png", { fetchImpl: noFetch }), null);
  const t0 = Date.now();
  assertEquals(await loadCrest("https://x/c.png", { timeoutMs: 50, fetchImpl: () => new Promise(() => {}) }), null);
  assert(Date.now() - t0 < 2000);
});

Deno.test("real crest is downscaled and the file stays small", async () => {
  const png = await crestPng();
  const crest = await loadCrest("https://x/c.png", { fetchImpl: async () => new Response(png as BodyInit, { headers: { "content-type": "image/png" } }) });
  assert(crest, "crest processed");
  const bytes = await buildNewsletterArchivePdf({ subject: "S", audienceLabel: "Members", recipientCount: 1, content, brand, loadCrestImpl: async () => crest, fetchImpl: noFetch });
  assert(/\/Subtype\s*\/Image/.test(new TextDecoder("latin1").decode(bytes)));
  console.log("archive PDF bytes with crest:", bytes.length);
  assert(bytes.length < 200 * 1024);
});
