// Money/content guard for the Treasurer, accounts pack and minutes/agenda PDFs.
// Records every table (head/body/foot) and every body text line from fixed sample data,
// with the header/footer lines (lodge identity, report title line, period line, generated date,
// page numbers) removed, and compares with the snapshot taken from the pre-conversion code.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";

const rec = vi.hoisted(() => ({ items: [] as string[], inTable: 0 }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/docIdentity", async (orig) => {
  const real: any = await orig();
  const ID = { ...real.BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };
  return { ...real, loadDocIdentity: async () => ID };
});
vi.mock("jspdf", async (orig) => {
  const Real: any = (await orig<any>()).default;
  function Wrapped(this: any, ...a: any[]) {
    const d = new Real(...a);
    const t = d.text.bind(d);
    d.text = (s: any, ...r: any[]) => { if (!rec.inTable && !d.__measureOnly) (Array.isArray(s) ? s : [s]).forEach((x: any) => rec.items.push(`T:${String(x)}`)); return t(s, ...r); };
    return d;
  }
  (Wrapped as any).API = Real.API;
  return { default: Wrapped, jsPDF: Wrapped };
});
vi.mock("jspdf-autotable", async (orig) => {
  const real: any = (await orig<any>()).default;
  const cell = (c: any) => (c && typeof c === "object" ? String(c.content ?? "") : String(c ?? ""));
  return {
    default: (doc: any, o: any) => {
      if (doc.__measureOnly) return real(doc, o); // height dry-run on a scratch doc, not output
      for (const part of ["head", "body", "foot"]) for (const row of o[part] ?? []) rec.items.push(`${part}:${row.map(cell).join(" | ")}`);
      rec.inTable++; try { real(doc, o); } finally { rec.inTable--; }
    },
  };
});

import { buildAccountsPackPdf } from "@/lib/treasurer/accountsPackPdf";
import { buildMinutesPdf, buildAgendaPdf } from "@/pages/members/admin/MeetingMinutes";
import { buildPropertyRegisterPdf } from "@/components/members/treasurer/PropertyRegisterTab";

// The snapshot holds a "generated <date>" line: freeze the clock to the snapshot day (23 Oct 2026, noon UTC).
beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-23T12:00:00Z")); });
afterAll(() => { vi.useRealTimers(); });
import { reportPdfDoc, reportSection, reportTable } from "@/lib/treasurer/reports";

const HEADERISH = [/^T:Example Lodge( No\. 1234)?$/, /^T:No\. 1234/, /^T:Province of Testshire$/, /^T:Generated:? /, /^T:Page \d+ of \d+$/];
const TITLE_LINES = new Set<string>();
function take(): string[] {
  const out = rec.items
    .filter((s) => !HEADERISH.some((r) => r.test(s)) && !TITLE_LINES.has(s))
    .map((s) => s.replace(/ · page \d+ of \d+$/, " · page"))
    .filter((s, i, a) => !(s.endsWith(" · page") && a[i - 1] === s)); // one footer entry per run of pages
  rec.items = [];
  return out;
}
const title = (...t: string[]) => t.forEach((x) => TITLE_LINES.add(`T:${x}`));

