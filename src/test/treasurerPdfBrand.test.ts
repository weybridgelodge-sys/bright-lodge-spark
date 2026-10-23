// Crest failure, size and footer-clearance checks for every PDF built on reportPdfDoc / the accounts pack.
import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/docIdentity", async (orig) => {
  const r: any = await orig();
  return { ...r, loadDocIdentity: async () => ({ ...r.BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" }) };
});
const mode = vi.hoisted(() => ({ crestUrl: null as string | null }));
vi.mock("@/lib/pdfBrand", async (orig) => ({ ...(await orig<any>()), fetchCrestUrl: async () => mode.crestUrl }));
const tables = vi.hoisted(() => [] as { finalY: number; head: number }[]);
vi.mock("jspdf-autotable", async (orig) => {
  const real: any = (await orig<any>()).default;
  return { default: (doc: any, o: any) => { real(doc, o); const t = doc.lastAutoTable; tables.push({ finalY: t.finalY, head: Math.max(0, ...(t.head[0]?.cells ? Object.values(t.head[0].cells).map((c: any) => c.text.length) : [0])) }); } };
});
import { buildAccountsPackPdf } from "@/lib/treasurer/accountsPackPdf";
import { buildMinutesPdf, buildAgendaPdf } from "@/pages/members/admin/MeetingMinutes";
import { buildPropertyRegisterPdf } from "@/components/members/treasurer/PropertyRegisterTab";
import { reportPdfDoc, reportSection, reportTable } from "@/lib/treasurer/reports";

const s = (k = 1) => ({ masonic_year: 2025, as_at: "2026-09-30", taken_at: "2026-10-05T10:00:00Z", income_expenditure: { income: 1, expenditure: 1, surplus: 0 }, balance_sheet: { assets: 1, liabilities: 1, net_assets: 0, fund_bf: 0, surplus: 0, total_funds: 0 }, trial_balance: { debit: 1, credit: 1 }, accounts: Array.from({ length: 40 }, (_, i) => ({ code: String(1000 + i * 100), name: `Account ${i}`, type: ["asset", "liability", "income", "expense"][i % 4], net: (i + 1) * 12345 * k })) });
const pack = { draft: false, snap: { ...s(), comparative: s(0.9) }, remarks: "Remarks. ".repeat(400), round: 1, certifiers: [] } as any;
const row = { meeting_type: "regular", meeting_at: "2026-03-12T18:30:00Z", title: "Regular Meeting", status: "draft", approved_date: null, apologies: "A, B", previous_minutes_note: "Read.", sections: Array.from({ length: 14 }, (_, i) => ({ heading: `Item ${i + 1}`, body: "Discussion text. ".repeat(40) })), action_items: Array.from({ length: 12 }, () => ({ task: "Task", responsible: "Sec", deadline: "1 Apr", done: false })), next_meeting_at: "2026-05-14T18:30:00Z" } as any;
const items = Array.from({ length: 70 }, (_, i) => ({ id: `${i}`, item: `Item ${i}`, count: 1, value_pence: 1000 * i, condition: "Good", date_acquired: null, location: "Store", notes: null, last_audited_date: null })) as any;

async function ieLike(deps?: any) {
  const r = await reportPdfDoc("Income & Expenditure Account", "Sample period", false, deps);
  let y = r.startY;
  for (const sec of ["Income", "Expenditure", "Result for the Period"]) { y = reportSection(r.doc, r.pageW, r.margin, y, sec); y = reportTable(r.doc, r.margin, y, [["Account", "2025/26", "2024/25"]], Array.from({ length: 22 }, (_, i) => [`${4000 + i} — Account`, "£1.00", "(£2.00)"])); }
  r.finish(); return r.doc;
}
const builders: [string, () => Promise<any>][] = [
  ["shared report header (I&E, Balance Sheet, Bank Rec, Event account)", () => ieLike()],
  ["accounts pack (certified)", () => buildAccountsPackPdf(pack, 2025, [{ role: "Auditor", name: "W Bro. Example", rank: "", date: "05 Oct 2026" }])],
  ["accounts pack (draft)", () => buildAccountsPackPdf({ ...pack, draft: true }, 2025, [])],
  ["minutes", () => buildMinutesPdf(row)],
  ["agenda", () => buildAgendaPdf({ ...row, meeting_type: "committee" }, {})],
  ["property register", () => buildPropertyRegisterPdf(items, 99999)],
];
const hasImage = (d: any) => /\/Subtype \/Image/.test(d.output());

describe("Treasurer, accounts pack, minutes and agenda PDFs", () => {
  for (const [name, build] of builders) {
    it(`${name}: crest network failure or blank setting still builds, without the image`, async () => {
      const realFetch = globalThis.fetch;
      (globalThis as any).fetch = async () => { throw new Error("network"); };
      try {
        mode.crestUrl = "https://x.test/crest.png";
        const d1 = await build(); expect(hasImage(d1)).toBe(false); expect(d1.getNumberOfPages()).toBeGreaterThan(0);
        mode.crestUrl = null;
        const d2 = await build(); expect(hasImage(d2)).toBe(false);
      } finally { (globalThis as any).fetch = realFetch; mode.crestUrl = null; }
    });
    it(`${name}: A4 portrait, under 200 KB, tables clear of the footer, headings on one line`, async () => {
      tables.length = 0;
      const d = await build();
      const ps = d.internal.pageSize;
      expect([Math.round(ps.getWidth()), Math.round(ps.getHeight())]).toEqual([595, 842]);
      expect(d.output("arraybuffer").byteLength).toBeLessThan(200 * 1024);
      for (const t of tables) { expect(t.finalY).toBeLessThanOrEqual(842 - 56); expect(t.head).toBeLessThanOrEqual(1); }
    });
  }
});
