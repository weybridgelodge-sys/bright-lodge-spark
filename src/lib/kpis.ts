import { masonicYearStartSync, masonicYearBoundsSync } from "@/lib/masonicYear";
import { evaluateAutoLog, AUTO_LOG_FROM, type AutoLogEscalation } from "../../supabase/functions/_shared/almonerAutoLog";
import { supabase } from "@/integrations/supabase/client";
import { prescribedInstallationDate } from "@/lib/installationReturn";
import { formatMemberLine } from "@/lib/summons";
import { OPTIONAL_POSITIONS, fetchOfficerYear } from "@/lib/officersProgression";
import { resolveOfficeRoll } from "@/lib/officerRoll";
import {
  fetchInstallationConfig,
  formatRangeDate,
  getMasonicYear,
  getMasonicYearRange,
  localIsoDate,
  type InstallationConfig,
} from "@/lib/masonicYear";

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
  status_changed_at?: string | null;
};

export type WmTerm = { id: string; member_id: string; year_started: number; year_ended: number | null };
export type SuccessionRisk = { id: string; role_key: string; note: string | null; is_at_risk: boolean };
export type Appointment = { position_key: string; member_id: string | null; lodge_year: number; is_projection?: boolean };

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
  referral_source: "website" | "member" | "province" | "event" | "social_media" | null;
  created_at: string;
  updated_at: string;
};

export type StatusHistoryRow = {
  profile_id: string;
  kind: "status" | "initiated" | "joined";
  status: string;
  effective_date: string;
  created_at: string;
};

export type KpiBundle = {
  /** Officers' (Installation) year used for vacancy checks. */
  officerYear?: number;
  members: KpiMember[];
  wmTerms: WmTerm[];
  /** Past Masters roll (member_id, lodge_year, installed_on) — WM milestone source. */
  pastMasters?: PastMasterRow[];
  risks: SuccessionRisk[];
  appointments: Appointment[];
  positions: { key: string; label: string; is_progressive: boolean; order_index: number }[];
  candidates: Candidate[];
  /** member_status_history events (KPI dashboard only). */
  statusHistory?: StatusHistoryRow[];
  installation?: InstallationConfig;
};



export function currentMasonicYear(d = new Date()): number {
  return masonicYearStartSync(d);
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
  const [m, w, r, a, p, c, h, cfg, pm] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,first_name,middle_name,last_name,preferred_name,post_nominals,title,status,degree,is_past_master,is_royal_arch,is_honorary_member,initiation_date,passing_date,raising_date,joined_lodge_date,is_ugle_portal_registered,rank,grand_rank,provincial_rank,updated_at,status_changed_at"
      ),
    (supabase.from as any)("member_wm_terms").select("id,member_id,year_started,year_ended"),
    (supabase.from as any)("succession_risks").select("id,role_key,note,is_at_risk"),
    supabase.from("officer_appointments").select("position_key,member_id,lodge_year,is_projection"),
    supabase.from("officer_positions").select("key,label,is_progressive,order_index").eq("category", "office"),
    (supabase.from as any)("candidates").select("*"),
    (supabase.from as any)("member_status_history").select("profile_id,kind,status,effective_date,created_at"),
    fetchInstallationConfig(),
    (supabase.from as any)("past_masters").select("member_id,lodge_year,installed_on"),
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
    pastMasters: (pm?.data as PastMasterRow[]) ?? [],
    risks: (r.data as SuccessionRisk[]) ?? [],
    appointments: (a.data as Appointment[]) ?? [],
    positions: (p.data as KpiBundle["positions"]) ?? [],
    candidates: ((c?.data as Candidate[]) ?? []),
    statusHistory: (h.data as StatusHistoryRow[]) ?? [],
    installation: cfg,
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

// ───── Section 2: Movement (KPI dashboard / Members)
export type MovementPeriodKey = "current" | "previous" | "rolling";
export const MOVEMENT_PERIOD_LABELS: Record<MovementPeriodKey, string> = {
  current: "Current Masonic year",
  previous: "Previous Masonic year",
  rolling: "Rolling 12 months",
};
export type MovementPeriod = {
  key: MovementPeriodKey;
  label: string;
  start: string;
  /** Inclusive end used for counting. */
  end: string;
  /** Human-readable range, e.g. "15 Oct 2025 – 20 Oct 2026". */
  rangeLabel: string;
};

