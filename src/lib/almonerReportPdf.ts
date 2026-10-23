// Almoner's Report PDF on the shared white brand header/footer (src/lib/pdfBrand).
// Content, sections, columns and the confidentiality line are unchanged from the panel version.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadDocIdentity, type DocIdentity } from "@/lib/docIdentity";
import {
  createPdfRun, drawBrandFooter, drawBrandHeader, drawBrandSection, fetchCrestUrl,
  HEADER_START_Y, PRINT_GOLD, PRINT_INK, PRINT_MUTED, PRINT_NAVY,
} from "@/lib/pdfBrand";

export const ALMONER_MARGIN = 40;
/** Tables and text stay above this line (footer rule sits at pageH - 40). */
export const ALMONER_BOTTOM = 56;
export const ALMONER_CONFIDENTIAL = "Confidential — for use by the Almoner and Worshipful Master only.";

export type AlmonerPdfInput = {
  fromD: string;
  toD: string;
  adviceText: string;
  d: any;
  nameOf: (memberId: string | null | undefined) => string;
  lifeRows: { date: string; member: string; type: string; detail: string }[];
  fmt: (s: string | null | undefined) => string;
  stripEmoji: (s: string) => string;
};
export type AlmonerPdfDeps = { identity?: DocIdentity; crestUrl?: string | null; run?: ReturnType<typeof createPdfRun> };

export async function buildAlmonerReportPdf(i: AlmonerPdfInput, deps: AlmonerPdfDeps = {}): Promise<jsPDF> {
  const { fromD, toD, adviceText, d, nameOf, fmt, stripEmoji } = i;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = ALMONER_MARGIN;
  const [identity, crestUrl] = await Promise.all([
    deps.identity ? Promise.resolve(deps.identity) : loadDocIdentity(),
    deps.crestUrl !== undefined ? Promise.resolve(deps.crestUrl) : fetchCrestUrl(),
  ]);
  const crest = await (deps.run ?? createPdfRun()).crest(crestUrl).catch(() => null);

  let y = drawBrandHeader(doc, {
    identity, crest, margin,
    title: "Almoner's Report",
    periodLine: `Period: ${fmt(fromD)} — ${fmt(toD)}`,
    rightLine: `Generated: ${fmt(new Date().toISOString())}`,
  });
  if (y < HEADER_START_Y) y = HEADER_START_Y;

  const section = (title: string, count?: number) => {
    if (y > pageH - 100) { doc.addPage(); y = margin; }
    y = drawBrandSection(doc, y, `${title}${count != null ? `  (${count})` : ""}`, margin);
    doc.setDrawColor(...PRINT_GOLD); doc.setLineWidth(0.6);
    doc.line(margin, y - 6, pageW - margin, y - 6); // thin gold rule under the heading
    y += 4;
  };
  const empty = (msg: string) => {
    doc.setTextColor(...PRINT_MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(msg, margin + 4, y);
    y += 18;
  };
  const table = (head: string[][], body: any[][]) => {
    const tableW = pageW - margin * 2;
    autoTable(doc, {
      head, body, startY: y,
      margin: { top: margin, bottom: ALMONER_BOTTOM, left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: PRINT_INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: PRINT_GOLD, textColor: PRINT_NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      // Two-column tables: fixed 40% first column so short headings never wrap.
      columnStyles: head[0].length === 2 ? { 0: { cellWidth: tableW * 0.4 } } : undefined,
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  };

  section("1. Members of Concern", d.concern.length);
  if (d.concern.length === 0) empty("No members currently flagged amber or red.");
  else table([["Member", "Status", "Notes"]],
    d.concern.map((s: any) => [nameOf(s.member_id), s.status.toUpperCase(), s.notes || ""]));

  section("2. Welfare Contacts", d.logRows.length);
  if (d.logRows.length === 0) empty("No logged contacts in this period.");
  else table([["Date", "Member", "Type / Nature", "Notes"]],
    d.logRows.map((l: any) => [fmt(l.contact_date), nameOf(l.member_id), `${l.contact_type} / ${l.contact_nature}`, l.notes || ""]));

  section("3. Correspondence", d.corrRows.length);
  if (d.corrRows.length === 0) empty("No correspondence logged.");
  else table([["Date", "Dir.", "Member", "Method", "Subject"]],
    d.corrRows.map((c: any) => [
      fmt(c.correspondence_date),
      c.direction === "outgoing" ? "Out" : "In",
      c.member_id ? nameOf(c.member_id) : "general",
      c.method, c.subject,
    ]));

  section("4. Active MCF / Provincial Referrals", d.activeRefs.length);
  if (d.activeRefs.length === 0) empty("No active referrals.");
  else table([["Member", "Type", "Status", "Referred", "Summary"]],
    d.activeRefs.map((r: any) => [nameOf(r.member_id), r.referral_type, r.status, fmt(r.referral_date), r.summary || ""]));

  section("5. Known Absences", d.absRows.length);
  if (d.absRows.length === 0) empty("No absences recorded for this period.");
  else table([["Member", "Reason", "From", "To", "Notes"]],
    d.absRows.map((a: any) => [nameOf(a.member_id), a.reason, fmt(a.period_start), fmt(a.period_end), a.notes || ""]));

  const lifeRows = i.lifeRows.map((e) => [e.date, e.member, e.type, e.detail]);
  section("6. Life Events — next 3 months", lifeRows.length);
  if (lifeRows.length === 0) empty("Nothing in the next 3 months.");
  else table([["Date", "Member", "Event", "Detail"]], lifeRows);

  const wl: { name: string; text: string }[] = d.widows ?? [];
  if (wl.length) {
    section("7. Widows & Dependants", wl.length);
    table([["Widow", "Update"]], wl.map((w) => [stripEmoji(w.name), stripEmoji(w.text)]));
  }

  const cleanAdvice = stripEmoji(adviceText).trim();
  if (cleanAdvice) {
    section(`${wl.length ? 8 : 7}. Almoner's Advice & Notes`);
    y += 8; // clear the heading rule
    doc.setTextColor(...PRINT_INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text = doc.splitTextToSize(cleanAdvice, pageW - margin * 2 - 8);
    for (const line of text) {
      if (y > pageH - margin - 40) { doc.addPage(); y = margin; }
      doc.text(line, margin + 4, y);
      y += 14;
    }
  }

  drawBrandFooter(doc, identity, margin);
  // Confidentiality line kept on every page, below the shared footer line.
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont("times", "italic"); doc.setFontSize(8); doc.setTextColor(...PRINT_MUTED);
    doc.text(ALMONER_CONFIDENTIAL, pageW / 2, pageH - 16, { align: "center" });
  }
  return doc;
}
