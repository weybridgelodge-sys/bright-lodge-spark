import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/weybridge-logo-no-bg.png.asset.json";
import { pieceRisk, type SkillsMatrix, displayMember, piecePeople } from "./skillsMatrix";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

export async function buildGapReportPdf(matrix: SkillsMatrix) {
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
  doc.text("Lodge Skills Gap Report", margin + 80, 72);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(230, 230, 235);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`, pageW - margin, 90, { align: "right" });

  let y = 140;
  const section = (title: string, count: number, tone: [number, number, number]) => {
    if (y > pageH - 100) { doc.addPage(); y = margin; }
    doc.setFillColor(...NAVY); doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setTextColor(...GOLD); doc.setFont("times", "bold"); doc.setFontSize(11);
    doc.text(`${title} (${count})`, margin + 10, y + 15);
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
      margin: { left: margin, right: margin },
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
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 248, 232] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.6);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont("times", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("Confidential — Director of Ceremonies / Worshipful Master only.", margin, pageH - 22);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
    doc.setTextColor(...NAVY); doc.setFont("times", "bold");
    doc.text("Weybridge Lodge No. 6787", pageW / 2, pageH - 22, { align: "center" });
  }
  return doc;
}
