// Progressive Officers Projection PDF (A4 landscape) on the shared brand header/footer (src/lib/pdfBrand).
// Projection figures are computed by OfficersTracker; this file only lays them out.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawBrandFooter, drawBrandHeader, HEADER_START_Y, loadPdfBrand, type PdfBrandDeps } from "@/lib/pdfBrand";
import { POSITION_ORDER, POSITION_LABELS, formatMasonicYear, computeProjection, detectDuplicateInitiations } from "@/lib/officersProgression";

export type OfficersProjectionPdfInput = {
  currentYear: number;
  projection: ReturnType<typeof computeProjection>;
  dupWarnings: ReturnType<typeof detectDuplicateInitiations>;
  membersById: Record<string, { full_name?: string | null } | undefined>;
  preparedBy: string;
};

export async function buildOfficersProjectionPdf(input: OfficersProjectionPdfInput, deps: PdfBrandDeps = {}) {
  const { currentYear, projection, dupWarnings, membersById, preparedBy } = input;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const { identity, crest } = await loadPdfBrand(deps);
  drawBrandHeader(doc, {
    identity, crest, margin,
    title: "Progressive Officers Projection",
    periodLine: `Generated ${new Date().toLocaleDateString("en-GB")} · Prepared by ${preparedBy}`,
  });

  // ----- Summary banner -----
  const cyGrid = projection.grid[currentYear];
  const inLine = POSITION_ORDER.filter((p) => cyGrid[p].member).length;
  const vacantFeeders = POSITION_ORDER.filter((p) => !cyGrid[p].member).length;
  const jwMemberId = cyGrid["junior_warden"].member?.id;
  let jwChairYear = "—";
  if (jwMemberId) {
    const found = projection.years.find(
      (y) => projection.grid[y]["worshipful_master"].member?.id === jwMemberId
    );
    jwChairYear = found ? formatMasonicYear(found) : "Not projected";
  }

  const bannerY = HEADER_START_Y;
  const bannerH = 56;
  const bannerW = pageW - margin * 2;
  doc.setFillColor(27, 42, 74);
  doc.roundedRect(margin, bannerY, bannerW, bannerH, 4, 4, "F");
  const colW = bannerW / 3;
  const stats: [string, string][] = [
    [String(inLine), "Officers in progressive line"],
    [String(vacantFeeders), "Vacant feeder positions"],
    [jwChairYear, "JW projected to Chair"],
  ];
  stats.forEach(([val, label], i) => {
    const cx = margin + colW * i + colW / 2;
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(201, 164, 50);
    doc.text(val, cx, bannerY + 26, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(240, 235, 220);
    doc.text(label, cx, bannerY + 44, { align: "center" });
  });

  const head = [["Office", ...projection.years.map((y) => formatMasonicYear(y))]];
  const body = POSITION_ORDER.map((pos) => {
    const row: string[] = [POSITION_LABELS[pos]];
    for (const y of projection.years) {
      const cell = projection.grid[y][pos];
      const name = cell.member?.full_name ?? "VACANT";
      const tag = cell.isOverride ? `\n(override: ${cell.overrideReason ?? "—"})` : "";
      row.push(`${name}${tag}`);
    }
    return row;
  });

  autoTable(doc, {
    startY: bannerY + bannerH + 14,
    head,
    body,
    theme: "grid",
    styles: { font: "times", fontSize: 9, cellPadding: 6, textColor: [30, 30, 30] },
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50], halign: "center" },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 240, 225] } },
    margin: { top: margin, left: margin, right: margin, bottom: 60 },
  });

  let y = (doc as any).lastAutoTable.finalY + 20;
  if (projection.warnings.length || dupWarnings.length) {
  // Keep the "Warnings" heading with its first lines.
  if (y + 40 > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setTextColor(180, 80, 0);
    doc.text("Warnings", 40, y);
    y += 14;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const all = [
      ...projection.warnings.map((w) =>
        w.kind === "vacant_feeder"
          ? `Vacant office: ${POSITION_LABELS[w.position]} in ${w.year}`
          : w.kind === "gap"
            ? `Gap in projection: ${POSITION_LABELS[w.position]} in ${w.year}`
            : ""
      ),
      ...dupWarnings.map((w) =>
        w.kind === "duplicate_initiation"
          ? `Shared initiation date ${w.date}: ${w.memberIds.map((id) => membersById[id]?.full_name ?? "—").join(", ")} — set precedence manually.`
          : ""
      ),
    ].filter(Boolean);
    for (const line of all) {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = margin; }
      doc.text(`• ${line}`, 50, y);
      y += 12;
    }
  }


  drawBrandFooter(doc, identity, margin);
  return doc;
}
