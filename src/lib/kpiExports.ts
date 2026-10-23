import { loadDocIdentity, docTitle, docSubtitle, docFileName, docGroupName } from "@/lib/docIdentity";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdf } from "./nativeDownload";
import { assetUrl } from "./assetUrl";
import crestAsset from "@/assets/weybridge-logo-navy-transparent.png.asset.json";
import {
  type KpiBundle,
  type EngagementBundle,
  snapshot,
  movement,
  uglePortal,
  raConversion,
  milestones,
  milestoneDateLabel,
  officersHealth,
  pipeline,
  lodgeHealth,
  referralRate,
  activeVsInactive,
  quarterlyEngagement,
  visitorFrequency,
  disengagementRisk,
  REFERRAL_SOURCE_LABELS,
  fullName,
  currentMasonicYear,
  type MovementPeriod,
} from "./kpis";
import { getMasonicYear, localIsoDate } from "./masonicYear";

// KPI dashboard / Members — Movement follows the period chosen on screen.
function periodMovement(bundle: KpiBundle, period?: MovementPeriod | null) {
  return period
    ? movement(bundle.members, { start: period.start, end: period.end, history: bundle.statusHistory })
    : movement(bundle.members);
}
const periodTitle = (period?: MovementPeriod | null) =>
  period ? `${period.label}: ${period.rangeLabel}` : "rolling 12 months";

