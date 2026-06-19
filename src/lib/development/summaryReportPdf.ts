import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/weybridge-logo-white.png.asset.json";
import type { SummaryReportData, FlaggedMember } from "./summaryReport";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const flagged = (items: FlaggedMember[], max = 20) => {
  if (items.length === 0) return "—";
  const shown = items.slice(0, max).map((i) => (i.detail ? `${i.name} (${i.detail})` : i.name));
  if (items.length > max) shown.push(`…and ${items.length - max} more`);
  return shown.join(", ");
};

export async function buildSummaryReportPdf(args: {
  data: SummaryReportData;
  mentorStatement: string;
}) {
  const { data, mentorStatement } = args;
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

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 110, pageW, 3, "F");
  if (logoData) { try { doc.addImage(logoData, "PNG", margin, 22, 66, 66); } catch { /* ignore */ } }
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("Weybridge Lodge No. 6787", margin + 80, 50);
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.text("Lodge Development Summary Report", margin + 80, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 235);
  doc.text(`${fmt(data.period.start)} – ${fmt(data.period.end)} · ${data.period.label}`, margin + 80, 90);
  doc.text(`Generated: ${fmt(data.generatedAt)}`, pageW - margin, 90, { align: "right" });

  let y = 130;

  // Executive summary block — wrap text first using the active font so the
  // measurement matches the rendered glyphs (prevents the last word being clipped).
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const execInnerPad = 14;
  const execTextWidth = pageW - margin * 2 - execInnerPad * 2;
  const execLines = doc.splitTextToSize(data.execSummary, execTextWidth);
  const execLineH = 13;
  const execH = 26 + execLines.length * execLineH + 10;
  doc.setFillColor(250, 247, 238);
  doc.rect(margin, y, pageW - margin * 2, execH, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("EXECUTIVE SUMMARY", margin + execInnerPad, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(execLines, margin + execInnerPad, y + 32, { lineHeightFactor: 1.3, maxWidth: execTextWidth });
  y += execH + 16;

  const section = (title: string) => {
    if (y > pageH - 100) { doc.addPage(); y = margin; }
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setTextColor(...GOLD);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 10, y + 15);
    y += 32;
  };
  const table = (head: string[][], body: any[][]) => {
    autoTable(doc, {
      head, body, startY: y,
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
      columnStyles: { 0: { cellWidth: 220 } },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  };
  const para = (label: string, text: string) => {
    if (y > pageH - 80) { doc.addPage(); y = margin; }
    doc.setFont("times", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
    doc.text(label, margin, y); y += 12;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 11 + 8;
  };

  // 1. Membership
  section("1. Membership Overview");
  table(
    [["Metric", "Value"]],
    [
      ["Active subscribing members", String(data.membership.subscribing)],
      ["In formal mentoring (novice)", String(data.membership.novice)],
      ["Exempt from mentoring", String(data.membership.exempt)],
      ["Pipeline (candidates)", String(data.membership.pipeline)],
      ["Initiated in period", String(data.membership.initiated)],
      ["Joined in period", String(data.membership.joined)],
      ["Resigned", String(data.membership.resigned)],
      ["Excluded", String(data.membership.excluded)],
      ["Deceased", String(data.membership.deceased)],
      ["Net movement", `${data.membership.net >= 0 ? "+" : ""}${data.membership.net}`],
    ],
  );

  // 2. Mentoring
  section("2. Mentoring Progress");
  table(
    [["Metric", "Value"]],
    [
      ["Checklists in progress", String(data.mentoring.inProgress)],
      ["Average checklist completion", `${data.mentoring.avgCompletionPct}%`],
      ["Completed formal mentoring", String(data.mentoring.completedThisYear)],
      ["Overdue checklist items (total)", String(data.mentoring.overdueTotal)],
      ["Members with overdue items", String(data.mentoring.overdueByMember.length)],
      ["Engagement risk (>6-week gap)", String(data.mentoring.engagementRisk.length)],
      ["Initiations / Passings / Raisings", `${data.mentoring.initiations} / ${data.mentoring.passings} / ${data.mentoring.raisings}`],
    ],
  );
  if (data.mentoring.overdueByMember.length) para("Overdue by member", flagged(data.mentoring.overdueByMember));
  if (data.mentoring.engagementRisk.length) para("Engagement-risk members", flagged(data.mentoring.engagementRisk));

  // 3. Ritual
  section("3. Ritual Development");
  table(
    [["Metric", "Value"]],
    [
      ["Total pieces tracked", String(data.ritual.totalPieces)],
      ["Red — no qualified member", `${data.ritual.red} (${data.ritual.redPct}%)`],
      ["Amber — single point of failure", String(data.ritual.amber)],
      ["Green — two or more qualified", `${data.ritual.green} (${data.ritual.greenPct}%)`],
      ["New deliveries (LoI + Lodge) in period", String(data.ritual.newDeliveries)],
      ["First-time Lodge deliveries", String(data.ritual.firstDeliveriesInLodge.length)],
    ],
  );
  if (data.ritual.amberList.length) para("Amber pieces", data.ritual.amberList.slice(0, 30).join("; "));
  if (data.ritual.firstDeliveriesInLodge.length) para("First-time Lodge deliveries", flagged(data.ritual.firstDeliveriesInLodge));

  // 4. LoI
  section("4. Lodge of Instruction");
  table(
    [["Metric", "Value"]],
    [
      ["Sessions held", String(data.loi.sessions)],
      ["Average attendance", String(data.loi.avgAttendance)],
      ["Average attendance %", `${data.loi.avgAttendancePct}%`],
      ["Trend vs previous period", data.loi.trend],
      ["Members <50% attendance", String(data.loi.lowAttenders.length)],
    ],
  );
  if (data.loi.lowAttenders.length) para("Below 50% attendance", flagged(data.loi.lowAttenders));

  // 5. Working Groups
  section("5. Working Groups");
  table(
    [["Metric", "Value"]],
    [
      ["Active groups", String(data.workingGroups.active)],
      ["Members assigned", `${data.workingGroups.assignedMembers} (${data.workingGroups.assignedPct}%)`],
      ["Unassigned members", String(data.workingGroups.unassigned.length)],
    ],
  );
  if (data.workingGroups.activityCountByGroup.length) {
    table([["Group", "Activities in period"]], data.workingGroups.activityCountByGroup.map((g) => [g.group, String(g.count)]));
  }
  if (data.workingGroups.unassigned.length) para("Unassigned members", flagged(data.workingGroups.unassigned));

  // 6. Engagement
  section("6. Engagement Summary");
  table(
    [["Metric", "Value"]],
    [
      ["Average touchpoints per novice", String(data.engagement.avgTouchpointsPerNovice)],
      ["Novices with zero touchpoints", String(data.engagement.zeroTouchpoints.length)],
      ["Social events", String(data.engagement.socialEvents)],
      ["Lodge visits", String(data.engagement.lodgeVisits)],
      ["Provincial events", String(data.engagement.provincialEvents)],
    ],
  );
  if (data.engagement.zeroTouchpoints.length) para("Zero-touchpoint novices", flagged(data.engagement.zeroTouchpoints));

  // 7. Royal Arch
  section("7. Royal Arch Conversion");
  table(
    [["Metric", "Value"]],
    [
      ["Light Blues eligible", String(data.royalArch.eligible)],
      ["Recommended for Exaltation", String(data.royalArch.recommended)],
      ["Exalted in period", String(data.royalArch.exalted)],
      ["Exalted in previous period", String(data.royalArch.exaltedPrevious)],
      ["Trend", data.royalArch.trend],
    ],
  );

  // 8. Mentor statement
  section("8. Mentor's Summary Statement");
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const stmt = mentorStatement?.trim() || "(no statement recorded)";
  const stmtLines = doc.splitTextToSize(stmt, pageW - margin * 2);
  if (y + stmtLines.length * 12 > pageH - 60) { doc.addPage(); y = margin; }
  doc.text(stmtLines, margin, y);
  y += stmtLines.length * 12 + 8;

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Confidential — Lodge Development Summary Report. For Mentor, WM, Secretary, and the Provincial Visiting Officer.", margin, pageH - 22);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
    doc.setTextColor(...NAVY);
    doc.setFont("times", "bold");
    doc.text("Weybridge Lodge No. 6787", pageW / 2, pageH - 22, { align: "center" });
  }
  return doc;
}
