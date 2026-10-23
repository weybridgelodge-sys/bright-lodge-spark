import { loadDocIdentity, docTitle, docSubtitle, docFileName, docGroupName } from "@/lib/docIdentity";
import { masonicYearStartSync, masonicYearBoundsSync } from "@/lib/masonicYear";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawBrandFooter, drawBrandHeader, drawBrandSectionRule, HEADER_START_Y, loadPdfBrand, type PdfBrandDeps } from "@/lib/pdfBrand";
import { listAllReportItemsInYear, listGroups } from "@/lib/workingGroups";

// Mirrors supabase/functions/_shared/transactional-email-templates/_brand.ts
// so branded PDFs stay visually consistent with the transactional emails
// (almoner digest, poll-opened, visitor invitation, Lodge Visits invite).
const NAVY: [number, number, number] = [27, 42, 74];       // #1B2A4A
const GOLD: [number, number, number] = [201, 164, 50];     // #C9A432
const INK: [number, number, number] = [42, 42, 42];        // BRAND.body #2a2a2a
const MUTED: [number, number, number] = [102, 102, 102];   // BRAND.muted #666
const HAIRLINE: [number, number, number] = [232, 227, 211];// BRAND.hairline #e8e3d3
const PANEL: [number, number, number] = [250, 250, 247];   // BRAND.panel #fafaf7

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";


export function masonicYearWindow(now = new Date()) {
  const startYear = masonicYearStartSync(now);
  const { start, end } = masonicYearBoundsSync(startYear);
  return { start, end, label: `${startYear}–${startYear + 1}` };
}

export async function buildWorkingGroupsActivityPdf(deps: PdfBrandDeps = {}) {
  const { start, end, label } = masonicYearWindow();
  const [items, groups] = await Promise.all([listAllReportItemsInYear(start, end), listGroups()]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const { identity, crest } = await loadPdfBrand(deps);
  const ID = identity;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;


  // Shared brand header (Unit Setup crest, lodge name, sub-line, gold-dark title line).
  drawBrandHeader(doc, {
    identity, crest, margin,
    title: `Working Groups Activity Report — ${label}`,
    rightLine: `Generated: ${fmt(new Date().toISOString())}`,
  });
  let y = HEADER_START_Y;

  for (const g of groups) {
    if (y > pageH - 160) { doc.addPage(); y = margin; }
    drawBrandSectionRule(doc, y, g.name, margin);
    y += 28;

    doc.setTextColor(...MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
    const remitLines = doc.splitTextToSize(g.remit, pageW - margin * 2 - 8);
    doc.text(remitLines, margin + 4, y);
    y += remitLines.length * 11 + 6;

    const rows = items.filter((a) => a.working_group_id === g.id);
    if (rows.length === 0) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
      doc.text("No activity recorded for this Masonic year.", margin + 4, y); y += 18;
    } else {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Title", "Detail"]],
        body: rows.map((r) => [fmt(r.item_date), r.item_type.toUpperCase(), r.title, r.detail ?? ""]),
        margin: { top: margin, left: margin, right: margin, bottom: 60 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: HAIRLINE, lineWidth: 0.4 },
        headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
        alternateRowStyles: { fillColor: PANEL },
        columnStyles: { 1: { fontStyle: "bold", textColor: NAVY, cellWidth: 60 } },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }
  }

  drawBrandFooter(doc, identity, margin, { note: `${ID.lodgeName ? ID.lodgeName + " — " : ""}Working Groups Activity Report.` });
  return doc;
}
