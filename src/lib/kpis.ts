import { supabase } from "@/integrations/supabase/client";

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
  last_name: string | null;
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
  updated_at: string;
};

export type WmTerm = { id: string; member_id: string; year_started: number; year_ended: number | null };
export type SuccessionRisk = { id: string; role_key: string; note: string | null };
export type Appointment = { position_key: string; member_id: string; lodge_year: number };

export type KpiBundle = {
  members: KpiMember[];
  wmTerms: WmTerm[];
  risks: SuccessionRisk[];
  appointments: Appointment[];
  positions: { key: string; label: string; is_progressive: boolean; order_index: number }[];
};

export function currentMasonicYear(d = new Date()): number {
  return d.getMonth() + 1 >= 10 ? d.getFullYear() : d.getFullYear() - 1;
}

export function fullName(m: KpiMember): string {
  const t = m.title ? `${m.title}. ` : "";
  const n = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.full_name || "(no name)";
  return `${t}${n}`.trim();
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
  const [m, w, r, a, p] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,first_name,last_name,title,status,degree,is_past_master,is_royal_arch,is_honorary_member,date_of_birth,initiation_date,passing_date,raising_date,joined_lodge_date,is_ugle_portal_registered,updated_at"
      ),
    (supabase.from as any)("member_wm_terms").select("id,member_id,year_started,year_ended"),
    (supabase.from as any)("succession_risks").select("id,role_key,note"),
    supabase.from("officer_appointments").select("position_key,member_id,lodge_year"),
    supabase.from("officer_positions").select("key,label,is_progressive,order_index"),
  ]);
  return {
    members: ((m.data as unknown) as KpiMember[]) ?? [],
    wmTerms: (w.data as WmTerm[]) ?? [],
    risks: (r.data as SuccessionRisk[]) ?? [],
    appointments: (a.data as Appointment[]) ?? [],
    positions: (p.data as KpiBundle["positions"]) ?? [],
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
  const lightBlues = subscribing.filter((m) => !m.is_royal_arch && !m.is_past_master);

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
  const joined = members.filter((m) => inRange(m.joined_lodge_date));
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

  for (const m of members) {
    if (["deceased", "resigned", "excluded"].includes(m.status)) continue;
    // initiation anniversaries
    if (m.initiation_date) {
      const d = new Date(m.initiation_date);
      for (const target of [10, 25, 30, 40, 50, 60]) {
        const anniv = new Date(d.getFullYear() + target, d.getMonth(), d.getDate());
        if (anniv >= yearStart && anniv <= yearEnd) {
          out.push({
            member: m,
            kind: "initiation",
            years: target,
            date: anniv.toISOString().slice(0, 10),
            label: `${target} years since Initiation`,
          });
        }
      }
    }
    // birthdays in next 30 days
    if (m.date_of_birth) {
      const dob = new Date(m.date_of_birth);
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const diff = (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 30) {
        const age = next.getFullYear() - dob.getFullYear();
        out.push({
          member: m,
          kind: "birthday",
          years: age,
          date: next.toISOString().slice(0, 10),
          label: `${age}th birthday`,
        });
      }
    }
  }

  // WM anniversaries — use earliest year_started per member
  const firstWmByMember = new Map<string, number>();
  for (const t of wmTerms) {
    const cur = firstWmByMember.get(t.member_id);
    if (cur == null || t.year_started < cur) firstWmByMember.set(t.member_id, t.year_started);
  }
  for (const m of members) {
    const first = firstWmByMember.get(m.id);
    if (!first) continue;
    for (const target of [25, 30, 40, 50]) {
      const anniv = new Date(first + target, 9, 1); // installation typically Oct
      if (anniv >= yearStart && anniv <= yearEnd) {
        out.push({
          member: m,
          kind: "wm",
          years: target,
          date: anniv.toISOString().slice(0, 10),
          label: `${target} years since first installed`,
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
  const progressive = bundle.positions.filter((p) => p.is_progressive);
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
export function pipeline(members: KpiMember[]) {
  const candidates = members.filter((m) => m.status === "pending" && !m.initiation_date);
  const ea = members.filter(
    (m) => m.status === "active" && m.degree === "entered_apprentice" && !m.passing_date
  );
  const fc = members.filter(
    (m) => m.status === "active" && m.degree === "fellow_craft" && !m.raising_date
  );
  const mm = members.filter(
    (m) =>
      m.status === "active" &&
      (m.degree === "master_mason" || m.degree === "installed_master" || m.is_past_master)
  );
  return { candidates, ea, fc, mm };
}
