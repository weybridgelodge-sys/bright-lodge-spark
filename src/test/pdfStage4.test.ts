// Job AL: header period-line wrap, headings that travel with their tables, Bank Reconciliation
// column widths, and crest-failure / size / footer checks for the Charity, Development and
// Officers Projection PDFs moved onto the shared brand header (src/lib/pdfBrand).
import { describe, it, expect, vi } from "vitest";
import jsPDF from "jspdf";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/workingGroups", () => ({
  listGroups: async () => Array.from({ length: 6 }, (_, i) => ({ id: `g${i}`, name: `Working Group ${i + 1}`, remit: "Looks after the work of this group. ".repeat(4) })),
  listAllReportItemsInYear: async () => Array.from({ length: 30 }, (_, i) => ({ working_group_id: `g${i % 6}`, working_group_name: "", item_type: "meeting", item_date: "2026-01-10", title: `Item ${i}`, detail: "Detail text. ".repeat(6) })),
}));
const tables = vi.hoisted(() => [] as { doc: any; finalY: number; pageH: number; cols: { width: number; idx: number }[]; body: { col: number; text: string[]; raw: string }[] }[]);
vi.mock("jspdf-autotable", async (orig) => {
  const real: any = (await orig<any>()).default;
  return {
    default: (doc: any, o: any) => {
      real(doc, o);
      if (doc.__measureOnly) return;
      const t = doc.lastAutoTable;
      tables.push({
        doc, finalY: t.finalY, pageH: doc.internal.pageSize.getHeight(),
        cols: t.columns.map((c: any) => ({ width: c.width, idx: c.index })),
        body: t.body.flatMap((r: any) => Object.entries(r.cells).map(([k, c]: [string, any]) => ({ col: Number(k), text: c.text, raw: String(c.raw ?? "") }))),
      });
    },
  };
});

import { createPdfRun, drawBrandHeader, layoutPeriodLine, PERIOD_GAP, HEADER_RULE_Y } from "@/lib/pdfBrand";
import { BLANK_DOC_IDENTITY } from "@/lib/docIdentity";
import { buildBankRecPdf, BANK_REC_COLUMNS } from "@/lib/treasurer/bankRecPdf";
import { reportLayoutTrace } from "@/lib/treasurer/reports";
import { buildCharityAnnualReportPdf } from "@/lib/charity/annualReportPdf";
import { buildCharityPeriodicReportPdf } from "@/lib/charity/periodicReportPdf";
import { buildGapReportPdf } from "@/lib/development/gapReportPdf";
import { buildSummaryReportPdf } from "@/lib/development/summaryReportPdf";
import { buildDevelopmentPdf } from "@/lib/development/pdf";
import { buildWorkingGroupsActivityPdf } from "@/lib/development/activityReportPdf";
import { buildOfficersProjectionPdf } from "@/lib/officersProjectionPdf";
import { POSITION_ORDER } from "@/lib/officersProgression";

const ID = { ...BLANK_DOC_IDENTITY, lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };
const failRun = () => createPdfRun({ fetchImpl: async () => { throw new Error("network"); } });
const timeoutRun = () => createPdfRun({ timeoutMs: 20, fetchImpl: () => new Promise(() => {}) });
const hasImage = (d: any) => /\/Subtype \/Image/.test(d.output());

