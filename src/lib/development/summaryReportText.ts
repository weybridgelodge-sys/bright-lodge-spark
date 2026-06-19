import type { SummaryReportData } from "./summaryReport";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const list = (items: { name: string; detail?: string }[], max = 8) => {
  if (items.length === 0) return "  (none)";
  const shown = items.slice(0, max).map((i) => `  • ${i.name}${i.detail ? ` — ${i.detail}` : ""}`);
  if (items.length > max) shown.push(`  • …and ${items.length - max} more`);
  return shown.join("\n");
};

export function buildSummaryReportText(d: SummaryReportData, mentorStatement: string): string {
  const lines: string[] = [];
  lines.push(`WEYBRIDGE LODGE No. 6787 — LODGE DEVELOPMENT SUMMARY REPORT`);
  lines.push(`Period: ${fmtDate(d.period.start)} – ${fmtDate(d.period.end)} (${d.period.label})`);
  lines.push(`Generated: ${fmtDate(d.generatedAt)}`);
  lines.push("");
  lines.push("EXECUTIVE SUMMARY");
  lines.push(d.execSummary);
  lines.push("");
  lines.push("1. MEMBERSHIP OVERVIEW");
  lines.push(`  • Active subscribing members: ${d.membership.subscribing}`);
  lines.push(`  • In formal mentoring (novice): ${d.membership.novice}`);
  lines.push(`  • Exempt from mentoring: ${d.membership.exempt}`);
  lines.push(`  • Pipeline (candidates): ${d.membership.pipeline}`);
  lines.push(`  • Movement: initiated ${d.membership.initiated}, joined ${d.membership.joined}, resigned ${d.membership.resigned}, excluded ${d.membership.excluded}, deceased ${d.membership.deceased} (net ${d.membership.net >= 0 ? "+" : ""}${d.membership.net})`);
  lines.push("");
  lines.push("2. MENTORING PROGRESS");
  lines.push(`  • Novice members with checklists in progress: ${d.mentoring.inProgress}`);
  lines.push(`  • Average checklist completion: ${d.mentoring.avgCompletionPct}%`);
  lines.push(`  • Completed formal mentoring this period: ${d.mentoring.completedThisYear}`);
  lines.push(`  • Overdue checklist items: ${d.mentoring.overdueTotal} across ${d.mentoring.overdueByMember.length} member(s)`);
  if (d.mentoring.overdueByMember.length) lines.push(list(d.mentoring.overdueByMember));
  lines.push(`  • Engagement risk (>6-week gap): ${d.mentoring.engagementRisk.length}`);
  if (d.mentoring.engagementRisk.length) lines.push(list(d.mentoring.engagementRisk));
  lines.push(`  • Degrees conferred: Initiations ${d.mentoring.initiations}, Passings ${d.mentoring.passings}, Raisings ${d.mentoring.raisings}, Exaltations ${d.royalArch.exalted}`);
  lines.push("");
  lines.push("3. RITUAL DEVELOPMENT");
  lines.push(`  • Total pieces tracked: ${d.ritual.totalPieces}`);
  lines.push(`  • Red (no qualified member): ${d.ritual.red} (${d.ritual.redPct}%)`);
  lines.push(`  • Amber (single point of failure): ${d.ritual.amber}`);
  if (d.ritual.amberList.length) lines.push(d.ritual.amberList.slice(0, 12).map((s) => `      – ${s}`).join("\n"));
  lines.push(`  • Green (two or more qualified): ${d.ritual.green} (${d.ritual.greenPct}%)`);
  lines.push(`  • New deliveries in period (LoI + Lodge): ${d.ritual.newDeliveries}`);
  if (d.ritual.firstDeliveriesInLodge.length) {
    lines.push(`  • First-time Lodge deliveries:`);
    lines.push(list(d.ritual.firstDeliveriesInLodge));
  }
  lines.push("");
  lines.push("4. LODGE OF INSTRUCTION");
  lines.push(`  • Sessions held: ${d.loi.sessions}`);
  lines.push(`  • Average attendance: ${d.loi.avgAttendance} (${d.loi.avgAttendancePct}% of active membership)`);
  lines.push(`  • Trend: ${d.loi.trend}`);
  if (d.loi.lowAttenders.length) {
    lines.push(`  • Members below 50% attendance:`);
    lines.push(list(d.loi.lowAttenders));
  }
  lines.push("");
  lines.push("5. WORKING GROUPS");
  lines.push(`  • Active groups: ${d.workingGroups.active}`);
  lines.push(`  • Members assigned: ${d.workingGroups.assignedMembers} (${d.workingGroups.assignedPct}%)`);
  if (d.workingGroups.unassigned.length) {
    lines.push(`  • Unassigned members:`);
    lines.push(list(d.workingGroups.unassigned));
  }
  if (d.workingGroups.activityCountByGroup.length) {
    lines.push(`  • Activities in period:`);
    for (const g of d.workingGroups.activityCountByGroup) lines.push(`      – ${g.group}: ${g.count}`);
  }
  lines.push("");
  lines.push("6. ENGAGEMENT SUMMARY");
  lines.push(`  • Average touchpoints per novice: ${d.engagement.avgTouchpointsPerNovice}`);
  lines.push(`  • Novices with zero touchpoints: ${d.engagement.zeroTouchpoints.length}`);
  if (d.engagement.zeroTouchpoints.length) lines.push(list(d.engagement.zeroTouchpoints));
  lines.push(`  • Social events logged: ${d.engagement.socialEvents}`);
  lines.push(`  • Lodge visits made: ${d.engagement.lodgeVisits}`);
  lines.push(`  • Provincial events attended: ${d.engagement.provincialEvents}`);
  lines.push("");
  lines.push("7. ROYAL ARCH CONVERSION");
  lines.push(`  • Light Blues eligible: ${d.royalArch.eligible}`);
  lines.push(`  • Recommended for Exaltation in period: ${d.royalArch.recommended}`);
  lines.push(`  • Exalted in period: ${d.royalArch.exalted} (previous period ${d.royalArch.exaltedPrevious}, trend ${d.royalArch.trend})`);
  lines.push("");
  lines.push("8. MENTOR'S SUMMARY STATEMENT");
  lines.push(mentorStatement?.trim() || "(no statement recorded)");
  lines.push("");
  lines.push("— Confidential — for use by the Mentor, Worshipful Master, Secretary, and Provincial Visiting Officer.");
  return lines.join("\n");
}