function header(doc: jsPDF, title: string, LODGE: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(LODGE, 14, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")}`, 14, 25);
}

async function dashboardHeader(doc: jsPDF): Promise<number> {
  const centre = doc.internal.pageSize.getWidth() / 2;
  const response = await fetch(assetUrl(crestAsset), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("The Lodge crest could not be loaded. Please retry the export.");
  const crest = new Uint8Array(await response.arrayBuffer());
  doc.addImage(crest, "PNG", centre - 16, 10, 32, 32);

  doc.setTextColor(27, 42, 74);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("Lodge KPI Dashboard", centre, 53, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const year = currentMasonicYear();
  doc.text(`Live figures from member records · Masonic year ${year}/${year + 1}`, centre, 61, { align: "center" });
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB")}`, centre, 68, { align: "center" });
  doc.setDrawColor(201, 164, 50);
  doc.setLineWidth(0.3);
  doc.line(14, 74, doc.internal.pageSize.getWidth() - 14, 74);
  doc.setTextColor(0);
  return 82;
}

export async function exportVoReport(bundle: KpiBundle, period?: MovementPeriod | null) {
  const doc = new jsPDF();
  const s = snapshot(bundle.members);
  const mv = periodMovement(bundle, period);
  const ra = uglePortal(bundle.members);

  header(doc, "Membership Snapshot — Visiting Officer Report", docTitle(await loadDocIdentity()));

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
    pageBreak: "avoid",
    head: [[`Movement (${periodTitle(period)})`, ""]],
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

  await saveJsPdf(doc, `vo-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportFullKpi(bundle: KpiBundle, eng?: EngagementBundle | null, period?: MovementPeriod | null) {
  const doc = new jsPDF();
  const s = snapshot(bundle.members);
  const mv = periodMovement(bundle, period);
  const ra = uglePortal(bundle.members);
  const conv = raConversion(bundle.members);
  const curYear = bundle.installation ? getMasonicYear(localIsoDate(), bundle.installation) : null;
  const ms = milestones(bundle.members, bundle.pastMasters ?? [], curYear ?? undefined);
  const oh = officersHealth(bundle);
  const pl = pipeline(bundle);
  const lh = lodgeHealth(bundle);
  const rr = referralRate(bundle.candidates);

  const firstSectionY = await dashboardHeader(doc);

  autoTable(doc, {
    startY: firstSectionY,
    pageBreak: "avoid",
    head: [["Lodge Health", `OVERALL: ${lh.overall.toUpperCase()}`]],
    body: [
      [`Growth — ${lh.components.growth.band.toUpperCase()}`, lh.components.growth.detail],
      [`Succession — ${lh.components.succession.band.toUpperCase()}`, lh.components.succession.detail],
      [`Pipeline — ${lh.components.pipeline.band.toUpperCase()}`, lh.components.pipeline.detail],
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    // Continue below Lodge Health rather than overlapping it.
    startY: (doc as any).lastAutoTable.finalY + 8,
    pageBreak: "avoid",
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
    pageBreak: "avoid",
    head: [[`2. Movement (${periodTitle(period)})`, "Count"]],
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
    pageBreak: "avoid",
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
      pageBreak: "avoid",
      head: [["4. RA Conversion", "Raised", "Months"]],
      body: conv.map((r) => [fullName(r.member), r.member.raising_date ?? "—", String(r.monthsEligible)]),
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });
  }

  if (ms.length) {
    autoTable(doc, {
      pageBreak: "avoid",
      head: [["5. Milestones", "Date", "Detail"]],
      body: ms.map((x) => [fullName(x.member), milestoneDateLabel(x), x.label]),
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });
  }

  autoTable(doc, {
    pageBreak: "avoid",
    head: [["6. Officers & Succession", ""]],
    body: [
      ["Progressive offices filled", `${oh.progressiveFilled.length} / ${oh.progressiveTotal}`],
      ["Vacant progressive offices", oh.progressiveVacant.map((v) => v.label).join(", ") || "None"],
      ...oh.criticals.map(
        (c) =>
          [
            c.label,
            c.risk?.is_at_risk
              ? `RISK: ${c.risk.note ?? "flagged"}`
              : c.holder
                ? fullName(c.holder)
                : "VACANT",
          ] as [string, string]
      ),
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    pageBreak: "avoid",
    head: [["7. Pipeline", "Count"]],
    body: [
      ["Candidates awaiting Initiation", String(pl.candidates.length)],
      ["EA not yet Passed", String(pl.ea.length)],
      ["FC not yet Raised", String(pl.fc.length)],
      ["Master Masons (incl. PMs/IM)", String(pl.mm)],
    ],
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  autoTable(doc, {
    pageBreak: "avoid",
    head: [["7a. Referral Sources (all candidates recorded)", "Count"]],
    body: (Object.keys(REFERRAL_SOURCE_LABELS) as (keyof typeof REFERRAL_SOURCE_LABELS)[]).map(
      (k) => [REFERRAL_SOURCE_LABELS[k], String(rr[k])] as [string, string]
    ),
    theme: "striped",
    headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
  });

  if (eng) {
    const avi = activeVsInactive(bundle.members, eng);
    autoTable(doc, {
      pageBreak: "avoid",
      head: [["8. Active vs Inactive Members", ""]],
      body: [
        ["Meetings considered", String(avi.meetingsConsidered)],
        ["Active", String(avi.active.length)],
        ["Inactive", String(avi.inactive.length)],
        ["Active %", `${avi.activePct}%`],
      ],
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });

    const qe = quarterlyEngagement(eng);
    if (qe.length) {
      autoTable(doc, {
        pageBreak: "avoid",
        head: [["9. Quarterly Engagement", "Meetings", "Members", "Visitors", "Avg members"]],
        body: qe.map((q) => [
          q.quarter,
          String(q.meetings),
          String(q.members),
          String(q.visitors),
          String(q.avgMembers),
        ]),
        theme: "striped",
        headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
      });
    }

    // Aggregate only — this document may be printed or shared outside the portal,
    // so individual visitor names are deliberately omitted.
    const visitors = visitorFrequency(eng, 1000);
    const totalVisits = visitors.reduce((n, v) => n + v.visits, 0);
    // Normalise the grouping key so the same lodge written differently
    // ("Astolat Lodge No 5848" vs "Astolat 5848") counts as one lodge.
    // Normalise the grouping key so the same lodge written differently
    // ("Astolat Lodge No 5848" vs "Astolat 5848") counts as one lodge.
    // Keep the lodge number in the key so genuinely different lodges that
    // share a name aren't merged — but an unnumbered variant folds into a
    // numbered group with the same name ("Worplesdon" → "Worplesdon 9076").
    const lodgeParts = (raw: string) => {
      const norm = raw
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(lodge|no)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const num = norm.match(/\d+/)?.[0] ?? "";
      const name = norm.replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
      return { name, num };
    };
    const byLodge = new Map<string, { visits: number; label: string; name: string; num: string }>();
    for (const v of visitors) {
      const lodge = (v.lodge_name ?? "").trim();
      if (!lodge) {
        const cur = byLodge.get("__none__") ?? { visits: 0, label: "Lodge not recorded", name: "", num: "" };
        cur.visits += v.visits;
        byLodge.set("__none__", cur);
        continue;
      }
      const { name, num } = lodgeParts(lodge);
      // Exact key, or (when this entry has no number) an existing group
      // with the same name that does have one.
      let key = `${name}|${num}`;
      if (!num) {
        for (const [k, g] of byLodge) {
          if (g.name === name && g.num) { key = k; break; }
        }
      }
      // If a numbered entry arrives after an unnumbered group with the same
      // name already exists, fold that group into this one.
      if (num) {
        const bareKey = `${name}|`;
        const bare = byLodge.get(bareKey);
        if (bare) {
          byLodge.delete(bareKey);
          const cur = byLodge.get(key) ?? { visits: 0, label: lodge, name, num };
          cur.visits += bare.visits + v.visits;
          cur.label = [lodge, bare.label, cur.label].sort((a, b) => b.length - a.length)[0];
          byLodge.set(key, cur);
          continue;
        }
      }
      const cur = byLodge.get(key) ?? { visits: 0, label: lodge, name, num };
      cur.visits += v.visits;
      // Display the longest / most complete original variant as the label.
      if (lodge.length > cur.label.length) cur.label = lodge;
      byLodge.set(key, cur);
    }
    const topLodges = [...byLodge.values()].sort((a, b) => b.visits - a.visits).slice(0, 3);
    autoTable(doc, {
      pageBreak: "avoid",
      head: [["10. Visitor Frequency (aggregate)", ""]],
      body: [
        ["Unique visitors", String(visitors.length)],
        ["Total visits", String(totalVisits)],
        ...topLodges.map(
          (l, i) => [`Top visiting lodge ${i + 1}`, `${l.label} (${l.visits} visit${l.visits === 1 ? "" : "s"})`] as [string, string]
        ),
      ],
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });

    // Pastoral-sensitive: count only, names stay in the access-controlled portal.
    const dr = disengagementRisk(bundle.members, eng);
    autoTable(doc, {
      pageBreak: "avoid",
      head: [["11. Disengagement Risk", ""]],
      body: [
        [
          "Members flagged for follow-up",
          `${dr.members.length} member${dr.members.length === 1 ? "" : "s"} flagged for follow-up`,
        ],
        [
          "Basis",
          `Missed all of the last ${dr.meetingsConsidered} meeting${dr.meetingsConsidered === 1 ? "" : "s"} with no apology sent and no welfare absence recorded. Names are held in the members' portal only.`,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [27, 42, 74], textColor: [201, 164, 50] },
    });
  }

  // Final pagination gives accurate totals; the default 14mm table margin
  // reserves space above the footer.
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(201, 164, 50);
    doc.setLineWidth(0.3);
    doc.line(14, height - 11, width - 14, height - 11);
    doc.setTextColor(27, 42, 74);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Page ${page} of ${totalPages}`, width / 2, height - 6, { align: "center" });
  }

  await saveJsPdf(doc, `kpi-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}
