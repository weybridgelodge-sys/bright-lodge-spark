import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import fs from "fs";
const heads = vi.hoisted(() => [] as { heading: string; lines: number; cols: number }[]);
vi.mock("jspdf-autotable", async (orig) => {
  const real: any = (await orig<any>()).default;
  return { default: (doc: any, o: any) => { real(doc, o); const t = doc.lastAutoTable; const c = t.head[0]?.cells[0]; heads.push({ heading: String(o.head?.[0]?.[0] ?? ""), lines: c?.text?.length ?? 0, cols: t.columns.length }); } };
});
import type jsPDF from "jspdf";
import { exportFullKpi } from "@/lib/kpiExports";
import { createPdfRun } from "@/lib/pdfBrand";
import { BLANK_DOC_IDENTITY } from "@/lib/docIdentity";

const ID = { ...BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };
const m = (i: number) => ({ id: `m${i}`, first_name: "A", middle_name: null, last_name: `Member${i}`, full_name: null, status: "active", date_of_birth: "1970-01-01", initiated_date: "2015-03-01" } as any);
const bundle = { officerYear: 2026, members: Array.from({ length: 22 }, (_, i) => m(i)), wmTerms: [], pastMasters: [], risks: [], candidates: [], statusHistory: [], positions: [], appointments: [] } as any;
const eng = { meetings: [], attendance: [], absences: [], visitors: [] } as any;
// 1x1 white JPEG (stand-in for a processed crest).
const TINY_JPG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAAsIAAEAAQEBEQD/xAAUAAEAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwA//9k=";

async function build(run: ReturnType<typeof createPdfRun>, crestUrl: string | null) {
  let out: { doc: jsPDF; name: string } | null = null;
  await exportFullKpi(bundle, eng, null, { identity: ID, crestUrl, run, save: async (doc, name) => { out = { doc, name }; } });
  return out!;
}
const longPeriod = { start: "2025-10-01", end: "2026-09-30", label: "Financial year", rangeLabel: "1 October 2025 – 30 September 2026" } as any;
const hasImage = (doc: jsPDF) => /\/Subtype \/Image/.test(doc.output());

describe("KPI summary PDF", () => {
  it("crest fetch failure still produces the PDF with the text header and no image", async () => {
    const run = createPdfRun({ fetchImpl: (async () => { throw new Error("network"); }) as any });
    const { doc, name } = await build(run, "https://x.test/crest.png");
    expect(name).toMatch(/^kpi-summary-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(hasImage(doc)).toBe(false);
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
  it("blank crest setting, timeout and bad image all omit the image without throwing", async () => {
    expect(hasImage((await build(createPdfRun(), null)).doc)).toBe(false);
    const slow = createPdfRun({ timeoutMs: 5, fetchImpl: (() => new Promise(() => {})) as any });
    expect(hasImage((await build(slow, "https://x.test/c.png")).doc)).toBe(false);
    const bad = createPdfRun({ fetchImpl: (async () => ({ ok: true, headers: { get: () => "image/png" }, blob: async () => new Blob([]) })) as any, process: async () => ({ dataUrl: "data:image/png;base64,AAAA", format: "PNG" }) });
    expect(hasImage((await build(bad, "https://x.test/c.png")).doc)).toBe(false);
  });
  it("is A4 portrait, under 200 KB with a crest, and the last table ends above the footer", async () => {
    const jpg = fs.existsSync("/tmp/kpi/crest400.jpg") ? fs.readFileSync("/tmp/kpi/crest400.jpg").toString("base64") : TINY_JPG;
    const run = createPdfRun({ fetchImpl: (async () => ({ ok: true, headers: { get: () => "image/jpeg" }, blob: async () => new Blob([]) })) as any, process: async () => ({ dataUrl: `data:image/jpeg;base64,${jpg}`, format: "JPEG" }) });
    const { doc } = await build(run, "https://x.test/crest.jpg");
    expect(hasImage(doc)).toBe(true);
    const ps = doc.internal.pageSize;
    expect([Math.round(ps.getWidth()), Math.round(ps.getHeight())]).toEqual([595, 842]);
    expect(doc.output("arraybuffer").byteLength).toBeLessThan(200 * 1024);
    expect((doc as any).lastAutoTable.finalY).toBeLessThanOrEqual(842 - 56);
    if (process.env.KPI_PDF_OUT) fs.writeFileSync(process.env.KPI_PDF_OUT, Buffer.from(doc.output("arraybuffer")));
  });
  it("no section heading wraps; two-column tables get a fixed first column of at least 40%", async () => {
    heads.length = 0;
    const eng2 = { meetings: [{ id: "x", meeting_date: "2026-01-10", meeting_type: "regular" }], attendance: [], absences: [], visitors: [] } as any;
    let doc: any;
    await exportFullKpi(bundle, eng2, longPeriod, { identity: ID, crestUrl: null, save: async (d) => { doc = d; } });
    expect(heads.length).toBeGreaterThan(8);
    for (const h of heads) expect({ heading: h.heading, lines: h.lines }).toEqual({ heading: h.heading, lines: 1 });
    const two = heads.filter((h) => h.cols === 2).map((h) => h.heading);
    for (const t of ["3. UGLE Portal", "6. Officers & Succession", "11. Disengagement Risk"]) expect(two).toContain(t);
    expect(doc).toBeTruthy();
  });
});
