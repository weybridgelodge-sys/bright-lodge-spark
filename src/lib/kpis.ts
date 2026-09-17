import { supabase } from "@/integrations/supabase/client";
import { firstWmYearForMember } from "@/data/worshipfulMasters";
import { formatMemberLine } from "@/lib/summons";
import { OPTIONAL_POSITIONS } from "@/lib/officersProgression";

export type MemberStatus =
  | "pending"
  | "active"
  | "suspended"
  | "year_out"
  | "resigned"
  | "excluded"
  | "deceased";

export type Degree = "entered_apprentice" | "fellow_craft" | "master_mason" | "installed_master";

export type KpiMember = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  post_nominals: string | null;
  title: string | null;
  status: MemberStatus;
  degree: Degree;
  is_past_master: boolean;
  is_royal_arch: boolean;
  is_honorary_member: boolean;
  date_of_birth: string | null;
  initiation_date: string | null;
  passing_date: string | null;
  raising_date: string | null;
  joined_lodge_date: string | null;
  is_ugle_portal_registered: boolean;
  rank: string | null;
  grand_rank: string | null;
  provincial_rank: string | null;
  updated_at: string;
};

export type WmTerm = { id: string; member_id: string; year_started: number; year_ended: number | null };
export type SuccessionRisk = { id: string; role_key: string; note: string | null; is_at_risk: boolean };
export type Appointment = { position_key: string; member_id: string; lodge_year: number };

export type CandidateStage =
  | "enquiry"
  | "information_provided"
  | "face_to_face"
  | "form_p"
  | "interviewed"
  | "read_in_lodge"
  | "initiated"
  | "withdrawn";

export type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  proposer: string | null;
  seconder: string | null;
  stage: CandidateStage;
  notes: string | null;
  date_of_enquiry: string | null;
  initiation_scheduled_date: string | null;
  converted_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export type KpiBundle = {
  members: KpiMember[];
  wmTerms: WmTerm[];
  risks: SuccessionRisk[];
  appointments: Appointment[];
  positions: { key: string; label: string; is_progressive: boolean; order_index: number }[];
  candidates: Candidate[];
};


function thirdWednesdayInOctober(year: number): Date {
  const dt = new Date(year, 9, 15);
  while (dt.getDay() !== 3) dt.setDate(dt.getDate() + 1);
  return new Date(Date.UTC(year, 9, dt.getDate()));
}

export function currentMasonicYear(d = new Date()): number {
  const start = thirdWednesdayInOctober(d.getFullYear());
  return d >= start ? d.getFullYear() : d.getFullYear() - 1;
}

export function fullName(m: KpiMember): string {
  return formatMemberLine(m as any) || "(no name)";
}

export function ageOn(dobIso: string | null, ref: Date = new Date()): number | null {
  if (!dobIso) return null;
  const d = new Date(dobIso);
  if (isNaN(d.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age;
}

export function monthsBetween(fromIso: string, to: Date = new Date()): number {
  const f = new Date(fromIso);
  if (isNaN(f.getTime())) return 0;
  return (to.getFullYear() - f.getFullYear()) * 12 + (to.getMonth() - f.getMonth());
}

export async function fetchKpiBundle(): Promise<KpiBundle> {
  const [m, w, r, a, p, c] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,first_name,middle_name,last_name,preferred_name,post_nominals,title,status,degree,is_past_master,is_royal_arch,is_honorary_member,initiation_date,passing_date,raising_date,joined_lodge_date,is_ugle_portal_registered,rank,grand_rank,provincial_rank,updated_at"
      ),
    (supabase.from as any)("member_wm_terms").select("id,member_id,year_started,year_ended"),
    (supabase.from as any)("succession_risks").select("id,role_key,note,is_at_risk"),
    supabase.from("officer_appointments").select("position_key,member_id,lodge_year"),
    supabase.from("officer_positions").select("key,label,is_progressive,order_index"),
    (supabase.from as any)("candidates").select("*"),
  ]);
  const baseMembers = ((m.data as unknown) as KpiMember[]) ?? [];
  // Merge DOB (PII) via secure RPC; caller must have admin/secretary/WM/almoner/IPM role
  let members: KpiMember[] = baseMembers;
  if (baseMembers.length) {
    const ids = baseMembers.map((x) => x.id);
    const { data: pii } = await (supabase as any).rpc("get_profiles_pii", { _ids: ids });
    const idx: Record<string, string | null> = {};
    for (const row of (pii as { id: string; date_of_birth: string | null }[]) ?? []) idx[row.id] = row.date_of_birth;
    members = baseMembers.map((b) => ({ ...b, date_of_birth: idx[b.id] ?? null }));
  }
  return {
    members,
    wmTerms: (w.data as WmTerm[]) ?? [],
    risks: (r.data as SuccessionRisk[]) ?? [],
    appointments: (a.data as Appointment[]) ?? [],
    positions: (p.data as KpiBundle["positions"]) ?? [],
    candidates: ((c?.data as Candidate[]) ?? []),
  };
}


