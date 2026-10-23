import { loadDocIdentity, docTitle, docSubtitle, docFileName, docGroupName } from "@/lib/docIdentity";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawBrandFooter, drawBrandHeader, drawBrandSectionRule, HEADER_START_Y, loadPdfBrand, type PdfBrandDeps } from "@/lib/pdfBrand";
import { pieceRisk, type SkillsMatrix, displayMember, piecePeople } from "./skillsMatrix";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

export async function buildGapReportPdf(matrix: SkillsMatrix, deps: PdfBrandDeps = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const { identity, crest } = await loadPdfBrand(deps);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;


  drawBrandHeader(doc, {
    identity, crest, margin,
    title: "Lodge Skills Gap Report",
    rightLine: `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
  });

  let y = HEADER_START_Y;
  const section = (title: string, count: number, tone: [number, number, number]) => {
    if (y > pageH - 140) { doc.addPage(); y = margin; }
    drawBrandSectionRule(doc, y, `${title} (${count})`, margin);
    doc.setFillColor(...tone); doc.rect(pageW - margin - 10, y + 7, 8, 8, "F");
    y += 32;
  };

  const red: { ritual_group: string; piece: string }[] = [];
  const amber: { ritual_group: string; piece: string; holder: string }[] = [];
  for (const p of matrix.pieces) {
    const r = pieceRisk(matrix, p.ritual_group, p.piece);
    if (r === "red") red.push({ ritual_group: p.ritual_group, piece: p.piece });
    else if (r === "amber") {
      const { delivered } = piecePeople(matrix, p.ritual_group, p.piece);
      amber.push({ ritual_group: p.ritual_group, piece: p.piece, holder: delivered[0] ? displayMember(delivered[0]) : "—" });
    }
  }

  section("Red — no qualified member", red.length, [220, 80, 80]);
  if (red.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text("No red gaps. Every ritual piece has at least one delivered member.", margin + 4, y); y += 18;
  } else {
    autoTable(doc, {
      startY: y, head: [["Group", "Ritual Piece"]],
      body: red.map((p) => [p.ritual_group, p.piece]),
      margin: { top: margin, left: margin, right: margin, bottom: 60 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 240, 240] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  section("Amber — single point of failure", amber.length, [220, 170, 60]);
  if (amber.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text("No amber gaps.", margin + 4, y); y += 18;
  } else {
    autoTable(doc, {
      startY: y, head: [["Group", "Ritual Piece", "Sole qualified member"]],
      body: amber.map((p) => [p.ritual_group, p.piece, p.holder]),
      margin: { top: margin, left: margin, right: margin, bottom: 60 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 248, 232] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  drawBrandFooter(doc, identity, margin, { note: "Confidential — Director of Ceremonies / Worshipful Master only." });
  return doc;
}
