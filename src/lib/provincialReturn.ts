// Provincial Grand Lodge of Surrey — Installation Return.
// Generated fresh from live records each time (no template fields). Nothing is cached.
import { supabase } from "@/integrations/supabase/client";
import { fetchProfilesPii } from "@/lib/profilePii";
import {
  LODGE_NAME, LODGE_NUMBER, LODGE_EMAIL_DOMAIN,
  resolveContinuingOffice, resolveLadderOffice, prescribedInstallationDate,
  type ApptRow, type StatusRow, type ResolvedOffice, type Provenance,
} from "@/lib/installationReturn";
import type { PositionKey } from "@/lib/officersProgression";

export const LADDER_KEYS = new Set([
  "worshipful_master", "senior_warden", "junior_warden", "senior_deacon", "junior_deacon",
  "inner_guard", "senior_steward", "steward_1", "steward_2", "steward_3", "steward_4", "steward_5",
]);

/** Row order follows the Provincial return. `key: null` = always blank (Organist). */
export const PROVINCIAL_ROWS: { label: string; key: string | null }[] = [
  { label: "WM", key: "worshipful_master" },
  { label: "SW", key: "senior_warden" },
  { label: "JW", key: "junior_warden" },
  { label: "Chaplain", key: "chaplain" },
  { label: "Treasurer", key: "treasurer" },
  { label: "Secretary", key: "secretary" },
  { label: "DC", key: "director_of_ceremonies" },
  { label: "ADC", key: "assistant_director_of_ceremonies" },
  { label: "Asst Secretary", key: "assistant_secretary" },
  { label: "Almoner", key: "almoner" },
  { label: "Charity Steward", key: "charity_steward" },
  { label: "Mentor", key: "mentor" },
  { label: "MO", key: "membership_officer" },
  { label: "LMO", key: "membership_officer" },
  { label: "SD", key: "senior_deacon" },
  { label: "JD", key: "junior_deacon" },
  { label: "Organist", key: null },
  { label: "IG", key: "inner_guard" },
  { label: "Senior Steward", key: "senior_steward" },
  { label: "Steward", key: "steward_1" },
  { label: "Steward", key: "steward_2" },
  { label: "Steward", key: "steward_3" },
  { label: "Steward", key: "steward_4" },
  { label: "Steward", key: "steward_5" },
  { label: "Tyler", key: "tyler" },
  { label: "IPM", key: "immediate_past_master" },
];

export type Person = { id: string; first_name: string | null; middle_name: string | null; last_name: string | null; full_name: string | null; post_nominals: string | null; email: string | null; status: string | null; initiation_date: string | null };
export type ProvRow = { label: string; key: string | null; office: ResolvedOffice | null; name: string; decorations: string; provenance: Provenance | "none" };
export type RepRow = { label: string; name: string; vacant: boolean };
export type PastMasterLine = { years: number[]; name: string };

export type ProvincialData = {
  year: number;
  installationDate: string | null;
  venue: string;
  meetingPattern: string;
  rows: ProvRow[];
  reps: RepRow[];
  pastMasters: PastMasterLine[];
  appended: string[];
  secretary: { name: string; address: string; mobile: string; personalEmail: string; lodgeEmail: string; visible: boolean };
  issues: string[];
};

/** "Julien Philip Tidmarsh" → "J P Tidmarsh" — the roll's existing style. */
export function rollName(p: Pick<Person, "first_name" | "middle_name" | "last_name" | "full_name">): string {
  const initials = [p.first_name, p.middle_name].filter(Boolean).join(" ").split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase());
  const last = (p.last_name ?? "").trim();
  if (!last) return (p.full_name ?? "").trim();
  return [...initials, last].join(" ");
}