// ───── Section 1: Snapshot
export function snapshot(members: KpiMember[]) {
  const subscribing = members.filter((m) => m.status === "active" && !m.is_honorary_member);
  const honorary = members.filter((m) => m.is_honorary_member);
  const ages = subscribing.map((m) => ageOn(m.date_of_birth)).filter((x): x is number => x != null);
  const averageAge = ages.length ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : null;

  // age distribution
  const bands = [
    { label: "<30", min: 0, max: 29 },
    { label: "30–39", min: 30, max: 39 },
    { label: "40–49", min: 40, max: 49 },
    { label: "50–59", min: 50, max: 59 },
    { label: "60–69", min: 60, max: 69 },
    { label: "70–79", min: 70, max: 79 },
    { label: "80+", min: 80, max: 200 },
  ].map((b) => ({ ...b, count: ages.filter((a) => a >= b.min && a <= b.max).length }));

  // last initiation
  const initiated = members
    .filter((m) => m.initiation_date)
    .sort((a, b) => (a.initiation_date! < b.initiation_date! ? 1 : -1));
  const lastDate = initiated[0]?.initiation_date ?? null;
  const lastSameDay = lastDate ? initiated.filter((m) => m.initiation_date === lastDate) : [];
  const multipleLabel = ["", "single", "double", "triple", "quadruple", "quintuple"][lastSameDay.length] ?? `${lastSameDay.length}-up`;

  const raCount = subscribing.filter((m) => m.is_royal_arch).length;
  const lightBlues = subscribing.filter((m) => !m.provincial_rank || !m.provincial_rank.trim());

  return {
    subscribingCount: subscribing.length,
    honoraryCount: honorary.length,
    totalCount: members.filter((m) => !["deceased", "resigned", "excluded"].includes(m.status)).length,
    averageAge,
    ageBands: bands,
    lastInitiation: lastDate
      ? { date: lastDate, count: lastSameDay.length, label: multipleLabel, names: lastSameDay.map(fullName) }
      : null,
    royalArchPct: subscribing.length ? Math.round((raCount / subscribing.length) * 100) : 0,
    royalArchCount: raCount,
    lightBlues,
    lightBlueCount: lightBlues.length,
    subscribing,
  };
}

// ───── Section 2: Movement (rolling 12 months from today)
export function movement(members: KpiMember[]) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const inRange = (iso: string | null) => !!iso && new Date(iso) >= cutoff && new Date(iso) <= now;

  const initiated = members.filter((m) => inRange(m.initiation_date));
  // Joiners only — exclude initiates whose joined_lodge_date mirrors their initiation_date.
  const joined = members.filter(
    (m) => inRange(m.joined_lodge_date) && m.joined_lodge_date !== m.initiation_date
  );
  // Status-based outs — approximated by updated_at + current terminal status.
  const resigned = members.filter((m) => m.status === "resigned" && inRange(m.updated_at));
  const excluded = members.filter((m) => m.status === "excluded" && inRange(m.updated_at));
  const deceased = members.filter((m) => m.status === "deceased" && inRange(m.updated_at));
  const yearOut = members.filter((m) => m.status === "year_out");

  const inCount = initiated.length + joined.length;
  const outCount = resigned.length + excluded.length + deceased.length;

  return {
    initiated,
    joined,
    resigned,
    excluded,
    deceased,
    yearOut,
    inCount,
    outCount,
    net: inCount - outCount,
  };
}

