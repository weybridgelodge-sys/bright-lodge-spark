import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/weybridge-logo-navy-transparent.png.asset.json";
import { listAllActivitiesInYear, listGroups } from "@/lib/workingGroups";

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

// Masonic year runs 3rd Wednesday in October → day before 3rd Wednesday in October.
function thirdWednesdayInOctober(year: number): Date {
  const dt = new Date(year, 9, 15);
  while (dt.getDay() !== 3) dt.setDate(dt.getDate() + 1);
  return new Date(Date.UTC(year, 9, dt.getDate()));
}

export function masonicYearWindow(now = new Date()) {
  const startYear = now >= thirdWednesdayInOctober(now.getFullYear()) ? now.getFullYear() : now.getFullYear() - 1;
  const start = thirdWednesdayInOctober(startYear);
  const end = thirdWednesdayInOctober(startYear + 1);
  end.setDate(end.getDate() - 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), label: `${startYear}–${startYear + 1}` };
}

export async function buildWorkingGroupsActivityPdf() {
  const { start, end, label } = masonicYearWindow();
  const [activities, groups] = await Promise.all([listAllActivitiesInYear(start, end), listGroups()]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  let logoData: string | null = null;
  try {
    const res = await fetch(logoAsset.url);
    const blob = await res.blob();
    logoData = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch { /* ignore */ }

  // Branded header: white background, centered navy crest, navy title,
  // gold "No. 6787 — Province of Surrey" subtitle, gold hairline divider.
  const crestSize = 72;
  const crestX = (pageW - crestSize) / 2;
  const crestY = 32;
  if (logoData) { try { doc.addImage(logoData, "PNG", crestX, crestY, crestSize, crestSize); } catch {} }

  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("Weybridge Lodge", pageW / 2, crestY + crestSize + 24, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("NO. 6787  —  PROVINCE OF SURREY", pageW / 2, crestY + crestSize + 40, {
    align: "center",
    charSpace: 2,
  });

  const dividerY = crestY + crestSize + 54;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(margin, dividerY, pageW - margin, dividerY);

  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(`Working Groups Activity Report — ${label}`, pageW / 2, dividerY + 22, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Generated: ${fmt(new Date().toISOString())}`, pageW / 2, dividerY + 36, { align: "center" });

  let y = dividerY + 60;

  for (const g of groups) {
    if (y > pageH - 120) { doc.addPage(); y = margin; }
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setTextColor(...GOLD); doc.setFont("times", "bold"); doc.setFontSize(11);
    doc.text(g.name, margin + 10, y + 15);
    y += 28;

    doc.setTextColor(...MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
    const remitLines = doc.splitTextToSize(g.remit, pageW - margin * 2 - 8);
    doc.text(remitLines, margin + 4, y);
    y += remitLines.length * 11 + 6;

    const rows = activities.filter((a) => a.working_group_id === g.id);
    if (rows.length === 0) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
      doc.text("No activity recorded for this Masonic year.", margin + 4, y); y += 18;
    } else {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Title", "Notes"]],
        body: rows.map((r) => [fmt(r.activity_date), r.kind, r.title, r.notes ?? ""]),
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: HAIRLINE, lineWidth: 0.4 },
        headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
        alternateRowStyles: { fillColor: PANEL },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.6);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("Weybridge Lodge — Working Groups Activity Report.", margin, pageH - 22);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
    doc.setTextColor(...NAVY); doc.setFont("times", "bold");
    doc.text("Weybridge Lodge No. 6787", pageW / 2, pageH - 22, { align: "center" });
  }
  return doc;
}