/**
 * Resolves the chosen Movement period. Masonic years come from the shared
 * installation helper; when the next installation is unknown the year is
 * counted up to today and labelled as open-ended.
 */
export function movementPeriod(
  key: MovementPeriodKey,
  cfg: InstallationConfig,
  today: string = localIsoDate()
): MovementPeriod | null {
  if (key === "rolling") {
    const [y, m, d] = today.split("-");
    const start = `${Number(y) - 1}-${m}-${d}`;
    return { key, label: MOVEMENT_PERIOD_LABELS[key], start, end: today, rangeLabel: `${formatRangeDate(start)} – ${formatRangeDate(today)}` };
  }
  const cur = getMasonicYear(today, cfg);
  if (!cur) return null;
  const range = key === "current" ? cur : getMasonicYearRange(cur.startYear - 1, cfg);
  if (!range) return null;
  const end = range.end ?? today;
  const endLabel = range.end ? formatRangeDate(range.end) : "next Installation not yet set";
  return { key, label: MOVEMENT_PERIOD_LABELS[key], start: range.start, end, rangeLabel: `${formatRangeDate(range.start)} – ${endLabel}` };
}

const TERMINAL = new Set(["resigned", "excluded", "deceased"]);

function rollingDefault(): { start: string; end: string } {
  const today = localIsoDate();
  const [y, m, d] = today.split("-");
  return { start: `${Number(y) - 1}-${m}-${d}`, end: today };
}

/**
 * Counts movement inside [start, end] (inclusive ISO dates). Leavers and
 * rejoiners come from member_status_history events; members without history
 * fall back to current status dated by status_changed_at. Default period is
 * rolling 12 months (used by the Lodge Health card).
 */
export function movement(
  members: KpiMember[],
  opts: { start: string; end: string; history?: StatusHistoryRow[] } = rollingDefault()
) {
  const { start, end } = opts;
  const inRange = (iso: string | null | undefined) => !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) <= end;
  const byMember = new Map<string, StatusHistoryRow[]>();
  for (const h of opts.history ?? []) {
    const list = byMember.get(h.profile_id) ?? [];
    list.push(h);
    byMember.set(h.profile_id, list);
  }

  const initiated = members.filter((m) => inRange(m.initiation_date));
  const joined: KpiMember[] = [];
  const resigned: KpiMember[] = [];
  const excluded: KpiMember[] = [];
  const deceased: KpiMember[] = [];

  for (const m of members) {
    const rows = byMember.get(m.id) ?? [];
    const entryRows = rows.filter((r) => r.kind === "initiated" || r.kind === "joined");
    const statusRows = rows
      .filter((r) => r.kind === "status")
      .sort((a, b) => (a.effective_date === b.effective_date ? (a.created_at < b.created_at ? -1 : 1) : a.effective_date < b.effective_date ? -1 : 1));

    const joinDates = new Set<string>();
    if (entryRows.length) {
      for (const r of entryRows) if (r.kind === "joined") joinDates.add(r.effective_date);
    } else if (m.joined_lodge_date && m.joined_lodge_date !== m.initiation_date) {
      // Joiners only — initiates whose joined date mirrors initiation are excluded.
      joinDates.add(m.joined_lodge_date.slice(0, 10));
    }

    if (statusRows.length) {
      let prev: string | null = null;
      for (const r of statusRows) {
        if (TERMINAL.has(r.status) && r.status !== prev && inRange(r.effective_date)) {
          (r.status === "resigned" ? resigned : r.status === "excluded" ? excluded : deceased).push(m);
        }
        if (!TERMINAL.has(r.status) && prev && TERMINAL.has(prev)) joinDates.add(r.effective_date); // rejoined
        prev = r.status;
      }
    } else if (TERMINAL.has(m.status) && inRange(m.status_changed_at)) {
      (m.status === "resigned" ? resigned : m.status === "excluded" ? excluded : deceased).push(m);
    }

    for (const d of joinDates) if (inRange(d)) joined.push(m);
  }
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
  /** YYYY-MM-DD (day), YYYY-MM (month only) or YYYY (year only). */
  date: string;
  precision?: "day" | "month" | "year";
  label: string;
};

