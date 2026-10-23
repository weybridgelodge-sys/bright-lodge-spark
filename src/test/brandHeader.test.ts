import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import { brandHeaderLines } from "../../supabase/functions/_shared/transactional-email-templates/_brand";
import { resolveLodgeSettings } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { createPdfRun, drawBrandHeader, drawBrandFooter } from "@/lib/pdfBrand";
import { BLANK_DOC_IDENTITY } from "@/lib/docIdentity";

const ID = { ...BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };
const okRes = (type = "image/png") => ({ ok: true, headers: { get: () => type }, blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type }) });

describe("email brand header lines", () => {
  it("builds name, number/province and footer from identity", () => {
    expect(brandHeaderLines({ crestUrl: "https://cdn.example.test/c.png", lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" }))
      .toEqual({ crestUrl: "https://cdn.example.test/c.png", name: "Example Lodge", sub: "No. 1234 — Province of Testshire", footer: "Example Lodge No. 1234" });
  });
  it("blank or non-https crest is omitted; blank parts skipped", () => {
    expect(brandHeaderLines({ crestUrl: "", lodgeName: "Example Lodge" }).crestUrl).toBeNull();
    expect(brandHeaderLines({ crestUrl: "http://x.test/c.png" }).crestUrl).toBeNull();
    expect(brandHeaderLines(null)).toEqual({ crestUrl: null, name: "", sub: "", footer: "" });
  });
  it("server settings: crest from Unit Setup only, no fallback", () => {
    expect(resolveLodgeSettings(null, { crest_image: { url: " https://cdn.example.test/c.png " } }).crestImageUrl).toBe("https://cdn.example.test/c.png");
    expect(resolveLodgeSettings(null, { crest_image: { url: "http://x.test/c.png" } }).crestImageUrl).toBe("");
    expect(resolveLodgeSettings(null, {}).crestImageUrl).toBe("");
    expect(resolveLodgeSettings(null, {}, {}, { lodgeName: "Example Lodge", lodgeNumber: "1234" })).toMatchObject({ lodgeName: "Example Lodge", lodgeNumber: "1234" });
    expect(resolveLodgeSettings(null).lodgeNumber).toBe("");
  });
});

describe("PDF crest loader", () => {
  it("fetches once per run (cached)", async () => {
    const f = vi.fn(async () => okRes());
    const run = createPdfRun({ fetchImpl: f as any });
    const a = await run.crest("https://cdn.example.test/c.png");
    const b = await run.crest("https://cdn.example.test/c.png");
    expect(a?.format).toBe("PNG");
    expect(b).toBe(a);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("omits the crest on failure, HTTP error, wrong type, timeout or blank URL", async () => {
    expect(await createPdfRun({ fetchImpl: (async () => { throw new Error("net"); }) as any }).crest("https://x.test/c.png")).toBeNull();
    expect(await createPdfRun({ fetchImpl: (async () => ({ ...okRes(), ok: false })) as any }).crest("https://x.test/c.png")).toBeNull();
    expect(await createPdfRun({ fetchImpl: (async () => okRes("image/webp")) as any }).crest("https://x.test/c.png")).toBeNull();
    expect(await createPdfRun({ timeoutMs: 20, fetchImpl: (() => new Promise(() => {})) as any }).crest("https://x.test/c.png")).toBeNull();
    const f = vi.fn();
    expect(await createPdfRun({ fetchImpl: f as any }).crest("")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

const mockDoc = () => {
  const calls: { fn: string; args: unknown[] }[] = [];
  const rec = (fn: string) => (...args: unknown[]) => { calls.push({ fn, args }); };
  const doc: any = new Proxy({ internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } }, getNumberOfPages: () => 2,
    getImageProperties: () => ({ width: 100, height: 100 }) }, { get: (t, k: string) => (k in t ? (t as any)[k] : rec(k)) });
  return { doc, calls };
};

describe("PDF brand header", () => {
  it("no crest: no image drawn, name and title still drawn", () => {
    const { doc, calls } = mockDoc();
    const y = drawBrandHeader(doc, { identity: ID, crest: null, title: "Trial Balance", periodLine: "As at 30 Sep 2026" });
    expect(calls.some((c) => c.fn === "addImage")).toBe(false);
    const texts = calls.filter((c) => c.fn === "text").map((c) => c.args[0]);
    expect(texts).toEqual(expect.arrayContaining(["Example Lodge", "No. 1234  —  Province of Testshire", "Trial Balance", "As at 30 Sep 2026"]));
    expect(y).toBeGreaterThan(106);
  });
  it("with crest: image drawn and text moves right of it", () => {
    const { doc, calls } = mockDoc();
    drawBrandHeader(doc, { identity: ID, crest: { dataUrl: "data:image/png;base64,AA==", format: "PNG" }, title: "Trial Balance" });
    expect(calls.some((c) => c.fn === "addImage")).toBe(true);
    expect(calls.find((c) => c.fn === "text" && c.args[0] === "Example Lodge")!.args[1]).toBe(120);
  });
  it("footer on every page with lodge title and page count", () => {
    const { doc, calls } = mockDoc();
    drawBrandFooter(doc, ID);
    const texts = calls.filter((c) => c.fn === "text").map((c) => c.args[0]);
    expect(texts).toEqual(["Example Lodge No. 1234", "Page 1 of 2", "Example Lodge No. 1234", "Page 2 of 2"]);
  });
});

// Pilot files: crest only from Unit Setup — no typed crest URL, bundled crest import or host literal.
const PILOT = [
  "supabase/functions/_shared/transactional-email-templates/portal-access-request.tsx",
  "supabase/functions/_shared/transactional-email-templates/_brandHeader.tsx",
  "src/lib/pdfBrand.ts", "src/lib/treasurer/brandedReportDoc.ts", "src/components/members/treasurer/TrialBalanceReport.tsx",
];
const BANNED = /LOGO_URL|@\/assets\/|\.asset\.json|lovable\.app|__l5e|weybridge|6787|Province of Surrey/i;
describe("pilot files carry no typed crest or host literal", () => {
  for (const f of PILOT) it(f, () => {
    const bad = fs.readFileSync(f, "utf8").split("\n").filter((l) => BANNED.test(l));
    expect(bad).toEqual([]);
  });
});