// ---- 1. Header: long period line never overprints the right-hand line --------------------------
describe("shared header period line", () => {
  const LONG = "Year end 2026/2027 (30 Sept 2027) · comparative: Year end 2025/2026 (30 Sept 2026)";
  function render(periodLine: string, crest = true) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const calls: { s: string; x: number; y: number; right: boolean; w: number }[] = [];
    const t = doc.text.bind(doc);
    (doc as any).text = (s: any, x: number, y: number, o?: any) => {
      calls.push({ s: String(s), x, y, right: o?.align === "right", w: doc.getTextWidth(String(s)) });
      return t(s, x, y, o);
    };
    // A 1x1 PNG stands in for the crest so the text block starts right of a 100pt crest.
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    const start = drawBrandHeader(doc, { identity: ID, crest: crest ? { dataUrl: png, format: "PNG" } : null, title: "Balance Sheet", periodLine, rightLine: "Generated: 23 Oct 2026", margin: 40 });
    return { calls, start };
  }
  for (const crest of [true, false]) it(`wraps beside "Generated" without overlap (crest ${crest ? "shown" : "omitted"})`, () => {
    const { calls, start } = render(LONG, crest);
    const right = calls.find((c) => c.right && c.s.startsWith("Generated"))!;
    const rightStart = right.x - right.w;
    const period = calls.filter((c) => !c.right && c.y >= 104 && c.y < HEADER_RULE_Y);
    expect(period.length).toBeGreaterThan(0);
    expect(period.map((c) => c.s).join(" ").replace(/\s+/g, " ")).toBe(LONG);
    for (const p of period) {
      expect(p.y).toBeLessThan(HEADER_RULE_Y - 4);
      if (Math.abs(p.y - right.y) < 1) expect(p.x + p.w).toBeLessThanOrEqual(rightStart - PERIOD_GAP + 0.5);
    }
    expect(start).toBe(148);
  });
  it("short period line stays on one line", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    expect(layoutPeriodLine(doc, "2025/26", 400, 90).lines).toEqual(["2025/26"]);
  });
});

// ---- 2. Bank Reconciliation: columns and headings ---------------------------------------------
const amt = (i: number) => (i % 3 === 0 ? `(£${(1763 + i * 1111).toLocaleString("en-GB")}.00)` : `£${(1763 + i * 97).toLocaleString("en-GB")}.00`);
const bankInput = (unpresented: number, remaining: number) => ({
  periodLine: "01 Oct 2026 – 31 Oct 2026",
  statementLabel: "October 2026",
  statementRows: [
    ["Bank statement closing balance", "", "£12,345.67"],
    ["Add: ledger receipts not on the statement (3)", "", "£1,763.00"],
    ["Less: ledger payments not on the statement (2)", "", "(£2,100.00)"],
    ["Adjusted balance", "", "£12,008.67"],
    ["1000 Bank nominal balance as at 31 Oct 2026", "", "£12,008.67"],
    ["BALANCED", "", "£0.00"],
  ],
  unpresentedRows: Array.from({ length: unpresented }, (_, i) => [`JE-${String(1200 + i).padStart(6, "0")}`, "12/10/2026", `Festive board payment ${i} — Bro. Example via BACS reference`, amt(i)]),
  remainingRows: Array.from({ length: remaining }, (_, i) => ["14/10/2026", `CARD PAYMENT TO EXAMPLE SUPPLIER LTD ${i}`, amt(i + 1)]),
});

describe("Bank Reconciliation PDF", () => {
  for (const [u, r] of [[3, 2], [5, 4], [8, 8], [26, 30], [40, 3]] as const) {
    it(`${u} unpresented / ${r} unreconciled: no heading is the last item on a page; no column narrower than its widest unwrapped value`, async () => {
      tables.length = 0;
      const doc = await buildBankRecPdf(bankInput(u, r), { identity: ID, crestUrl: null });
      const trace = reportLayoutTrace(doc);
      const heads = trace.filter((e) => e.kind === "heading");
      expect(heads.length).toBe(3);
      trace.forEach((e, i) => { if (e.kind === "heading") { expect(trace[i + 1]?.kind).toBe("table"); expect(trace[i + 1].page).toBe(e.page); } });
      const mine = tables.filter((t) => t.doc === doc);
      expect(mine.length).toBe(3);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      for (const t of mine) {
        expect(t.finalY).toBeLessThanOrEqual(t.pageH - 56);
        const n = t.cols.length;
        for (const c of t.body) {
          const isDescription = (n === 4 && c.col === 2) || (n === 3 && c.col === 0 && t.cols[0].width > 200) || (n === 3 && c.col === 1 && t.cols[1].width > 130);
          const col = t.cols.find((k) => k.idx === c.col)!;
          if (isDescription) {
            const longestWord = Math.max(0, ...c.raw.split(/\s+/).map((w) => doc.getTextWidth(w)));
            expect(longestWord + 10).toBeLessThanOrEqual(col.width + 0.5);
          } else {
            expect(c.text.length).toBe(1); // amounts, dates and doc numbers never wrap
            expect(doc.getTextWidth(c.raw) + 10).toBeLessThanOrEqual(col.width + 0.5);
          }
        }
      }
      expect(doc.output("arraybuffer").byteLength).toBeLessThan(200 * 1024);
    });
  }
  it("amount columns are right-aligned and at least 90pt", () => {
    expect(BANK_REC_COLUMNS.unpresented[3]).toEqual({ cellWidth: 90, halign: "right" });
    expect(BANK_REC_COLUMNS.remaining[2]).toEqual({ cellWidth: 90, halign: "right" });
    expect(BANK_REC_COLUMNS.statement[2]).toEqual({ cellWidth: 120, halign: "right" });
  });
});

