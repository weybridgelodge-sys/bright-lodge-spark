import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type KpiBundle,
  snapshot,
  movement,
  uglePortal,
  raConversion,
  milestones,
  officersHealth,
  pipeline,
  fullName,
  currentMasonicYear,
} from "./kpis";

const LODGE = "Weybridge Lodge No. 6787";

function header(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(LODGE, 14, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")}`, 14, 25);
}

export function exportVoReport(bundle: KpiBundle) {
  const doc = new jsPDF();
  const s = snapshot(bundle.members);
  const mv = movement(bundle.members);
  const ra = uglePortal(bundle.members);

  header(doc, "Membership Snapshot — Visiting Officer Report");

  autoTable(doc, {
    startY: 32,
    head: [["Membership Snapshot", ""]],
    body: [
      ["Subscribing members", String(s.subscribingCount)],
      ["Honorary members", String(s.honoraryCount)],
      ["Total roll", String(s.totalCount)],
      ["Average age", s.averageAge != null ? `${s.averageAge}` : "—"],
      ["Royal Arch %", `${s.royalArchPct}%`],
      ["Light Blues", String(s.lightBlueCount)],
      [
        "Date of last Initiation",
        s.lastInitiation
          ? `${new Date(s.lastInitiation.date).toLocaleDateString("en-GB")}${
              s.lastInitiation.count > 1 ? ` (${s.lastInitiation.label})` : ""
            }`
          : "—",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    head: [["Movement (rolling 12 months)", ""]],
    body: [
      ["Initiated", String(mv.initiated.length)],
      ["Joined", String(mv.joined.length)],
      ["Resigned", String(mv.resigned.length)],
      ["Excluded", String(mv.excluded.length)],
      ["Deceased", String(mv.deceased.length)],
      ["Year Out", String(mv.yearOut.length)],
      ["Net movement", String(mv.net)],
    ],
    theme: "grid",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    head: [["UGLE Portal registration (Active subscribing)", ""]],
    body: [
      ["Registered", `${ra.registeredCount} / ${ra.totalActive}`],
      ["% registered", `${ra.pct}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  doc.save(`vo-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportFullKpi(bundle: KpiBundle) {
  const doc = new jsPDF();
  const s = snapshot(bundle.members);
  const mv = movement(bundle.members);
  const ra = uglePortal(bundle.members);
  const conv = raConversion(bundle.members);
  const ms = milestones(bundle.members, bundle.wmTerms);
  const oh = officersHealth(bundle);
  const pl = pipeline(bundle.members);

  header(doc, `Full KPI Summary — Masonic Year ${currentMasonicYear()}/${currentMasonicYear() + 1}`);

  autoTable(doc, {
    startY: 32,
    head: [["1. Snapshot", "Value"]],
    body: [
      ["Subscribing", String(s.subscribingCount)],
      ["Honorary", String(s.honoraryCount)],
      ["Average age", s.averageAge != null ? `${s.averageAge}` : "—"],
      ["Royal Arch %", `${s.royalArchPct}%`],
      ["Light Blues", String(s.lightBlueCount)],
      ...s.ageBands.map((b) => [`Aged ${b.label}`, String(b.count)] as [string, string]),
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    head: [["2. Movement (12mo)", "Count"]],
    body: [
      ["Initiated", String(mv.initiated.length)],
      ["Joined", String(mv.joined.length)],
      ["Resigned", String(mv.resigned.length)],
      ["Excluded", String(mv.excluded.length)],
      ["Deceased", String(mv.deceased.length)],
      ["Year Out", String(mv.yearOut.length)],
      ["Net", String(mv.net)],
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    head: [["3. UGLE Portal", ""]],
    body: [
      ["Registered", `${ra.registeredCount} / ${ra.totalActive} (${ra.pct}%)`],
      ["Outstanding", ra.unregistered.map(fullName).join(", ") || "—"],
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  if (conv.length) {
    autoTable(doc, {
      head: [["4. RA Conversion", "Raised", "Months"]],
      body: conv.map((r) => [fullName(r.member), r.member.raising_date ?? "—", String(r.monthsEligible)]),
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });
  }

  if (ms.length) {
    autoTable(doc, {
      head: [["5. Milestones", "Date", "Detail"]],
      body: ms.map((x) => [fullName(x.member), new Date(x.date).toLocaleDateString("en-GB"), x.label]),
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });
  }

  autoTable(doc, {
    head: [["6. Officers & Succession", ""]],
    body: [
      ["Progressive offices filled", `${oh.progressiveFilled.length} / ${oh.progressiveTotal}`],
      ["Vacant progressive offices", oh.progressiveVacant.map((v) => v.label).join(", ") || "None"],
      ...oh.criticals.map(
        (c) => [c.label, c.risk ? `RISK: ${c.risk.note ?? "flagged"}` : c.holder ? fullName(c.holder) : "VACANT"] as [string, string]
      ),
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    head: [["7. Pipeline", "Count"]],
    body: [
      ["Candidates awaiting Initiation", String(pl.candidates.length)],
      ["EA not yet Passed", String(pl.ea.length)],
      ["FC not yet Raised", String(pl.fc.length)],
      ["Master Masons (incl. PMs/IM)", String(pl.mm.length)],
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  doc.save(`kpi-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}