export function printName(p?: Person | null): string {
  if (!p) return "";
  return (p.full_name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ")).trim();
}

/** Group roll rows into "1998, 2006 — J V C French" lines, ordered by first year. */
export function groupPastMasters(rows: { display_name: string; lodge_year: number; member_id: string | null }[]): PastMasterLine[] {
  const map = new Map<string, PastMasterLine>();
  for (const r of rows) {
    const k = r.member_id ?? `name:${r.display_name}`;
    const e = map.get(k) ?? { years: [], name: r.display_name };
    if (!e.years.includes(r.lodge_year)) e.years.push(r.lodge_year);
    map.set(k, e);
  }
  return [...map.values()].map((e) => ({ ...e, years: e.years.sort((a, b) => a - b) })).sort((a, b) => a.years[0] - b.years[0]);
}

/** Confirmed WM years before `year` that the roll doesn't already hold. */
export function missingRollEntries(
  year: number, appts: ApptRow[], roll: { member_id: string | null; lodge_year: number }[], people: Record<string, Person>,
): { member_id: string; lodge_year: number; display_name: string }[] {
  const have = new Set(roll.filter((r) => r.member_id).map((r) => `${r.member_id}:${r.lodge_year}`));
  const out: { member_id: string; lodge_year: number; display_name: string }[] = [];
  for (const a of appts) {
    if (a.position_key !== "worshipful_master" || a.is_projection || !a.member_id || a.lodge_year >= year) continue;
    const k = `${a.member_id}:${a.lodge_year}`;
    if (have.has(k) || !people[a.member_id]) continue;
    have.add(k);
    out.push({ member_id: a.member_id, lodge_year: a.lodge_year, display_name: rollName(people[a.member_id]) });
  }
  return out;
}

export function formatAddress(p: { address_line1?: string | null; address_line2?: string | null; address_line3?: string | null; town?: string | null; county?: string | null; postcode?: string | null }) {
  return [p.address_line1, p.address_line2, p.address_line3, p.town, p.county, p.postcode].map((s) => s?.trim()).filter(Boolean).join(", ");
}

export async function loadProvincialData(year: number, opts: { canAppend: boolean }): Promise<ProvincialData> {
  const issues: string[] = [];
  const [apptRes, statusRes, eventRes, tplRes, profRes] = await Promise.all([
    supabase.from("officer_appointments").select("position_key,member_id,lodge_year,is_projection,override_reason"),
    supabase.from("member_progression_status").select("member_id,readiness,seniority_initiation_date,seniority_tiebreaker"),
    supabase.from("lodge_events").select("title,event_date").ilike("title", "%installation%").eq("published", true)
      .gte("event_date", `${year}-09-01`).lt("event_date", `${year + 1}-09-01`).order("event_date"),
    supabase.from("lodge_template").select("venue_address,regular_meeting_pattern,royal_arch_rep,lodge_representatives").eq("id", "default").maybeSingle(),
    supabase.from("profiles").select("id,first_name,middle_name,last_name,full_name,post_nominals,email,status,initiation_date"),
  ]);
  if (apptRes.error) throw apptRes.error;
  if (profRes.error) throw profRes.error;
  const appts = (apptRes.data ?? []) as ApptRow[];
  const people = (profRes.data ?? []) as Person[];
  const byId: Record<string, Person> = Object.fromEntries(people.map((p) => [p.id, p]));
  const ladder = { year, appts, profiles: people, statuses: (statusRes.data ?? []) as StatusRow[] };

  const cache = new Map<string, ResolvedOffice>();
  const resolve = (key: string, label: string) => {
    if (!cache.has(key)) {
      cache.set(key, LADDER_KEYS.has(key) ? resolveLadderOffice(key as PositionKey, label, ladder) : resolveContinuingOffice(key, label, year, appts));
    }
    return cache.get(key)!;
  };
  const rows: ProvRow[] = PROVINCIAL_ROWS.map(({ label, key }) => {
    if (!key) return { label, key, office: null, name: "", decorations: "", provenance: "none" };
    const office = resolve(key, label);
    const p = office.memberId ? byId[office.memberId] : null;
    return { label, key, office, name: printName(p), decorations: p?.post_nominals?.trim() ?? "", provenance: office.provenance };
  });

  const tpl = (tplRes.data ?? {}) as any;
  const reps: RepRow[] = [{ label: "RA Rep", name: (tpl.royal_arch_rep ?? "").trim(), vacant: !(tpl.royal_arch_rep ?? "").trim() }];
  const repList = (tpl.lodge_representatives ?? []) as { role?: string; name?: string }[];
  for (const [label, word] of [["Petitions Rep", "petition"], ["Sports Rep", "sport"], ["Halls Rep", "hall"]] as const) {
    const r = repList.find((x) => (x.role ?? "").toLowerCase().includes(word));
    const name = (r?.name ?? "").trim();
    const vacant = !name || /^vacant$/i.test(name);
    reps.push({ label, name: vacant ? "" : name, vacant });
  }

  // Past Masters roll + automatic append from confirmed WM history.
  const rollRes = await supabase.from("past_masters").select("display_name,lodge_year,member_id");
  let roll = (rollRes.data ?? []) as { display_name: string; lodge_year: number; member_id: string | null }[];
  const missing = missingRollEntries(year, appts, roll, byId);
  const appended: string[] = [];
  if (missing.length) {
    if (opts.canAppend) {
      const { error } = await supabase.from("past_masters").upsert(missing.map((m) => ({ ...m, source: "auto" })), { onConflict: "display_name,lodge_year", ignoreDuplicates: true });
      if (error) issues.push(`Could not add ${missing.length} Past Master year(s) to the roll: ${error.message}`);
      else { roll = [...roll, ...missing]; appended.push(...missing.map((m) => `${m.lodge_year} — ${m.display_name}`)); }
    } else {
      roll = [...roll, ...missing];
      issues.push(`${missing.length} Past Master year(s) are shown but not yet saved to the roll (Secretary access needed).`);
    }
  }

  // Secretary contact — through the protected lookup only.
  const secId = resolve("secretary", "Secretary").memberId;
  const sec = secId ? byId[secId] : null;
  const pii = secId ? (await fetchProfilesPii([secId]))[0] : undefined;
  if (secId && !pii) issues.push("You don't have access to the Secretary's home contact details, so that section is blank.");

  const events = (eventRes.data ?? []) as { event_date: string }[];
  const installationDate = events[0]?.event_date?.slice(0, 10) ?? null;
  if (!installationDate) issues.push(`No published Installation meeting found for ${year}; using the prescribed date ${prescribedInstallationDate(year)}.`);

  for (const r of rows) if (r.key && r.provenance === "vacant" && !r.key.startsWith("steward_4") && !r.key.startsWith("steward_5")) issues.push(`${r.label}: nobody resolved.`);

  return {
    year,
    installationDate: installationDate ?? prescribedInstallationDate(year),
    venue: (tpl.venue_address ?? "").replace(/\s+/g, " ").trim(),
    meetingPattern: (tpl.regular_meeting_pattern ?? "").replace(/\s+/g, " ").trim(),
    rows, reps,
    pastMasters: groupPastMasters(roll),
    appended,
    secretary: {
      name: printName(sec),
      address: pii ? formatAddress(pii) : "",
      mobile: pii?.phone ?? "",
      personalEmail: sec?.email ?? "",
      lodgeEmail: `secretary@${LODGE_EMAIL_DOMAIN}`,
      visible: !!pii,
    },
    issues,
  };
}

export const PROVINCE_TITLE = "Provincial Grand Lodge of Surrey";
export const lodgeLine = () => `${LODGE_NAME} No. ${LODGE_NUMBER}`;
export const fileBase = (year: number) => `L${LODGE_NUMBER}-PROVINCIAL_RETURN_${year}-${year + 1}`;
export function ukLongDate(iso: string | null) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