// ---- 3. Other PDFs on the shared header ------------------------------------------------------
const charity = [{ id: "c1", name: "Example Charity" }, { id: "c2", name: "Another Charity With A Long Name" }] as any;
const collections = Array.from({ length: 20 }, (_, i) => ({ id: `k${i}`, collection_date: "2026-01-15", collection_type: ["charity_column", "raffle", "ad_hoc", "relief_chest", "other"][i % 5], net_amount: 100 + i })) as any;
const donations = Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, donation_date: "2026-02-10", charity_id: i % 2 ? "c1" : "c2", amount: 250 + i, match_funding_amount: i % 3 ? 0 : 50, purpose: "General support for the year" })) as any;
const flagged = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, name: `Bro. Member ${i}` }));
const summaryData = {
  lodgeName: "", lodgeTitle: "", generatedAt: "2026-10-23T10:00:00Z", execSummary: "Summary text. ".repeat(40),
  period: { start: "2025-10-01", end: "2026-09-30", label: "2025/26" }, previousPeriod: { start: "2024-10-01", end: "2025-09-30", label: "2024/25" },
  membership: { subscribing: 20, novice: 3, exempt: 1, pipeline: 2, initiated: 2, joined: 1, resigned: 1, excluded: 0, deceased: 0, net: 2 },
  mentoring: { inProgress: 3, avgCompletionPct: 60, completedThisYear: 1, overdueTotal: 4, overdueByMember: flagged(3), engagementRisk: flagged(2), initiations: 2, passings: 1, raisings: 1, exaltations: 0 },
  ritual: { totalPieces: 30, red: 4, redPct: 13, amber: 6, amberList: ["Piece A", "Piece B"], green: 20, greenPct: 67, newDeliveries: 5, firstDeliveriesInLodge: flagged(2) },
  loi: { sessions: 30, avgAttendance: 9, avgAttendancePct: 45, trend: "Up", lowAttenders: flagged(5) },
  workingGroups: { active: 5, assignedMembers: 15, assignedPct: 75, unassigned: flagged(5), activityCountByGroup: [{ group: "Group A", count: 3 }] },
  engagement: { avgTouchpointsPerNovice: 4, zeroTouchpoints: flagged(1), socialEvents: 3, lodgeVisits: 4, provincialEvents: 2 },
  royalArch: { eligible: 5, recommended: 2, exalted: 1, exaltedPrevious: 0, trend: "Steady" },
} as any;
const matrix = {
  members: [{ id: "m1", first_name: "A", last_name: "Member", full_name: "A Member" }],
  pieces: Array.from({ length: 30 }, (_, i) => ({ ritual_group: "first_degree", piece: `Piece ${i}` })),
  cells: new Map([["m1", new Map(Array.from({ length: 15 }, (_, i) => [`first_degree::Piece ${i}`, "delivered_lodge"]))]]),
} as any;
const profile = { full_name: "Bro. Example", first_name: "Example", last_name: "Member", preferred_name: null, title: "Bro.", initiation_date: "2025-01-10", passing_date: null, raising_date: null, royal_arch_date: null, ugle_reg_number: "123", proposer: "W Bro. A" };
const years = Array.from({ length: 9 }, (_, i) => 2025 + i);
const grid: any = Object.fromEntries(years.map((y) => [y, Object.fromEntries(POSITION_ORDER.map((p, i) => [p, { member: i % 3 ? { id: `m${i}`, full_name: `Bro. Officer ${i}` } : null, isOverride: false }]))]));
const projection = { years, grid, warnings: [{ kind: "vacant_feeder", position: POSITION_ORDER[0], year: 2026 }], consumedReady: [] } as any;