export type PastMasterRow = { member_id: string | null; lodge_year: number; installed_on: string | null };

export function milestones(
  members: KpiMember[],
  pastMasters: PastMasterRow[],
  /** Masonic-year window (installation to installation); defaults to 1 Oct–30 Sep. */
  yearRange?: { start: string; end: string | null },
  installMonthFor: (year: number) => number | null = defaultInstallMonthFor,
): Milestone[] {
  const today = new Date();
  const my = currentMasonicYear(today);
  const toLocal = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const yearStart = yearRange ? toLocal(yearRange.start) : new Date(my, 9, 1);
  const yearEnd = yearRange?.end ? toLocal(yearRange.end) : new Date(my + 1, 8, 30);
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
          label: `${ordinal(age)} birthday`,
        });
      }
    }
  }

  // WM anniversaries — from the Past Masters roll only (by member_id). The
  // earliest lodge_year is the first installation; its installed_on gives the
  // exact day when recorded. Without it we never invent a day.
  const firstByMember = new Map<string, PastMasterRow>();
  for (const r of pastMasters) {
    if (!r.member_id) continue;
    const cur = firstByMember.get(r.member_id);
    if (!cur || r.lodge_year < cur.lodge_year) firstByMember.set(r.member_id, r);
  }
  const memberIds = new Set(members.map((m) => m.id));
  for (const m of members) {
    if (["deceased", "resigned", "excluded"].includes(m.status) || !memberIds.has(m.id)) continue;
    const first = firstByMember.get(m.id);
    if (!first) continue;
    const exact = first.installed_on ? parseLocalDate(first.installed_on) : null;
    for (const target of [10, 25, 30, 40, 50]) {
      const y = first.lodge_year + target;
      const label = `${target} years since first installed as WM`;
      if (exact) {
        const anniv = new Date(exact.getFullYear() + target, exact.getMonth(), exact.getDate());
        if (anniv >= yearStart && anniv <= yearEnd) {
          out.push({ member: m, kind: "wm", years: target, date: fmtLocal(anniv), precision: "day", label });
        }
        continue;
      }
      // Year-only: list as month+year only when the WHOLE month lies inside
      // the window (a part-month could hide a real day outside it). With no
      // month rule we show nothing rather than an ambiguous date.
      const month = installMonthFor(y); // 1-12 or null
      if (month) {
        const mStart = new Date(y, month - 1, 1);
        const mEnd = new Date(y, month, 0);
        if (mStart >= yearStart && mEnd <= yearEnd) {
          out.push({ member: m, kind: "wm", years: target, date: `${y}-${String(month).padStart(2, "0")}`, precision: "month", label });
        }
      }
    }
  }

  return out.sort((a, b) => (milestoneSortKey(a) < milestoneSortKey(b) ? -1 : 1));
}

