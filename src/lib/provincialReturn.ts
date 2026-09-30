// Provincial Grand Lodge of Surrey — Installation Return.
// Generated fresh from live records each time (no template fields). Nothing is cached.
import { supabase } from "@/integrations/supabase/client";
import { fetchProfilesPii } from "@/lib/profilePii";
import {
  LODGE_NUMBER, LODGE_EMAIL_DOMAIN,
  resolveContinuingOffice, resolveLadderOffice, prescribedInstallationDate,
  type ApptRow, type StatusRow, type ResolvedOffice, type Provenance,
} from "@/lib/installationReturn";
import type { PositionKey } from "@/lib/officersProgression";

export const LADDER_KEYS = new Set([
  "worshipful_master", "senior_warden", "junior_warden", "senior_deacon", "junior_deacon",
  "inner_guard", "senior_steward", "steward_1", "steward_2", "steward_3", "steward_4", "steward_5",
]);

/** Main officer table, in the Province form's exact order. `key: null` = always blank. */
export const PROVINCIAL_ROWS: { label: string; key: string | null }[] = [
  { label: "WM", key: "worshipful_master" },
  { label: "SW", key: "senior_warden" },
  { label: "JW", key: "junior_warden" },
  { label: "CHAP", key: "chaplain" },
  { label: "TREAS", key: "treasurer" },
  { label: "SECY", key: "secretary" },
  { label: "DC", key: "director_of_ceremonies" },
  { label: "ALM", key: "almoner" },
  { label: "CHSTWD", key: "charity_steward" },
  { label: "MO", key: "membership_officer" },
  { label: "MENTOR", key: "mentor" },
  { label: "SD", key: "senior_deacon" },
  { label: "JD", key: "junior_deacon" },
  { label: "ADC", key: "assistant_director_of_ceremonies" },
  { label: "ORG*", key: null },
  { label: "ASECY", key: "assistant_secretary" },
  { label: "IG", key: "inner_guard" },
  { label: "STWD", key: "senior_steward" },
  { label: "STWD", key: "steward_1" },
  { label: "STWD", key: "steward_2" },
  { label: "STWD", key: "steward_3" },
  { label: "STWD", key: "steward_4" },
  { label: "STWD", key: "steward_5" },
  { label: "IPM", key: "immediate_past_master" },
];
/** Rows after the Organist/Tyler note. Reps are filled from the lodge template. */
export const LOWER_ROWS: { label: string; key: string | null; rep?: string }[] = [
  { label: "TYLER**", key: "tyler" },
  { label: "ORG (G)", key: null },
  { label: "PET'NS REP", key: null, rep: "petition" },
  { label: "HALLS REP", key: null, rep: "hall" },
  { label: "SPORTS REP", key: null, rep: "sport" },
  { label: "RA REP", key: null, rep: "royal_arch" },
  { label: "LMO", key: "membership_officer" },
];
export const TABLE_NOTE = "*The invested Organist must be a subscribing Member of the Lodge. **Please show full name and rank(s) of the Tyler if he is not a Member of the Lodge.";
export const PM_NOTE = "Please ensure that Civil and Masonic honours are up-to-date. Do NOT include Honorary Members. Ensure that Founders are marked with an asterisk.";

export type Person = { id: string; first_name: string | null; middle_name: string | null; last_name: string | null; full_name: string | null; post_nominals: string | null; email: string | null; status: string | null; initiation_date: string | null };
export type ProvRow = { label: string; key: string | null; office: ResolvedOffice | null; firstNames: string; surname: string; decorations: string; provenance: Provenance | "none" | "rep"; vacantRep?: boolean };
export type PastMasterLine = { years: number[]; name: string };
type RollRow = { display_name: string; lodge_year: number; member_id: string | null };

