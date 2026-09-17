import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdf } from "./nativeDownload";
import {
  type KpiBundle,
  type EngagementBundle,
  snapshot,
  movement,
  uglePortal,
  raConversion,
  milestones,
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

export async function exportVoReport(bundle: KpiBundle) {
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

  await saveJsPdf(doc, `vo-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportFullKpi(bundle: KpiBundle, eng?: EngagementBundle | null) {
  const doc = new jsPDF();
  const s = snapshot(bundle.members);
  const mv = movement(bundle.members);
  const ra = uglePortal(bundle.members);
  const conv = raConversion(bundle.members);
  const ms = milestones(bundle.members, bundle.wmTerms);
  const oh = officersHealth(bundle);
  const pl = pipeline(bundle);
  const lh = lodgeHealth(bundle);
  const rr = referralRate(bundle.candidates);

  header(doc, `Full KPI Summary — Masonic Year ${currentMasonicYear()}/${currentMasonicYear() + 1}`);

  autoTable(doc, {
    startY: 32,
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
      const cur = byLodge.get(key) ?? { visits: 0, label: lodge, name, num };
      cur.visits += v.visits;
      // Display the longest / most complete original variant as the label.
      if (lodge.length > cur.label.length) cur.label = lodge;
      byLodge.set(key, cur);
    }
    const topLodges = [...byLodge.values()].sort((a, b) => b.visits - a.visits).slice(0, 3);
    autoTable(doc, {
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

  await saveJsPdf(doc, `kpi-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}