// ───── Section 3: UGLE Portal
export function uglePortal(members: KpiMember[]) {
  const active = members.filter((m) => m.status === "active");
  const registered = active.filter((m) => m.is_ugle_portal_registered);
  const unregistered = active.filter((m) => !m.is_ugle_portal_registered);
  return {
    pct: active.length ? Math.round((registered.length / active.length) * 100) : 0,
    registeredCount: registered.length,
    unregisteredCount: unregistered.length,
    totalActive: active.length,
    unregistered,
  };
}

// ───── Section 4: RA conversion
export function raConversion(members: KpiMember[]) {
  const now = new Date();
  return members
    .filter(
      (m) =>
        m.status === "active" &&
        !m.is_honorary_member &&
        !m.is_royal_arch &&
        m.raising_date &&
        monthsBetween(m.raising_date, now) >= 1
    )
    .sort((a, b) => (a.raising_date! < b.raising_date! ? -1 : 1))
    .map((m) => ({
      member: m,
      monthsEligible: monthsBetween(m.raising_date!, now),
    }));
}

// ───── Section 5: Milestones
export type Milestone = {
  member: KpiMember;
  kind: "initiation" | "wm" | "birthday";
  years?: number;
  date: string;
  label: string;
};

export function milestones(members: KpiMember[], wmTerms: WmTerm[]): Milestone[] {
  const today = new Date();
  const my = currentMasonicYear(today);
  const yearStart = new Date(my, 9, 1); // 1 Oct
  const yearEnd = new Date(my + 1, 8, 30); // 30 Sep
  const out: Milestone[] = [];

  // Format a Date as YYYY-MM-DD using local components — avoids the
  // toISOString() UTC shift that pushes BST dates back by one day.
  const fmtLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Parse a YYYY-MM-DD date string as a local date (not UTC), so getDate()
  // returns the intended day regardless of the viewer's timezone.
  const parseLocalDate = (s: string) => {
    const iso = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return new Date(s);
  };

  for (const m of members) {
    if (["deceased", "resigned", "excluded"].includes(m.status)) continue;
    // initiation anniversaries
    if (m.initiation_date) {
      const d = parseLocalDate(m.initiation_date);
      for (const target of [10, 25, 30, 40, 50, 60]) {
        const anniv = new Date(d.getFullYear() + target, d.getMonth(), d.getDate());
        if (anniv >= yearStart && anniv <= yearEnd) {
          out.push({
            member: m,
            kind: "initiation",
            years: target,
            date: fmtLocal(anniv),
            label: `${target} years since Initiation`,
          });
        }
      }
    }
    // birthdays in next 30 days
    if (m.date_of_birth) {
      const dob = parseLocalDate(m.date_of_birth);
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const diff = (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 30) {
        const age = next.getFullYear() - dob.getFullYear();
        out.push({
          member: m,
          kind: "birthday",
          years: age,
          date: fmtLocal(next),
          label: `${age}th birthday`,
        });
      }
    }
  }

  // WM anniversaries — earliest year a member was installed as WM.
  // Source 1: member_wm_terms table. Source 2: name match against the
  // historical Worshipful Masters roll (src/data/worshipfulMasters.ts).
  const firstWmByMember = new Map<string, number>();
  for (const t of wmTerms) {
    const cur = firstWmByMember.get(t.member_id);
    if (cur == null || t.year_started < cur) firstWmByMember.set(t.member_id, t.year_started);
  }
  for (const m of members) {
    const fromRoll = firstWmYearForMember(m.first_name, m.last_name);
    if (fromRoll != null) {
      const cur = firstWmByMember.get(m.id);
      if (cur == null || fromRoll < cur) firstWmByMember.set(m.id, fromRoll);
    }
  }
  for (const m of members) {
    const first = firstWmByMember.get(m.id);
    if (!first) continue;
    for (const target of [10, 25, 30, 40, 50]) {
      const anniv = new Date(first + target, 9, 1); // installation is in October
      if (anniv >= yearStart && anniv <= yearEnd) {
        out.push({
          member: m,
          kind: "wm",
          years: target,
          date: fmtLocal(anniv),
          label: `${target} years since first installed as WM`,
        });
      }
    }
  }

  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ───── Section 6: Officers & succession
const CRITICAL_ROLES = ["secretary", "treasurer", "almoner", "director_of_ceremonies"] as const;
export const CRITICAL_ROLE_LABELS: Record<(typeof CRITICAL_ROLES)[number], string> = {
  secretary: "Secretary",
  treasurer: "Treasurer",
  almoner: "Almoner",
  director_of_ceremonies: "Director of Ceremonies",
};

export function officersHealth(bundle: KpiBundle) {
  const my = currentMasonicYear();
  const yearAppointments = bundle.appointments.filter((a) => a.lodge_year === my);
  const filledKeys = new Set(yearAppointments.map((a) => a.position_key));
  // Steward offices are optional: lodges need not appoint them, so an empty
  // steward slot is neither a vacancy to report nor a succession risk.
  const progressive = bundle.positions.filter(
    (p) => p.is_progressive && !OPTIONAL_POSITIONS.has(p.key)
  );
  const filled = progressive.filter((p) => filledKeys.has(p.key));
  const vacant = progressive.filter((p) => !filledKeys.has(p.key));

  const criticals = CRITICAL_ROLES.map((key) => {
    const appt = yearAppointments.find((a) => a.position_key === key);
    const holder = appt ? bundle.members.find((m) => m.id === appt.member_id) ?? null : null;
    const risk = bundle.risks.find((r) => r.role_key === key) ?? null;
    return { key, label: CRITICAL_ROLE_LABELS[key], holder, risk };
  });

  return { progressiveFilled: filled, progressiveVacant: vacant, progressiveTotal: progressive.length, criticals };
}

// ───── Section 7: Pipeline
export function pipeline(bundle: KpiBundle) {
  const { members, candidates: allCandidates } = bundle;
  // Active candidates = anyone not yet initiated and not withdrawn
  const candidates = allCandidates.filter(
    (c) => c.stage !== "initiated" && c.stage !== "withdrawn"
  );
  const ea = members.filter(
    (m) => m.status === "active" && m.degree === "entered_apprentice" && !m.passing_date
  );
  const fc = members.filter(
    (m) => m.status === "active" && m.degree === "fellow_craft" && !m.raising_date
  );
  const mmPlain = members.filter(
    (m) => m.status === "active" && m.degree === "master_mason" && !m.is_past_master
  );
  const pm = members.filter(
    (m) => m.status === "active" && (m.degree === "installed_master" || m.is_past_master)
  );
  const mm = mmPlain.length + pm.length;
  return { candidates, ea, fc, mm, mmPlain, pm };
}

// ───── Lodge Health (RAG)
export type HealthBand = "green" | "amber" | "red";
export type HealthComponent = { band: HealthBand; detail: string };
export type LodgeHealth = {
  overall: HealthBand;
  components: { growth: HealthComponent; succession: HealthComponent; pipeline: HealthComponent };
};

export function lodgeHealth(bundle: KpiBundle): LodgeHealth {
  const mv = movement(bundle.members);
  const oh = officersHealth(bundle);
  const pl = pipeline(bundle);

  // Growth — net membership movement over the rolling 12 months.
  const net = mv.net;
  const growth: HealthComponent =
    net >= 0
      ? { band: "green", detail: `Net membership ${net > 0 ? "+" : ""}${net} over the last 12 months` }
      : net === -1
        ? { band: "amber", detail: "Net membership −1 over the last 12 months" }
        : { band: "red", detail: `Net membership ${net} over the last 12 months` };

  // Succession — progressive vacancies and critical-role risk flags.
  const vacant = oh.progressiveVacant;
  const riskyCriticals = oh.criticals.filter((c) => c.risk?.is_at_risk);
  let succession: HealthComponent;
  if (vacant.length === 0 && riskyCriticals.length === 0) {
    succession = { band: "green", detail: "All progressive offices filled and no key roles flagged at risk" };
  } else if (vacant.length > 0 && riskyCriticals.length > 0) {
    succession = {
      band: "red",
      detail: `${vacant.length} progressive office${vacant.length === 1 ? "" : "s"} vacant (${vacant.map((p) => p.label).join(", ")}) and ${riskyCriticals.map((c) => c.label).join(", ")} flagged at risk`,
    };
  } else if (vacant.length >= 2) {
    succession = {
      band: "red",
      detail: `${vacant.length} progressive offices vacant (${vacant.map((p) => p.label).join(", ")})`,
    };
  } else if (vacant.length === 1) {
    succession = { band: "amber", detail: `1 progressive office vacant (${vacant[0].label})` };
  } else {
    succession = {
      band: "amber",
      detail: `${riskyCriticals.map((c) => c.label).join(", ")} flagged as a succession risk`,
    };
  }

  // Pipeline — active candidates, with EA/FC still progressing as a fallback signal.
  const activeCandidates = pl.candidates.length;
  const progressing = pl.ea.length + pl.fc.length;
  let pipelineH: HealthComponent;
  if (activeCandidates >= 1) {
    pipelineH = {
      band: "green",
      detail: `${activeCandidates} active candidate${activeCandidates === 1 ? "" : "s"} in the pipeline`,
    };
  } else if (progressing > 0) {
    pipelineH = {
      band: "amber",
      detail: `No active candidates, but ${progressing} member${progressing === 1 ? "" : "s"} progressing through the First/Second Degree`,
    };
  } else {
    pipelineH = { band: "red", detail: "No active candidates and no one progressing through the degrees" };
  }

  const bands = [growth.band, succession.band, pipelineH.band];
  const overall: HealthBand = bands.includes("red") ? "red" : bands.includes("amber") ? "amber" : "green";
  return { overall, components: { growth, succession, pipeline: pipelineH } };
}

/**
 * Lightweight bundle for the member-facing Dashboard health card.
 * Ordinary members cannot read officer_appointments, succession_risks or
 * candidates (officer-only RLS), so those come from an aggregate-only
 * SECURITY DEFINER RPC and are shaped into a minimal KpiBundle that
 * lodgeHealth() can reason over — no PII is exposed.
 */
export async function fetchLodgeHealthBundle(): Promise<KpiBundle> {
  const my = currentMasonicYear();
  const [m, p, agg] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,first_name,middle_name,last_name,preferred_name,post_nominals,title,status,degree,is_past_master,is_royal_arch,is_honorary_member,initiation_date,passing_date,raising_date,joined_lodge_date,is_ugle_portal_registered,rank,grand_rank,provincial_rank,updated_at"
      ),
    supabase.from("officer_positions").select("key,label,is_progressive,order_index"),
    (supabase as any).rpc("get_lodge_health_aggregates", { _lodge_year: my }),
  ]);
  const a = (agg.data ?? {}) as {
    filled_position_keys?: string[];
    risk_role_keys?: string[];
    active_candidates?: number;
    active_candidate_count?: number;
  };
  const filled = a.filled_position_keys ?? [];
  const risks = a.risk_role_keys ?? [];
  const candCount = a.active_candidates ?? a.active_candidate_count ?? 0;
  return {
    members: ((m.data as unknown) as KpiMember[]) ?? [],
    wmTerms: [],
    appointments: filled.map((key) => ({ position_key: key, member_id: "", lodge_year: my })),
    risks: risks.map((role_key, i) => ({ id: String(i), role_key, note: null, is_at_risk: true })),
    positions: (p.data as KpiBundle["positions"]) ?? [],
    // Count-only stubs — lodgeHealth/pipeline only inspect stage + length.
    candidates: Array.from({ length: candCount }, (_, i) => ({
      id: String(i),
      first_name: "",
      last_name: "",
      email: null,
      phone: null,
      proposer: null,
      seconder: null,
      stage: "enquiry" as CandidateStage,
      notes: null,
      date_of_enquiry: null,
      initiation_scheduled_date: null,
      converted_member_id: null,
      created_at: "",
      updated_at: "",
    })),
  };
}

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  enquiry: "Enquiry",
  information_provided: "Information Provided",
  face_to_face: "Face to Face",
  form_p: "Form P",
  interviewed: "Interviewed",
  read_in_lodge: "Read in Lodge",
  initiated: "Initiated",
  withdrawn: "Withdrawn",
};