const snap = (y: number, k = 1) => ({
  masonic_year: y, as_at: `${y + 1}-09-30`, taken_at: `${y + 1}-10-05T10:00:00Z`,
  income_expenditure: { income: 1234567 * k, expenditure: 987654 * k, surplus: 246913 * k },
  balance_sheet: { assets: 5432100 * k, liabilities: 120000 * k, net_assets: 5312100 * k, fund_bf: 5065187 * k, surplus: 246913 * k, total_funds: 5312100 * k },
  trial_balance: { debit: 1, credit: 1 },
  accounts: [
    { code: "1000", name: "Bank current account", type: "asset", net: 5000000 * k },
    { code: "1100", name: "Debtors", type: "asset", net: 432100 * k },
    { code: "2000", name: "Creditors", type: "liability", net: -120000 * k },
    { code: "4000", name: "Subscriptions", type: "income", net: -1100000 * k },
    { code: "4100", name: "Dining income", type: "income", net: -134567 * k },
    { code: "5000", name: "Dining costs", type: "expense", net: 900000 * k },
    { code: "5100", name: "Provincial dues", type: "expense", net: 87654 * k },
  ],
});
const YEAR = 2025;
const draft = { draft: true, snap: { ...snap(YEAR), comparative: snap(YEAR - 1, 0.9) }, remarks: "The Lodge finances remain sound.\nDining was well supported.", round: null, certifiers: [] } as any;
const certified = { ...draft, draft: false, round: 2 } as any;
const certifiers = [{ role: "Auditor", name: "W Bro. Example One", rank: "PPrGD", date: "05 Oct 2026" }, { role: "Independent Examiner", name: "Bro. Example Two", rank: "", date: "06 Oct 2026" }];
const row = {
  id: "r1", meeting_type: "regular", meeting_at: "2026-03-12T18:30:00Z", title: "Regular Meeting", lodge_event_id: null,
  status: "approved", approved_date: "2026-05-14", apologies: "W Bro. A, Bro. B", previous_minutes_note: "Read and confirmed.",
  sections: [{ heading: "Treasurer's report", body: "Balance at bank £50,000.00.\n\nSubscriptions received." }, { heading: "Almoner", body: "Nothing to report." }],
  action_items: [{ task: "Book venue", responsible: "Secretary", deadline: "1 Apr", done: false }],
  next_meeting_at: "2026-05-14T18:30:00Z", transcript_text: null,
} as any;
const items = [
  { id: "i1", item: "Wardens' columns", count: 2, value_pence: 45000, condition: "Good", date_acquired: "1990-01-01", location: "Temple", notes: null, last_audited_date: "2025-10-01" },
  { id: "i2", item: "Banner", count: 1, value_pence: 120000, condition: "Fair", date_acquired: null, location: "Store", notes: "Needs repair", last_audited_date: null },
] as any;

async function capture() {
  const out: Record<string, string[]> = {};
  title("Treasurer's Remarks", "Treasurer's Remarks (continued)", `Balance Sheet as at 30 September ${YEAR + 1}`, `Income & Expenditure for the year ended 30 September ${YEAR + 1}`, "Auditors' Certificate");
  rec.items = []; await buildAccountsPackPdf(draft, YEAR, []); out.packDraft = take();
  await buildAccountsPackPdf(certified, YEAR, certifiers); out.packCertified = take();
  title("Regular Meeting Minutes", "Regular Meeting — Thursday 12th March 2026 at 6.30 p.m.", "AGENDA");
  await buildMinutesPdf(row); out.minutes = take();
  await buildAgendaPdf({ ...row, meeting_type: "committee" }, { secretary: { name: "W Bro. Sec", address: ["1 High St", "Town"] }, treasurer: null }); out.agenda = take();
  title("Lodge Property Register", "Stock check sheet — 2 lines");
  await buildPropertyRegisterPdf(items, 165000); out.property = take();
  title("Income & Expenditure Account", "Sample period");
  const ie = await reportPdfDoc("Income & Expenditure Account", "Sample period");
  let y = (ie as any).startY ?? 130;
  y = reportSection(ie.doc, ie.pageW, ie.margin, y, "Income");
  reportTable(ie.doc, ie.margin, y, [["Account", "2025/26", "2024/25"]], [["4000 — Subscriptions", "£11,000.00", "(£9,900.00)"], ["Total income", "£12,345.67", "£11,111.10"]]);
  out.reportHelpers = take();
  return out;
}

describe("Treasurer / pack / minutes PDFs: figures and wording unchanged", () => {
  it("matches the pre-conversion text snapshot", async () => {
    const got = await capture();
    const f = "src/test/__fixtures__/treasurerPdfText.json";
    if (process.env.CAPTURE_TREASURER_PDF) fs.writeFileSync(f, JSON.stringify(got, null, 1));
    const want = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(got).toEqual(want);
    expect(got.packCertified.some((s) => s.includes("£54,321.00"))).toBe(true);
  });
});