export type ProvincialData = {
  year: number;
  consecrated: string;
  scheduledDate: string;
  actualDate: string | null; // only when different
  venue: string;
  meetingPattern: string;
  rows: ProvRow[];
  lowerRows: ProvRow[];
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
export const firstNames = (p?: Person | null) => (p ? [p.first_name, p.middle_name].filter(Boolean).join(" ").trim() : "");
export const surnameUpper = (p?: Person | null) => (p?.last_name ?? "").trim().toUpperCase();
export function printName(p?: Person | null): string {
  if (!p) return "";
  return [firstNames(p), (p.last_name ?? "").trim()].filter(Boolean).join(" ") || (p.full_name ?? "").trim();
}

/** Group roll rows into "1998, 2006 — J V C French" lines (one per person), ordered by first year. */
export function groupPastMasters(rows: RollRow[]): PastMasterLine[] {
  const map = new Map<string, PastMasterLine>();
  for (const r of rows) {
    const k = r.member_id ?? `name:${r.display_name}`;
    const e = map.get(k) ?? { years: [], name: r.display_name };
    if (!e.years.includes(r.lodge_year)) e.years.push(r.lodge_year);
    map.set(k, e);
  }
  return [...map.values()].map((e) => ({ ...e, years: e.years.sort((a, b) => a - b) })).sort((a, b) => a.years[0] - b.years[0]);
}

/**
 * Roll entries owed by genuine step-downs only. Trigger: a confirmed (non-projection) IPM
 * appointment in or before `year`. For that person, take their FULL career of confirmed WM years
 * (before the IPM year) and return any not already on the roll — merged under their existing
 * roll name so non-consecutive terms stay on one line. A sitting Master re-elected for another
 * year is never added, because he has no confirmed IPM appointment yet.
 */
export function rollEntriesFromIpm(year: number, appts: ApptRow[], roll: RollRow[], people: Record<string, Person>): { member_id: string; lodge_year: number; display_name: string }[] {
  const confirmed = appts.filter((a) => !a.is_projection && a.member_id);
  const stepDowns = new Map<string, number>(); // member → latest IPM year
  for (const a of confirmed) {
    if (a.position_key !== "immediate_past_master" || a.lodge_year > year) continue;
    stepDowns.set(a.member_id!, Math.max(stepDowns.get(a.member_id!) ?? 0, a.lodge_year));
  }
  const out: { member_id: string; lodge_year: number; display_name: string }[] = [];
  for (const [memberId, ipmYear] of stepDowns) {
    const existing = roll.filter((r) => r.member_id === memberId);
    const have = new Set(existing.map((r) => r.lodge_year));
    const name = existing[0]?.display_name ?? (people[memberId] ? rollName(people[memberId]) : null);
    if (!name) continue;
    const wmYears = [...new Set(confirmed.filter((a) => a.member_id === memberId && a.position_key === "worshipful_master" && a.lodge_year < ipmYear).map((a) => a.lodge_year))];
    for (const y of wmYears.sort()) if (!have.has(y)) out.push({ member_id: memberId, lodge_year: y, display_name: name });
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
    supabase.from("lodge_template").select("venue_address,regular_meeting_pattern,royal_arch_rep,lodge_representatives,consecration_date").eq("id", "default").maybeSingle(),
    supabase.from("profiles").select("id,first_name,middle_name,last_name,full_name,post_nominals,email,status,initiation_date"),
  ]);
  if (apptRes.error) throw apptRes.error;
  if (profRes.error) throw profRes.error;
  const appts = (apptRes.data ?? []) as ApptRow[];
  const people = (profRes.data ?? []) as Person[];
  const byId: Record<string, Person> = Object.fromEntries(people.map((p) => [p.id, p]));
  const ladder = { year, appts, profiles: people, statuses: (statusRes.data ?? []) as StatusRow[] };
  const tpl = (tplRes.data ?? {}) as any;

  const cache = new Map<string, ResolvedOffice>();
  const resolve = (key: string, label: string) => {
    if (!cache.has(key)) cache.set(key, LADDER_KEYS.has(key) ? resolveLadderOffice(key as PositionKey, label, ladder) : resolveContinuingOffice(key, label, year, appts));
    return cache.get(key)!;
  };
  const officeRow = (label: string, key: string | null): ProvRow => {
    if (!key) return { label, key, office: null, firstNames: "", surname: "", decorations: "", provenance: "none" };
    const office = resolve(key, label);
    const p = office.memberId ? byId[office.memberId] : null;
    return { label, key, office, firstNames: firstNames(p), surname: surnameUpper(p), decorations: p?.post_nominals?.trim() ?? "", provenance: office.provenance };
  };
  const repList = (tpl.lodge_representatives ?? []) as { role?: string; name?: string }[];
  const repRow = (label: string, word: string): ProvRow => {
    const raw = word === "royal_arch" ? (tpl.royal_arch_rep ?? "") : (repList.find((x) => (x.role ?? "").toLowerCase().includes(word))?.name ?? "");
    const name = String(raw).replace(/\s+/g, " ").trim();
    const vacant = !name || /^vacant$/i.test(name);
    // Reps are held as one free-text name (with ranks); print it whole in the names column.
    return { label, key: null, office: null, firstNames: vacant ? "" : name, surname: "", decorations: "", provenance: "rep", vacantRep: vacant };
  };
  const rows = PROVINCIAL_ROWS.map(({ label, key }) => officeRow(label, key));
  const lowerRows = LOWER_ROWS.map(({ label, key, rep }) => (rep ? repRow(label, rep) : officeRow(label, key)));

  // Past Masters roll — grows only when someone is confirmed as IPM.
  const rollRes = await supabase.from("past_masters").select("display_name,lodge_year,member_id");
  let roll = (rollRes.data ?? []) as RollRow[];
  const owed = rollEntriesFromIpm(year, appts, roll, byId);
  const appended: string[] = [];
  if (owed.length) {
    if (opts.canAppend) {
      const { error } = await supabase.from("past_masters").upsert(owed.map((m) => ({ ...m, source: "auto_ipm" })), { onConflict: "display_name,lodge_year", ignoreDuplicates: true });
      if (error) issues.push(`Could not add ${owed.length} Past Master year(s) to the roll: ${error.message}`);
      else { roll = [...roll, ...owed]; appended.push(...owed.map((m) => `${m.lodge_year} — ${m.display_name}`)); }
    } else {
      roll = [...roll, ...owed];
      issues.push(`${owed.length} Past Master year(s) are shown but not yet saved to the roll (Secretary access needed).`);
    }
  }

  const secId = resolve("secretary", "Secretary").memberId;
  const sec = secId ? byId[secId] : null;
  const pii = secId ? (await fetchProfilesPii([secId]))[0] : undefined;
  if (secId && !pii) issues.push("You don't have access to the Secretary's home contact details, so that section is blank.");

  const scheduledDate = prescribedInstallationDate(year);
  const ev = ((eventRes.data ?? []) as { event_date: string }[])[0];
  const actual = ev?.event_date?.slice(0, 10) ?? null;
  if (!actual) issues.push(`No published Installation meeting found for ${year}; only the scheduled date is shown.`);

  for (const r of rows) if (r.key && r.provenance === "vacant" && r.key !== "steward_4" && r.key !== "steward_5") issues.push(`${r.label}: nobody resolved.`);

  return {
    year,
    consecrated: tpl.consecration_date ?? "1949-01-19",
    scheduledDate,
    actualDate: actual && actual !== scheduledDate ? actual : null,
    venue: (tpl.venue_address ?? "").replace(/\s+/g, " ").trim(),
    meetingPattern: (tpl.regular_meeting_pattern ?? "").replace(/\s+/g, " ").trim(),
    rows, lowerRows,
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

export const PROVINCE_TITLE = "PROVINCIAL GRAND LODGE OF SURREY";
export const PROVINCE_SUBTITLE = "RETURN TO BE COMPLETED AND SENT TO PROVINCIAL GRAND SECRETARY IMMEDIATELY AFTER INSTALLATION MEETING";
export const lodgeLine = () => `WEYBRIDGE L${LODGE_NUMBER}`;
export const fileBase = (year: number) => `L${LODGE_NUMBER}-PROVINCIAL_RETURN_${year}-${year + 1}`;
export function ukLongDate(iso: string | null) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