export const CANDIDATE_STAGE_ORDER: CandidateStage[] = [
  "enquiry",
  "information_provided",
  "face_to_face",
  "form_p",
  "interviewed",
  "read_in_lodge",
  "initiated",
  "withdrawn",
];


// ───── Referral sources
export const REFERRAL_SOURCES = ["website", "member", "province", "event", "social_media"] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];
export const REFERRAL_SOURCE_LABELS: Record<ReferralSource | "unknown", string> = {
  website: "Website",
  member: "Existing Member",
  province: "Province",
  event: "Event",
  social_media: "Social Media",
  unknown: "Not recorded",
};

export type ReferralRate = Record<ReferralSource | "unknown", number>;

/**
 * Counts every candidate ever recorded (including those already initiated)
 * by how they first heard about the lodge. Candidates with no source on
 * file — mostly historical records predating the field — are counted
 * plainly as "unknown" rather than hidden.
 */
export function referralRate(candidates: Candidate[]): ReferralRate {
  const out: ReferralRate = {
    website: 0,
    member: 0,
    province: 0,
    event: 0,
    social_media: 0,
    unknown: 0,
  };
  for (const c of candidates) {
    const src = c.referral_source;
    if (src && (REFERRAL_SOURCES as readonly string[]).includes(src)) out[src as ReferralSource] += 1;
    else out.unknown += 1;
  }
  return out;
}

