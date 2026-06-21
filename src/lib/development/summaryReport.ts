// Aggregator: pulls together a Lodge Development Summary Report for a date range.
import { supabase } from "@/integrations/supabase/client";
import {
  fetchKpiBundle,
  snapshot,
  movement,
  raConversion,
  pipeline,
  fullName,
  type KpiMember,
} from "@/lib/kpis";
import { RITUAL_CATALOGUE } from "./catalogues";

export type SummaryPeriod = { start: string; end: string; label: string };

export type FlaggedMember = { id: string; name: string; detail?: string };

export type SummaryReportData = {
  period: SummaryPeriod;
  previousPeriod: SummaryPeriod;
  generatedAt: string;
  membership: {
    subscribing: number;
    novice: number;
    exempt: number;
    pipeline: number;
    initiated: number;
    joined: number;
    resigned: number;
    excluded: number;
    deceased: number;
    net: number;
  };
  mentoring: {
    inProgress: number;
    avgCompletionPct: number;
    completedThisYear: number;
    overdueTotal: number;
    overdueByMember: FlaggedMember[];
    engagementRisk: FlaggedMember[];
    initiations: number;
    passings: number;
    raisings: number;
    exaltations: number;
  };
  ritual: {
    totalPieces: number;
    red: number;
    redPct: number;
    amber: number;
    amberList: string[];
    green: number;
    greenPct: number;
    newDeliveries: number;
    firstDeliveriesInLodge: FlaggedMember[];
  };
  loi: {
    sessions: number;
    avgAttendance: number;
    avgAttendancePct: number;
    trend: "improving" | "stable" | "declining" | "n/a";
    lowAttenders: FlaggedMember[];
  };
  workingGroups: {
    active: number;
    assignedMembers: number;
    assignedPct: number;
    unassigned: FlaggedMember[];
    activityCountByGroup: { group: string; count: number }[];
  };
  engagement: {
    avgTouchpointsPerNovice: number;
    zeroTouchpoints: FlaggedMember[];
    socialEvents: number;
    lodgeVisits: number;
    provincialEvents: number;
  };
  royalArch: {
    eligible: number;
    recommended: number;
    exalted: number;
    exaltedPrevious: number;
    trend: "up" | "down" | "flat";
  };
  execSummary: string;
};

function thirdWednesdayInOctober(year: number): Date {
  const dt = new Date(year, 9, 15);
  while (dt.getDay() !== 3) dt.setDate(dt.getDate() + 1);
  return new Date(Date.UTC(year, 9, dt.getDate()));
}

