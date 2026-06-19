import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/weybridge-logo-navy.png.asset.json";
import { listAllActivitiesInYear, listGroups } from "@/lib/workingGroups";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Masonic year starts 1 October.
export function masonicYearWindow(now = new Date()) {
  const y = now.getFullYear();
  const isAfterOct = now.getMonth() >= 9; // Oct = 9
  const startYear = isAfterOct ? y : y - 1;
  return { start: `${startYear}-10-01`, end: `${startYear + 1}-09-30`, label: `${startYear}–${startYear + 1}` };
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

  doc.setFillColor(...NAVY); doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(...GOLD); doc.rect(0, 110, pageW, 3, "F");
  if (logoData) { try { doc.addImage(logoData, "PNG", margin, 22, 66, 66); } catch {} }
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(20);
  doc.text("Weybridge Lodge No. 6787", margin + 80, 50);
  doc.setFont("times", "italic"); doc.setFontSize(13); doc.setTextColor(...GOLD);
  doc.text(`Working Groups Activity Report — ${label}`, margin + 80, 72);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(230, 230, 235);
  doc.text(`Generated: ${fmt(new Date().toISOString())}`, pageW - margin, 90, { align: "right" });

  let y = 140;

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
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
        headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 238] },
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
    doc.setFont("times", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("Weybridge Lodge — Working Groups Activity Report.", margin, pageH - 22);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
    doc.setTextColor(...NAVY); doc.setFont("times", "bold");
    doc.text("Weybridge Lodge No. 6787", pageW / 2, pageH - 22, { align: "center" });
  }
  return doc;
}