// ───── Engagement analytics (attendance / visitors / welfare)
export type OccurredMeeting = { id: string; meeting_date: string; meeting_type: string };
export type AttendanceRow = { meeting_id: string; member_id: string | null; attendance_status: string };
export type AbsenceRow = { member_id: string; period_start: string; period_end: string | null };
export type VisitorRow = {
  id: string;
  name: string | null;
  lodge_name: string | null;
  lodge_number: string | null;
  last_seen_at: string | null;
  visits: number;
};

export type EngagementBundle = {
  meetings: OccurredMeeting[]; // ascending by date, past meetings only
  attendance: AttendanceRow[];
  absences: AbsenceRow[];
  visitors: VisitorRow[];
};

const ATTENDED_STATUSES = new Set(["booked", "attended"]);

export async function fetchEngagementBundle(): Promise<EngagementBundle> {
  const today = new Date().toISOString().slice(0, 10);
  const [mt, at, ab, vc, va] = await Promise.all([
    supabase
      .from("festive_board_meetings")
      .select("id,meeting_date,meeting_type")
      .lte("meeting_date", today)
      .order("meeting_date", { ascending: true }),
    supabase.from("festive_board_attendance").select("meeting_id,member_id,attendance_status"),
    (supabase.from as any)("welfare_absences").select("member_id,period_start,period_end,deleted_at"),
    (supabase.from as any)("visitor_contacts").select("id,name,lodge_name,lodge_number,last_seen_at"),
    (supabase.from as any)("visitor_attendances").select("visitor_contact_id"),
  ]);
  const visitCounts: Record<string, number> = {};
  for (const r of ((va?.data as { visitor_contact_id: string }[]) ?? []))
    visitCounts[r.visitor_contact_id] = (visitCounts[r.visitor_contact_id] ?? 0) + 1;
  return {
    meetings: (mt.data as OccurredMeeting[]) ?? [],
    attendance: (at.data as AttendanceRow[]) ?? [],
    absences: (((ab?.data as (AbsenceRow & { deleted_at: string | null })[]) ?? []).filter(
      (r) => !r.deleted_at
    ) as AbsenceRow[]),
    visitors: (((vc?.data as Omit<VisitorRow, "visits">[]) ?? []).map((v) => ({
      ...v,
      visits: visitCounts[v.id] ?? 0,
    })) as VisitorRow[]).sort((a, b) => b.visits - a.visits),
  };
}