export function currentMasonicYearPeriod(): SummaryPeriod {
  const now = new Date();
  const startYear = now >= thirdWednesdayInOctober(now.getFullYear()) ? now.getFullYear() : now.getFullYear() - 1;
  const start = thirdWednesdayInOctober(startYear);
  const end = thirdWednesdayInOctober(startYear + 1);
  end.setDate(end.getDate() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${startYear}/${startYear + 1} Masonic Year`,
  };
}

function shiftPeriod(p: SummaryPeriod): SummaryPeriod {
  const s = new Date(p.start);
  const e = new Date(p.end);
  const len = e.getTime() - s.getTime();
  const ps = new Date(s.getTime() - len - 86_400_000);
  const pe = new Date(s.getTime() - 86_400_000);
  return {
    start: ps.toISOString().slice(0, 10),
    end: pe.toISOString().slice(0, 10),
    label: "Previous period",
  };
}

const inRange = (iso: string | null | undefined, p: SummaryPeriod) =>
  !!iso && iso >= p.start && iso <= p.end;

const display = (p: { first_name?: string | null; last_name?: string | null; full_name?: string | null; preferred_name?: string | null }) => {
  const f = p.preferred_name?.trim() || p.first_name?.trim() || "";
  return [f, p.last_name?.trim() || ""].filter(Boolean).join(" ") || p.full_name || "Unnamed";
};

const noviceDegrees = new Set(["entered_apprentice", "fellow_craft", "master_mason"]);

export async function buildSummaryReport(period: SummaryPeriod): Promise<SummaryReportData> {
  const previousPeriod = shiftPeriod(period);
  const bundle = await fetchKpiBundle();
  const snap = snapshot(bundle.members);
  const mv = movement(bundle.members); // rolling 12 months — used only for fallbacks
  const pipe = pipeline(bundle);

  // ---- 1. Membership Overview (period-aware) ----
  const inPeriod = (iso: string | null | undefined) => inRange(iso ?? null, period);
  const initiatedIn = bundle.members.filter((m) => inPeriod(m.initiation_date));
  const joinedIn = bundle.members.filter(
    (m) => inPeriod(m.joined_lodge_date) && m.joined_lodge_date !== m.initiation_date
  );
  const resignedIn = bundle.members.filter((m) => m.status === "resigned" && inPeriod(m.updated_at));
  const excludedIn = bundle.members.filter((m) => m.status === "excluded" && inPeriod(m.updated_at));
  const deceasedIn = bundle.members.filter((m) => m.status === "deceased" && inPeriod(m.updated_at));

  // ---- Development records for novice / mentoring metrics ----
  const { data: devRecords } = await supabase
    .from("member_development_records")
    .select("member_id, assigned_mentor_id, mentoring_exempt, last_checkin_date");
  type DevRow = { member_id: string; assigned_mentor_id: string | null; mentoring_exempt: boolean | null; last_checkin_date: string | null };
  const recs = (devRecords ?? []) as DevRow[];
  const exemptIds = new Set(recs.filter((r) => r.mentoring_exempt).map((r) => r.member_id));

  const activeSubscribing = snap.subscribing;
  // Novice = in formal mentoring: active, novice degree, NOT a Past Master,
  // and NOT marked exempt in module settings.
  const noviceMembers = activeSubscribing.filter(
    (m) => noviceDegrees.has(m.degree) && !m.is_past_master && !exemptIds.has(m.id)
  );
  const exemptCount = activeSubscribing.length - noviceMembers.length;

  // ---- 2. Mentoring Progress ----
  const noviceIds = noviceMembers.map((m) => m.id);
  const { data: checklistRows } = noviceIds.length
    ? await supabase
        .from("member_checklist_items")
        .select("member_id, status, target_date, completed_date")
    : { data: [] as any[] };
  const allChecklist = (checklistRows ?? []) as Array<{ member_id: string; status: string; target_date: string | null; completed_date: string | null }>;

  const today = new Date().toISOString().slice(0, 10);
  const completionByMember = new Map<string, { total: number; done: number; overdue: number }>();
  for (const it of allChecklist) {
    if (!noviceIds.includes(it.member_id)) continue;
    const cur = completionByMember.get(it.member_id) ?? { total: 0, done: 0, overdue: 0 };
    cur.total += 1;
    if (it.status === "complete") cur.done += 1;
    if (it.target_date && it.status !== "complete" && it.target_date < today) cur.overdue += 1;
    completionByMember.set(it.member_id, cur);
  }
  const completionPcts = Array.from(completionByMember.values()).map((v) =>
    v.total ? (v.done / v.total) * 100 : 0
  );
  const avgCompletionPct = completionPcts.length
    ? Math.round(completionPcts.reduce((a, b) => a + b, 0) / completionPcts.length)
    : 0;
  const overdueByMember: FlaggedMember[] = noviceMembers
    .map((m) => {
      const c = completionByMember.get(m.id);
      return c && c.overdue > 0
        ? { id: m.id, name: fullName(m), detail: `${c.overdue} overdue` }
        : null;
    })
    .filter((x): x is { id: string; name: string; detail: string } => !!x);
  const overdueTotal = overdueByMember.reduce((a, x) => a + Number(x.detail?.split(" ")[0] ?? 0), 0);

  // "completed formal mentoring" = "Formal mentoring concluded" checklist item completed in period
  const { data: completedRows } = await supabase
    .from("member_checklist_items")
    .select("member_id, completed_date, topic, status")
    .eq("topic", "Formal mentoring concluded")
    .eq("status", "complete");
  const completedThisYear = ((completedRows ?? []) as any[]).filter((r) => inPeriod(r.completed_date)).length;

  // engagement risk — touchpoint gap > 42 days
  const last42 = new Date();
  last42.setDate(last42.getDate() - 42);
  const cutoff42 = last42.toISOString().slice(0, 10);
  const { data: engRows } = await supabase
    .from("member_engagement_log")
    .select("member_id, occurred_on, category");
  const allEngagement = (engRows ?? []) as Array<{ member_id: string; occurred_on: string; category: string }>;
  const lastByMember = new Map<string, string>();
  for (const e of allEngagement) {
    const cur = lastByMember.get(e.member_id);
    if (!cur || e.occurred_on > cur) lastByMember.set(e.member_id, e.occurred_on);
  }
  const engagementRisk: FlaggedMember[] = noviceMembers
    .filter((m) => {
      const last = lastByMember.get(m.id);
      return !last || last < cutoff42;
    })
    .map((m) => ({
      id: m.id,
      name: fullName(m),
      detail: lastByMember.get(m.id) ? `last ${lastByMember.get(m.id)}` : "no log",
    }));

  // Degrees in period — initiations from profiles, passings/raisings from profile dates
  const initiationsInPeriod = initiatedIn.length;
  const passingsInPeriod = bundle.members.filter((m) => inPeriod(m.passing_date)).length;
  const raisingsInPeriod = bundle.members.filter((m) => inPeriod(m.raising_date)).length;
  // Exaltations approximated by RA toggle + raising before period
  // No raised date — fall back to count of is_royal_arch members whose profile was updated this period and they became RA
  // (best-effort; the snapshot is informative not authoritative)
  const exaltationsInPeriod = 0; // not tracked precisely; left at 0 — exec summary uses RA section instead

  // ---- 3. Ritual Development ----
  const { data: ritualRows } = await supabase
    .from("member_ritual_records")
    .select("member_id, ritual_group, piece, date_first_learned, date_assessed, date_delivered_loi, date_delivered_lodge");
  const allRitual = (ritualRows ?? []) as Array<{
    member_id: string; ritual_group: string; piece: string;
    date_first_learned: string | null; date_assessed: string | null;
    date_delivered_loi: string | null; date_delivered_lodge: string | null;
  }>;
  // qualified = assessed OR delivered (LoI or Lodge)
  const qualifiedByPiece = new Map<string, Set<string>>();
  for (const r of allRitual) {
    const key = `${r.ritual_group}::${r.piece}`;
    const isQualified = !!(r.date_assessed || r.date_delivered_loi || r.date_delivered_lodge);
    if (!isQualified) continue;
    const set = qualifiedByPiece.get(key) ?? new Set<string>();
    set.add(r.member_id);
    qualifiedByPiece.set(key, set);
  }
  const allPieceKeys = RITUAL_CATALOGUE.map((p) => `${p.ritual_group}::${p.piece}`);
  let red = 0, amber = 0, green = 0;
  const amberList: string[] = [];
  for (const key of allPieceKeys) {
    const count = qualifiedByPiece.get(key)?.size ?? 0;
    if (count === 0) red++;
    else if (count === 1) { amber++; amberList.push(key.replace("::", " — ")); }
    else green++;
  }
  const totalPieces = allPieceKeys.length;
  const newDeliveries = allRitual.filter(
    (r) => inPeriod(r.date_delivered_loi) || inPeriod(r.date_delivered_lodge)
  ).length;
  const firstLodgeDeliveryByMember = new Map<string, string>();
  for (const r of allRitual) {
    if (!inPeriod(r.date_delivered_lodge)) continue;
    // Check whether member ever delivered in lodge before period start
    const earlier = allRitual.some(
      (x) => x.member_id === r.member_id && x.date_delivered_lodge && x.date_delivered_lodge < period.start
    );
    if (!earlier && !firstLodgeDeliveryByMember.has(r.member_id)) {
      firstLodgeDeliveryByMember.set(r.member_id, r.piece);
    }
  }
  const firstDeliveriesInLodge: FlaggedMember[] = [];
  for (const [memberId, piece] of firstLodgeDeliveryByMember) {
    const m = bundle.members.find((x) => x.id === memberId);
    if (m) firstDeliveriesInLodge.push({ id: memberId, name: fullName(m), detail: piece });
  }

  // ---- 4. LoI ----
  const { data: loiSessions } = await supabase
    .from("loi_sessions")
    .select("id, session_date")
    .gte("session_date", period.start)
    .lte("session_date", period.end);
  const sessions = (loiSessions ?? []) as Array<{ id: string; session_date: string }>;
  const sessionIds = sessions.map((s) => s.id);
  const { data: loiAtt } = sessionIds.length
    ? await supabase.from("loi_attendance").select("session_id, member_id").in("session_id", sessionIds)
    : { data: [] as any[] };
  const att = (loiAtt ?? []) as Array<{ session_id: string; member_id: string }>;
  const attendanceCount = att.length;
  const avgAttendance = sessions.length ? Math.round((attendanceCount / sessions.length) * 10) / 10 : 0;
  const avgAttendancePct = activeSubscribing.length && sessions.length
    ? Math.round((attendanceCount / sessions.length / activeSubscribing.length) * 100)
    : 0;

  // attendance counts per member for low-attender flag
  const attendByMember = new Map<string, number>();
  for (const a of att) attendByMember.set(a.member_id, (attendByMember.get(a.member_id) ?? 0) + 1);
  const lowAttenders: FlaggedMember[] = activeSubscribing
    .map((m) => {
      const c = attendByMember.get(m.id) ?? 0;
      const pct = sessions.length ? Math.round((c / sessions.length) * 100) : 0;
      return pct < 50 ? { id: m.id, name: fullName(m), detail: `${pct}% (${c}/${sessions.length})` } : null;
    })
    .filter((x): x is { id: string; name: string; detail: string } => !!x && sessions.length > 0);

  // trend vs previous period
  const { data: prevSessions } = await supabase
    .from("loi_sessions")
    .select("id")
    .gte("session_date", previousPeriod.start)
    .lte("session_date", previousPeriod.end);
  const prevIds = ((prevSessions ?? []) as any[]).map((r) => r.id);
  const { data: prevAtt } = prevIds.length
    ? await supabase.from("loi_attendance").select("session_id").in("session_id", prevIds)
    : { data: [] as any[] };
  const prevAvg = prevIds.length ? ((prevAtt ?? []) as any[]).length / prevIds.length : 0;
  const curAvg = sessions.length ? attendanceCount / sessions.length : 0;
  let trend: "improving" | "stable" | "declining" | "n/a" = "n/a";
  if (sessions.length && prevIds.length) {
    const diff = curAvg - prevAvg;
    trend = Math.abs(diff) < 0.5 ? "stable" : diff > 0 ? "improving" : "declining";
  }

  // ---- 5. Working Groups ----
  const { data: wgRows } = await supabase.from("working_groups").select("id, name, is_active");
  const { data: wgMembers } = await supabase.from("working_group_members").select("working_group_id, member_id");
  const { data: wgActs } = await supabase
    .from("working_group_activities")
    .select("working_group_id, activity_date")
    .gte("activity_date", period.start)
    .lte("activity_date", period.end);
  const groups = ((wgRows ?? []) as any[]).filter((g) => g.is_active);
  const members = (wgMembers ?? []) as Array<{ working_group_id: string; member_id: string }>;
  const assignedSet = new Set(members.map((r) => r.member_id));
  const assignedCount = activeSubscribing.filter((m) => assignedSet.has(m.id)).length;
  const unassigned: FlaggedMember[] = activeSubscribing
    .filter((m) => !assignedSet.has(m.id))
    .map((m) => ({ id: m.id, name: fullName(m) }));
  const activityCountByGroup = groups.map((g: any) => ({
    group: g.name,
    count: ((wgActs ?? []) as any[]).filter((a) => a.working_group_id === g.id).length,
  }));

  // ---- 6. Engagement ----
  const periodEng = allEngagement.filter((e) => inPeriod(e.occurred_on));
  const touchpointCount: Record<string, number> = {};
  for (const e of periodEng) touchpointCount[e.member_id] = (touchpointCount[e.member_id] ?? 0) + 1;
  const noviceTouchpoints = noviceMembers.map((m) => touchpointCount[m.id] ?? 0);
  const avgTouchpointsPerNovice = noviceTouchpoints.length
    ? Math.round((noviceTouchpoints.reduce((a, b) => a + b, 0) / noviceTouchpoints.length) * 10) / 10
    : 0;
  const zeroTouchpoints: FlaggedMember[] = noviceMembers
    .filter((m) => !touchpointCount[m.id])
    .map((m) => ({ id: m.id, name: fullName(m) }));
  const socialEvents = periodEng.filter((e) => e.category === "social").length;
  const lodgeVisits = periodEng.filter((e) => e.category === "visit").length;
  const provincialEvents = periodEng.filter((e) => e.category === "provincial").length;

  // ---- 7. Royal Arch ----
  const ra = raConversion(bundle.members);
  const eligible = ra.length;
  // Use the dedicated royal_arch_date field — updated_at reflects any profile
  // edit and would over-count exaltations dramatically.
  const { data: raDates } = await supabase
    .from("profiles")
    .select("id, is_royal_arch, royal_arch_date");
  const raRows = ((raDates ?? []) as Array<{ id: string; is_royal_arch: boolean; royal_arch_date: string | null }>);
  const exaltedInPeriod = raRows.filter(
    (r) => r.is_royal_arch && inPeriod(r.royal_arch_date)
  ).length;
  const exaltedPrevious = raRows.filter(
    (r) => r.is_royal_arch && inRange(r.royal_arch_date, previousPeriod)
  ).length;
  // "recommended for Exaltation" — checklist topic
  const { data: raRec } = await supabase
    .from("member_checklist_items")
    .select("member_id, completed_date, status")
    .eq("topic", "Recommended for Exaltation")
    .eq("status", "complete");
  const recommended = ((raRec ?? []) as any[]).filter((r) => inPeriod(r.completed_date)).length;
  const raTrend: "up" | "down" | "flat" =
    exaltedInPeriod > exaltedPrevious ? "up" : exaltedInPeriod < exaltedPrevious ? "down" : "flat";

  const data: SummaryReportData = {
    period,
    previousPeriod,
    generatedAt: new Date().toISOString(),
    membership: {
      subscribing: activeSubscribing.length,
      novice: noviceMembers.length,
      exempt: exemptCount,
      pipeline: pipe.candidates.length,
      initiated: initiatedIn.length,
      joined: joinedIn.length,
      resigned: resignedIn.length,
      excluded: excludedIn.length,
      deceased: deceasedIn.length,
      net: (initiatedIn.length + joinedIn.length) - (resignedIn.length + excludedIn.length + deceasedIn.length),
    },
    mentoring: {
      inProgress: noviceMembers.length,
      avgCompletionPct,
      completedThisYear,
      overdueTotal,
      overdueByMember,
      engagementRisk,
      initiations: initiationsInPeriod,
      passings: passingsInPeriod,
      raisings: raisingsInPeriod,
      exaltations: exaltationsInPeriod,
    },
    ritual: {
      totalPieces,
      red,
      redPct: totalPieces ? Math.round((red / totalPieces) * 100) : 0,
      amber,
      amberList,
      green,
      greenPct: totalPieces ? Math.round((green / totalPieces) * 100) : 0,
      newDeliveries,
      firstDeliveriesInLodge,
    },
    loi: { sessions: sessions.length, avgAttendance, avgAttendancePct, trend, lowAttenders },
    workingGroups: {
      active: groups.length,
      assignedMembers: assignedCount,
      assignedPct: activeSubscribing.length
        ? Math.round((assignedCount / activeSubscribing.length) * 100)
        : 0,
      unassigned,
      activityCountByGroup,
    },
    engagement: {
      avgTouchpointsPerNovice,
      zeroTouchpoints,
      socialEvents,
      lodgeVisits,
      provincialEvents,
    },
    royalArch: {
      eligible,
      recommended,
      exalted: exaltedInPeriod,
      exaltedPrevious,
      trend: raTrend,
    },
    execSummary: "",
  };

  data.execSummary = buildExecSummary(data);
  return data;
}

export function buildExecSummary(d: SummaryReportData): string {
  const bits: string[] = [];
  const noviceN = d.membership.novice;
  bits.push(
    `Weybridge Lodge currently has ${noviceN} member${noviceN === 1 ? "" : "s"} in formal mentoring, with an average checklist completion of ${d.mentoring.avgCompletionPct}%.`
  );
  const redV = `${d.ritual.red} ${d.ritual.red === 1 ? "is" : "are"} unrecorded`;
  const amberV = `${d.ritual.amber} ${d.ritual.amber === 1 ? "is" : "are"} amber single-point-of-failure risk${d.ritual.amber === 1 ? "" : "s"}`;
  bits.push(`Of ${d.ritual.totalPieces} ritual pieces, ${redV}, ${amberV}.`);
  if (d.loi.sessions > 0) {
    bits.push(
      `LoI attendance averaged ${d.loi.avgAttendancePct}% across ${d.loi.sessions} session${d.loi.sessions === 1 ? "" : "s"}${d.loi.trend !== "n/a" ? ` (${d.loi.trend} vs previous period)` : ""}.`
    );
  }
  if (d.workingGroups.active > 0) {
    bits.push(
      d.workingGroups.unassigned.length === 0
        ? `All ${d.membership.subscribing} active members are assigned to at least one working group.`
        : `${d.workingGroups.assignedMembers} of ${d.membership.subscribing} active members (${d.workingGroups.assignedPct}%) are assigned to a working group.`
    );
  }
  return bits.join(" ");
}
