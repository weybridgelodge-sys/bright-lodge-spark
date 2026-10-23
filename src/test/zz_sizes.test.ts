import { it, vi } from "vitest";
import fs from "fs";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/docIdentity", async (orig) => { const r: any = await orig(); return { ...r, loadDocIdentity: async () => ({ ...r.BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" }) }; });
vi.mock("@/lib/pdfBrand", async (orig) => {
  const r: any = await orig(); const jpg = fs.readFileSync("/tmp/kpi/crest400.jpg").toString("base64");
  return { ...r, fetchCrestUrl: async () => "https://x.test/crest.jpg", createPdfRun: () => ({ crest: async (u: any) => (u ? { dataUrl: `data:image/jpeg;base64,${jpg}`, format: "JPEG" } : null) }) };
});
const png = (f: string) => ({ ok: true, headers: { get: () => "image/png" }, blob: async () => new Blob([fs.readFileSync(f)], { type: "image/png" }) });
(globalThis as any).fetch = async (u: string) => String(u).includes("white") ? png("/tmp/kpi/white.png") : String(u).includes("navy") ? png("/tmp/kpi/navy.png") : new Response("", { status: 404 });
import { buildAccountsPackPdf } from "@/lib/treasurer/accountsPackPdf";
import { buildMinutesPdf, buildAgendaPdf } from "@/pages/members/admin/MeetingMinutes";
import { buildPropertyRegisterPdf } from "@/components/members/treasurer/PropertyRegisterTab";
import { reportPdfDoc, reportSection, reportTable } from "@/lib/treasurer/reports";
it("sizes", async () => {
  const s = (snapK = 1) => ({ masonic_year: 2025, as_at: "2026-09-30", taken_at: "2026-10-05T10:00:00Z", income_expenditure: { income: 1, expenditure: 1, surplus: 0 }, balance_sheet: { assets: 1, liabilities: 1, net_assets: 0, fund_bf: 0, surplus: 0, total_funds: 0 }, trial_balance: { debit: 1, credit: 1 }, accounts: Array.from({ length: 30 }, (_, i) => ({ code: String(1000 + i * 100), name: `Account ${i}`, type: ["asset", "liability", "income", "expense"][i % 4], net: (i + 1) * 12345 * snapK })) });
  const src = { draft: false, snap: { ...s(), comparative: s(0.9) }, remarks: "Remarks. ".repeat(200), round: 1, certifiers: [] } as any;
  const out: Record<string, number> = {};
  const sz = (d: any) => d.output("arraybuffer").byteLength;
  const keep = (k: string, d: any) => { out[k] = sz(d); fs.writeFileSync(`/tmp/kpi/${process.env.TAG}-${k}.pdf`, Buffer.from(d.output("arraybuffer"))); };
  keep("pack-certified", await buildAccountsPackPdf(src, 2025, [{ role: "Auditor", name: "W Bro. Example", rank: "", date: "05 Oct 2026" }]));
  keep("pack-draft", await buildAccountsPackPdf({ ...src, draft: true }, 2025, []));
  const row = { meeting_type: "regular", meeting_at: "2026-03-12T18:30:00Z", title: "Regular Meeting", status: "draft", approved_date: null, apologies: "A, B", previous_minutes_note: "Read.", sections: Array.from({ length: 12 }, (_, i) => ({ heading: `Item ${i + 1}`, body: "Discussion text. ".repeat(40) })), action_items: [{ task: "Task", responsible: "Sec", deadline: "1 Apr", done: false }], next_meeting_at: "2026-05-14T18:30:00Z" } as any;
  const m: any = await buildMinutesPdf(row); keep("minutes", m);
  keep("agenda", await buildAgendaPdf({ ...row, meeting_type: "committee" }, {}));
  keep("property", await buildPropertyRegisterPdf(Array.from({ length: 60 }, (_, i) => ({ id: `${i}`, item: `Item ${i}`, count: 1, value_pence: 1000 * i, condition: "Good", date_acquired: null, location: "Store", notes: null, last_audited_date: null })) as any, 99999));
  const r: any = await reportPdfDoc("Income & Expenditure Account", "Sample period");
  let y = r.startY ?? 130;
  for (const sec of ["Income", "Expenditure", "Result for the Period"]) { y = reportSection(r.doc, r.pageW, r.margin, y, sec); y = reportTable(r.doc, r.margin, y, [["Account", "2025/26", "2024/25"]], Array.from({ length: 18 }, (_, i) => [`${4000 + i} — Account`, "£1.00", "(£2.00)"])); }
  r.finish?.(); keep("report", r.doc);
  fs.writeFileSync(`/tmp/kpi/sizes-${process.env.TAG}.json`, JSON.stringify(out));
});