function attendedMemberIds(eng: EngagementBundle, meetingIds: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const r of eng.attendance) {
    if (r.member_id && meetingIds.has(r.meeting_id) && ATTENDED_STATUSES.has(r.attendance_status))
      out.add(r.member_id);
  }
  return out;
}

/** Active = attended at least one of the last `window` occurred meetings. */
export function activeVsInactive(members: KpiMember[], eng: EngagementBundle, window = 6) {
  const recent = eng.meetings.slice(-window);
  const ids = new Set(recent.map((m) => m.id));
  const attended = attendedMemberIds(eng, ids);
  const subscribing = members.filter((m) => m.status === "active" && !m.is_honorary_member);
  const active = subscribing.filter((m) => attended.has(m.id));
  const inactive = subscribing.filter((m) => !attended.has(m.id));
  return {
    meetingsConsidered: recent.length,
    active,
    inactive,
    activePct: subscribing.length ? Math.round((active.length / subscribing.length) * 100) : 0,
  };
}

/** Visitors ranked by how often they have dined with us. */
export function visitorFrequency(eng: EngagementBundle, limit = 10) {
  return eng.visitors.filter((v) => v.visits > 0).slice(0, limit);
}

/** Member attendance rolled up by calendar quarter of the meeting date. */
export function quarterlyEngagement(eng: EngagementBundle, quarters = 8) {
  const byQuarter: Record<string, { meetings: number; members: number; visitors: number }> = {};
  const counts: Record<string, { members: number; visitors: number }> = {};
  for (const r of eng.attendance) {
    if (!ATTENDED_STATUSES.has(r.attendance_status)) continue;
    const c = (counts[r.meeting_id] ??= { members: 0, visitors: 0 });
    if (r.member_id) c.members += 1;
    else c.visitors += 1;
  }
  for (const m of eng.meetings) {
    const d = new Date(m.meeting_date);
    const key = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
    const g = (byQuarter[key] ??= { meetings: 0, members: 0, visitors: 0 });
    g.meetings += 1;
    g.members += counts[m.id]?.members ?? 0;
    g.visitors += counts[m.id]?.visitors ?? 0;
  }
  return Object.entries(byQuarter)
    .map(([quarter, v]) => ({
      quarter,
      ...v,
      avgMembers: v.meetings ? Math.round((v.members / v.meetings) * 10) / 10 : 0,
    }))
    .sort((a, b) => (a.quarter < b.quarter ? -1 : 1))
    .slice(-quarters);
}

/**
 * Members who missed all of the last 3 occurred meetings and have no
 * recorded welfare absence covering that period — i.e. quietly drifting
 * rather than known to be away.
 */
export function disengagementRisk(members: KpiMember[], eng: EngagementBundle) {
  const recent = eng.meetings.slice(-3);
  if (recent.length === 0) return { meetingsConsidered: 0, members: [] as KpiMember[] };
  const ids = new Set(recent.map((m) => m.id));
  const attended = attendedMemberIds(eng, ids);
  const from = recent[0].meeting_date;
  const to = recent[recent.length - 1].meeting_date;
  const excused = new Set(
    eng.absences
      .filter((a) => a.period_start <= to && (a.period_end == null || a.period_end >= from))
      .map((a) => a.member_id)
  );
  const at = members.filter(
    (m) => m.status === "active" && !m.is_honorary_member && !attended.has(m.id) && !excused.has(m.id)
  );
  return { meetingsConsidered: recent.length, from, to, members: at };
}