const builders: [string, (deps: any) => Promise<any>, [number, number]][] = [
  ["Charity annual report", (deps) => buildCharityAnnualReportPdf({ year: 2025, collections, donations, charities: charity, festival: null, stewardNotes: "Notes. ".repeat(60) }, deps), [595, 842]],
  ["Charity periodic report", (deps) => buildCharityPeriodicReportPdf({ title: "Spring", startDate: "2025-10-01", endDate: "2026-09-30", collections, donations, charities: charity, festival: null, stewardNotes: "Notes.", finalised: true }, deps), [595, 842]],
  ["Skills gap report", (deps) => buildGapReportPdf(matrix, deps), [595, 842]],
  ["Development summary report", (deps) => buildSummaryReportPdf({ data: summaryData, mentorStatement: "Statement. ".repeat(30) }, deps), [595, 842]],
  ["Member development record", (deps) => buildDevelopmentPdf({ profile, mentorName: "W Bro. Mentor", record: null, checklist: [], ritual: [], lodgeAppointments: Array.from({ length: 30 }, (_, i) => ({ lodge_year: 2000 + i, appointed_on: null, position_label: "Steward" })), externalAppointments: [] } as any, deps), [595, 842]],
  ["Working groups activity report", (deps) => buildWorkingGroupsActivityPdf(deps), [595, 842]],
  ["Officers projection", (deps) => buildOfficersProjectionPdf({ currentYear: 2025, projection, dupWarnings: [], membersById: {}, preparedBy: "Secretary" }, deps), [842, 595]],
];

describe("Charity, Development and Officers PDFs on the shared header", () => {
  for (const [name, build, size] of builders) {
    it(`${name}: crest network failure, timeout or blank setting still builds, without the image`, async () => {
      for (const deps of [
        { identity: ID, crestUrl: "https://x.test/crest.png", run: failRun() },
        { identity: ID, crestUrl: "https://x.test/crest.png", run: timeoutRun() },
        { identity: ID, crestUrl: null },
      ]) {
        const d = await build(deps);
        expect(d.getNumberOfPages()).toBeGreaterThan(0);
        expect(hasImage(d)).toBe(false);
      }
    });
    it(`${name}: page size as before, under 200 KB, tables clear of the footer`, async () => {
      tables.length = 0;
      const d = await build({ identity: ID, crestUrl: null });
      const ps = d.internal.pageSize;
      expect([Math.round(ps.getWidth()), Math.round(ps.getHeight())]).toEqual(size);
      expect(d.output("arraybuffer").byteLength).toBeLessThan(200 * 1024);
      for (const t of tables.filter((x) => x.doc === d)) expect(t.finalY).toBeLessThanOrEqual(t.pageH - 56);
    });
  }
});

// ---- 4. Accounts pack: every section heading starts on the same page as its table ---------------
import { buildAccountsPackPdf } from "@/lib/treasurer/accountsPackPdf";
describe("accounts pack headings travel with their tables", () => {
  const s = (n: number, k = 1) => ({ masonic_year: 2025, as_at: "2026-09-30", taken_at: "2026-10-05T10:00:00Z", income_expenditure: { income: 1, expenditure: 1, surplus: 0 }, balance_sheet: { assets: 1, liabilities: 1, net_assets: 0, fund_bf: 0, surplus: 0, total_funds: 0 }, trial_balance: { debit: 1, credit: 1 }, accounts: Array.from({ length: n }, (_, i) => ({ code: String(1000 + i * 100), name: `Account ${i}`, type: ["asset", "liability", "income", "expense"][i % 4], net: (i + 1) * 12345 * k })) });
  for (const n of [8, 16, 24, 40, 60]) it(`${n} accounts`, async () => {
    const doc = await buildAccountsPackPdf({ draft: true, snap: { ...s(n), comparative: s(n, 0.9) }, remarks: "Remarks.", round: null, certifiers: [] } as any, 2025, [], { identity: ID, crestUrl: null } as any);
    const trace = reportLayoutTrace(doc);
    expect(trace.filter((e) => e.kind === "heading").length).toBe(5);
    trace.forEach((e, i) => { if (e.kind === "heading") { expect(trace[i + 1]?.kind).toBe("table"); expect(trace[i + 1].page).toBe(e.page); } });
  });
});