/** Sort key: exact days in order; a month-only entry sorts after the days of that month; year-only last in its year. */
export function milestoneSortKey(x: Pick<Milestone, "date" | "precision">): string {
  if (x.precision === "month") return `${x.date}-99`;
  if (x.precision === "year") return `${x.date}-99-99`;
  return x.date;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
/** On-screen/PDF date: dd/mm/yyyy for exact days, "October 2027" for month-only, "2027" for year-only. */
export function milestoneDateLabel(x: Pick<Milestone, "date" | "precision">): string {
  if (x.precision === "month") { const [y, m] = x.date.split("-"); return `${MONTHS[+m - 1]} ${y}`; }
  if (x.precision === "year") return x.date;
  const [y, m, d] = x.date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Installation month (1–12) for a year from the Unit Setup rule, else null. */
export function defaultInstallMonthFor(year: number): number | null {
  const d = prescribedInstallationDate(year);
  const m = /^\d{4}-(\d{2})-\d{2}/.exec(d ?? "");
  return m ? +m[1] : null;
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
  const my = bundle.officerYear ?? currentMasonicYear();
  // Same rule as every other roll: latest confirmed appointment carries
  // forward until replaced (officerRoll), never a lodge_year equality match.
  const rollInput = {
    year: my,
    appts: bundle.appointments.map((a) => ({ ...a, is_projection: !!a.is_projection })),
    profiles: bundle.members.map((m) => ({
      id: m.id, first_name: m.first_name, middle_name: m.middle_name, last_name: m.last_name,
      full_name: m.full_name, email: null, status: m.status,
    })),
    statuses: [],
  };
  const isHeld = (o: { memberId: string | null; provenance: string }) =>
    !!o.memberId && o.provenance !== "vacant" && o.provenance !== "computed";
  // Steward offices are optional: lodges need not appoint them, so an empty
  // steward slot is neither a vacancy to report nor a succession risk.
  const progressive = bundle.positions.filter(
    (p) => p.is_progressive && !OPTIONAL_POSITIONS.has(p.key)
  );
  const resolved = resolveOfficeRoll(progressive.map((p) => ({ key: p.key, label: p.label })), rollInput);
  const filled = progressive.filter((_, i) => isHeld(resolved[i]));
  const vacant = progressive.filter((_, i) => !isHeld(resolved[i]));

  const criticals = CRITICAL_ROLES.map((key) => {
    const o = resolveOfficeRoll([{ key, label: CRITICAL_ROLE_LABELS[key] }], rollInput)[0];
    const held = isHeld(o);
    const holder = held ? bundle.members.find((m) => m.id === o.memberId) ?? null : null;
    const risk = bundle.risks.find((r) => r.role_key === key) ?? null;
    return { key, label: CRITICAL_ROLE_LABELS[key], holder, held, risk };
  });

  return { progressiveFilled: filled, progressiveVacant: vacant, progressiveTotal: progressive.length, criticals };
}

/** English ordinal: 1st, 2nd, 3rd, 4th, 11th–13th, 21st, 83rd. */
export function ordinal(n: number): string {
  const t = Math.abs(n) % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  const suffix = ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[t % 10] ?? "th";
  return `${n}${suffix}`;
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

  // Growth — net membership movement over the rolling 12 months (deliberately rolling).
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
  const vacantCriticals = oh.criticals.filter((c) => !c.held);
  let succession: HealthComponent;
  if (vacant.length === 0 && riskyCriticals.length === 0 && vacantCriticals.length > 0) {
    const names = vacantCriticals.map((c) => c.label).join(", ");
    succession = {
      band: "amber",
      detail: `All progressive offices filled, but ${names} ${vacantCriticals.length === 1 ? "has" : "have"} no holder`,
    };
  } else if (vacant.length === 0 && riskyCriticals.length === 0) {
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
  const my = await fetchOfficerYear();
  const [m, p, agg] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,first_name,middle_name,last_name,preferred_name,post_nominals,title,status,degree,is_past_master,is_royal_arch,is_honorary_member,initiation_date,passing_date,raising_date,joined_lodge_date,is_ugle_portal_registered,rank,grand_rank,provincial_rank,updated_at,status_changed_at"
      ),
    supabase.from("officer_positions").select("key,label,is_progressive,order_index").eq("category", "office"),
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
    officerYear: my,
    members: ((m.data as unknown) as KpiMember[]) ?? [],
    wmTerms: [],
    // Aggregate holders already use current_officer_holder; mark them confirmed this year.
    appointments: filled.map((key) => ({ position_key: key, member_id: `aggregate:${key}`, lodge_year: my })),
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
      referral_source: null,
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

export type VisitorAttendanceRow = {
  visitor_contact_id: string;
  festive_board_attendance: {
    attendance_status: string;
    festive_board_meetings: { meeting_date: string } | null;
  } | null;
};

/**
 * A visit is a Booked/Attended row at a meeting that has happened — the same
 * rule as every other attendance KPI. Apologies, no-shows and cancellations
 * are not visits and never move Last Seen.
 */
export function countVisitorVisits(rows: VisitorAttendanceRow[], today: string) {
  const counts: Record<string, number> = {};
  const lastSeen: Record<string, string> = {};
  for (const r of rows) {
    const a = r.festive_board_attendance;
    const date = a?.festive_board_meetings?.meeting_date;
    if (!a || !date || !ATTENDED_STATUSES.has(a.attendance_status) || date.slice(0, 10) > today) continue;
    counts[r.visitor_contact_id] = (counts[r.visitor_contact_id] ?? 0) + 1;
    if (!lastSeen[r.visitor_contact_id] || date > lastSeen[r.visitor_contact_id]) lastSeen[r.visitor_contact_id] = date;
  }
  return { counts, lastSeen };
}

/** Summons pre-tick: only a real (Booked/Attended) visit on or after the cutoff counts. */
export function isRecentVisitor(realLastSeen: string | null, cutoffMs: number) {
  return !!realLastSeen && new Date(realLastSeen).getTime() >= cutoffMs;
}

export async function fetchEngagementBundle(): Promise<EngagementBundle> {
  const today = new Date().toISOString().slice(0, 10);
  const [mt, at, ab, vc, va] = await Promise.all([
    supabase
      .from("festive_board_meetings")
      .select("id,meeting_date,meeting_type")
      .is("cancelled_at", null)
      .lte("meeting_date", today)
      .order("meeting_date", { ascending: true }),
    supabase.from("festive_board_attendance").select("meeting_id,member_id,attendance_status"),
    (supabase.from as any)("welfare_absences").select("member_id,period_start,period_end,deleted_at"),
    (supabase.from as any)("visitor_contacts").select("id,name,lodge_name,lodge_number,last_seen_at"),
    (supabase.from as any)("visitor_attendances").select(
      "visitor_contact_id, festive_board_attendance(attendance_status, festive_board_meetings(meeting_date))"
    ),
  ]);
  const { counts: visitCounts, lastSeen } = countVisitorVisits((va?.data as VisitorAttendanceRow[]) ?? [], today);
  return {
    meetings: (mt.data as OccurredMeeting[]) ?? [],
    attendance: (at.data as AttendanceRow[]) ?? [],
    absences: (((ab?.data as (AbsenceRow & { deleted_at: string | null })[]) ?? []).filter(
      (r) => !r.deleted_at
    ) as AbsenceRow[]),
    visitors: (((vc?.data as Omit<VisitorRow, "visits">[]) ?? []).map((v) => ({
      ...v,
      visits: visitCounts[v.id] ?? 0,
      last_seen_at: lastSeen[v.id] ?? null,
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
 * Members for whom every one of the last 3 occurred meetings was an
 * unexcused miss. Each meeting is judged on its own: attendance, an apology
 * or a welfare absence only excuses the specific meeting it covers — it never
 * clears a different meeting's miss.
 */
/**
 * Disengagement Risk = the Almoner Auto-Log Tier 1 rule, run by the same
 * shared evaluator: 2 consecutive unexcused misses, or 3 in the lodge year.
 * Scope: active, non-honorary members only (first-year members fall under
 * Tier 2 and are not counted here).
 */
export function disengagementRisk(members: KpiMember[], eng: EngagementBundle, today = new Date().toISOString().slice(0, 10)) {
  const scope = members.filter((m) => m.status === "active" && !m.is_honorary_member);
  const meetingsConsidered = eng.meetings.filter(
    (m) => m.meeting_date >= AUTO_LOG_FROM && m.meeting_date <= today
  ).length;
  const hits = evaluateAutoLog(
    eng.meetings.map((m) => ({ id: m.id, meeting_date: m.meeting_date, meeting_type: (m as any).meeting_type ?? "regular" })),
    eng.attendance,
    scope.map((m) => ({ id: m.id, initiation_date: m.initiation_date })),
    today,
    AUTO_LOG_FROM,
    eng.absences,
  ).filter((e) => e.tier === 1);
  const byMember = new Map<string, AutoLogEscalation[]>();
  for (const h of hits) byMember.set(h.member_id, [...(byMember.get(h.member_id) ?? []), h]);
  const flagged = scope
    .filter((m) => byMember.has(m.id))
    .map((m) => ({ member: m, reasons: byMember.get(m.id)!.map((h) => h.reason.replace(/^System: /, "")) }));
  return { meetingsConsidered, members: flagged.map((f) => f.member), details: flagged };
}
