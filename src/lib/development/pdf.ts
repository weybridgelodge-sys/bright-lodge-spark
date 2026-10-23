import { loadDocIdentity, docTitle, docSubtitle, docFileName, docGroupName } from "@/lib/docIdentity";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawBrandFooter, drawBrandHeader, drawBrandSectionRule, HEADER_START_Y, loadPdfBrand, type PdfBrandDeps } from "@/lib/pdfBrand";
import { CHECKLIST_STAGES, RITUAL_GROUPS, STATUS_LABELS, rehearsalDisplayLabel } from "./catalogues";
import type {
  ChecklistItem,
  RitualRow,
  ExternalAppointment,
  DevelopmentRecord,
} from "./queries";

const NAVY: [number, number, number] = [27, 42, 74];
const GOLD: [number, number, number] = [201, 164, 50];
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

type ProfileLite = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  title: string | null;
  initiation_date: string | null;
  passing_date: string | null;
  raising_date: string | null;
  royal_arch_date: string | null;
  ugle_reg_number: string | null;
  proposer: string | null;
};

type LodgeAppointment = {
  lodge_year: number;
  appointed_on: string | null;
  position_label: string;
};

const displayName = (p?: { first_name?: string | null; last_name?: string | null; full_name?: string | null; preferred_name?: string | null } | null) => {
  if (!p) return "—";
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};

export async function buildDevelopmentPdf(args: {
  profile: ProfileLite;
  mentorName: string | null;
  record: DevelopmentRecord | null;
  checklist: ChecklistItem[];
  ritual: RitualRow[];
  lodgeAppointments: LodgeAppointment[];
  externalAppointments: ExternalAppointment[];
}, deps: PdfBrandDeps = {}) {
  const { profile, mentorName, record, checklist, ritual, lodgeAppointments, externalAppointments } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const { identity, crest } = await loadPdfBrand(deps);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;


  drawBrandHeader(doc, {
    identity, crest, margin,
    title: "Member Development Record",
    periodLine: displayName(profile),
    rightLine: `Generated: ${fmt(new Date().toISOString())}`,
  });

  let y = HEADER_START_Y;
  const section = (title: string) => {
    if (y > pageH - 140) { doc.addPage(); y = margin; }
    drawBrandSectionRule(doc, y, title, margin);
    y += 32;
  };
  const table = (head: string[][], body: any[][]) => {
    autoTable(doc, {
      head, body, startY: y,
      margin: { top: margin, left: margin, right: margin, bottom: 60 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
      headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 247, 238] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  };

  // 1. Profile
  section("1. Member Profile");
  table(
    [["Field", "Value"]],
    [
      ["Name", displayName(profile)],
      ["Initiation", fmt(profile.initiation_date)],
      ["Passing", fmt(profile.passing_date)],
      ["Raising", fmt(profile.raising_date)],
      ["Royal Arch", fmt(profile.royal_arch_date)],
      ["Grand Lodge No.", profile.ugle_reg_number || "—"],
      ["Proposer", profile.proposer || "—"],
      ["Assigned Mentor", mentorName || "—"],
      ["Previous Masonic Experience", record?.previous_masonic_experience || "—"],
    ],
  );

  // 2. Mentoring Checklist
  section("2. Mentoring Checklist");
  if (record?.mentoring_exempt) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    const reason = record.exemption_reason === "senior_member" ? "Senior Member"
                 : record.exemption_reason === "joining_member" ? "Joining Member" : "Exempt";
    doc.text(`${reason} — structured checklist not applicable.${record.exemption_note ? " " + record.exemption_note : ""}`, margin + 4, y);
    y += 18;
  } else {
    for (const stage of CHECKLIST_STAGES) {
      const rows = checklist.filter((c) => c.stage === stage);
      if (rows.length === 0) continue;
      if (y > pageH - 120) { doc.addPage(); y = margin; }
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(stage, margin, y);
      y += 10;
      table(
        [["Topic", "Target", "Completed", "Status", "Notes"]],
        rows.map((r) => [r.topic, fmt(r.target_date), fmt(r.completed_date), STATUS_LABELS[r.status] ?? r.status, r.mentor_notes || ""]),
      );
    }
  }

  // 3. Ritual
  section("3. Ritual Learning & Delivery");
  for (const group of RITUAL_GROUPS) {
    const rows = ritual.filter((r) => r.ritual_group === group);
    if (rows.length === 0) continue;
    if (y > pageH - 120) { doc.addPage(); y = margin; }
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(rehearsalDisplayLabel(group), margin, y);
    y += 10;
    table(
      [["Ritual / Part", "Learned", "Assessed", "Rehearsal", "In Lodge", "Notes"]],
      rows.map((r) => [r.piece, fmt(r.date_first_learned), fmt(r.date_assessed), fmt(r.date_delivered_loi), fmt(r.date_delivered_lodge), r.notes || ""]),
    );
  }

  // 4. Offices
  section("4. Offices & Appointments");
  const lodgeRows = lodgeAppointments.map((a) => [a.position_label, String(a.lodge_year), fmt(a.appointed_on), "—", "Lodge", ""]);
  const extRows = externalAppointments.map((a) => [a.office, a.masonic_year || "—", fmt(a.date_appointed), fmt(a.date_installed), a.level.toUpperCase(), a.notes || ""]);
  const allRows = [...lodgeRows, ...extRows];
  if (allRows.length === 0) {
    doc.setTextColor(...MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.text("No offices or appointments recorded yet.", margin + 4, y); y += 18;
  } else {
    table([["Office / Appointment", "Masonic Year", "Appointed", "Installed", "Level", "Notes"]], allRows);
  }

  drawBrandFooter(doc, identity, margin, { note: "Confidential — Member Development Record. For use by the Brother, his Mentor, and the Worshipful Master." });
  return doc;
}
