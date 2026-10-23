import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const heads = vi.hoisted(() => [] as { heading: string; lines: number; finalY: number; pages: number }[]);
vi.mock("jspdf-autotable", async (orig) => {
  const real: any = (await orig<any>()).default;
  return { default: (doc: any, o: any) => { real(doc, o); const t = doc.lastAutoTable; heads.push({ heading: String(o.head?.[0]?.[0] ?? ""), lines: t.head[0]?.cells[0]?.text?.length ?? 0, finalY: t.finalY, pages: doc.getNumberOfPages() }); } };
});
import fs from "fs";
import { buildAlmonerReportPdf } from "@/lib/almonerReportPdf";
import { createPdfRun } from "@/lib/pdfBrand";
import { BLANK_DOC_IDENTITY } from "@/lib/docIdentity";

const ID = { ...BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };
const many = (n: number, f: (i: number) => any) => Array.from({ length: n }, (_, i) => f(i));
const d = {
  concern: many(6, (i) => ({ member_id: `m${i}`, status: "amber", notes: "Sample note" })),
  logRows: many(40, (i) => ({ contact_date: "2026-05-01", member_id: `m${i % 6}`, contact_type: "phone", contact_nature: "welfare", notes: "Called to check in." })),
  corrRows: many(5, (i) => ({ correspondence_date: "2026-05-02", direction: i % 2 ? "outgoing" : "incoming", member_id: i ? `m${i}` : null, method: "letter", subject: "Card" })),
  activeRefs: [{ member_id: "m1", referral_type: "MCF", status: "open", referral_date: "2026-04-01", summary: "Sample" }],
  absRows: [], widows: many(4, (i) => ({ name: `Mrs Example ${i}`, text: "Visited; doing well." })),
};
const input = {
  fromD: "2026-04-01", toD: "2026-06-30", adviceText: "Sample advice. ".repeat(80), d,
  nameOf: (id: string | null | undefined) => (id ? `Bro. Sample ${id}` : ""),
  lifeRows: many(3, (i) => ({ date: "12 Jul", member: `Bro. Sample m${i}`, type: "Birthday", detail: "" })),
  fmt: (s: string | null | undefined) => s ?? "", stripEmoji: (s: string) => s,
};
const hasImage = (doc: any) => /\/Subtype \/Image/.test(doc.output());
const okJpeg = (b64: string) => createPdfRun({ fetchImpl: (async () => ({ ok: true, headers: { get: () => "image/jpeg" }, blob: async () => new Blob([]) })) as any, process: async () => ({ dataUrl: `data:image/jpeg;base64,${b64}`, format: "JPEG" }) });
const TINY_JPG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAAsIAAEAAQEBEQD/xAAUAAEAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwA//9k=";

describe("Almoner's Report PDF", () => {
  it("crest failures (network, blank, timeout) still build the PDF with the text header", async () => {
    for (const [run, url] of [
      [createPdfRun({ fetchImpl: (async () => { throw new Error("net"); }) as any }), "https://x.test/c.png"],
      [createPdfRun(), null],
      [createPdfRun({ timeoutMs: 5, fetchImpl: (() => new Promise(() => {})) as any }), "https://x.test/c.png"],
    ] as const) {
      const doc = await buildAlmonerReportPdf(input, { identity: ID, crestUrl: url, run });
      expect(hasImage(doc)).toBe(false);
      expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    }
  });
  it("A4, small, tables clear of the footer, no heading wraps", async () => {
    heads.length = 0;
    const jpg = fs.existsSync("/tmp/kpi/crest400.jpg") ? fs.readFileSync("/tmp/kpi/crest400.jpg").toString("base64") : TINY_JPG;
    const doc = await buildAlmonerReportPdf(input, { identity: ID, crestUrl: "https://x.test/c.jpg", run: okJpeg(jpg) });
    expect(hasImage(doc)).toBe(true);
    const ps = doc.internal.pageSize;
    expect([Math.round(ps.getWidth()), Math.round(ps.getHeight())]).toEqual([595, 842]);
    expect(doc.output("arraybuffer").byteLength).toBeLessThan(200 * 1024);
    for (const h of heads) { expect(h.lines).toBe(1); expect(h.finalY).toBeLessThanOrEqual(842 - 56); }
    if (process.env.ALMONER_PDF_OUT) fs.writeFileSync(process.env.ALMONER_PDF_OUT, Buffer.from(doc.output("arraybuffer")));
  });
});
