// UGLE Installation Return — live resolver + AcroForm filler.
// Every call reads current database state; nothing is cached.
import { PDFDocument, PDFTextField } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { computeProjection, type Appointment, type MemberLite, type PositionKey } from "@/lib/officersProgression";

export const LODGE_NAME = "Weybridge Lodge";
export const LODGE_NUMBER = "6787";
export const LODGE_EMAIL_DOMAIN = "weybridgelodge.org.uk";
export const TEMPLATE_BUCKET = "secretary-returns";
export const TEMPLATE_PATH = "templates/New_IR_Craft.pdf";
export const MEMBERSHIP_EMAIL_SETTING = "installation_return_membership_officer_email";
export const MEMBERSHIP_EMAIL_OPTIONS = [
  `membershipofficer@${LODGE_EMAIL_DOMAIN}`,
  `membershipsecretary@${LODGE_EMAIL_DOMAIN}`,
];

/** confirmed = saved, non-projection row for this year; planned = saved ladder projection row;
 *  computed = ladder engine output, not saved; carried = presumed continuing from an earlier year. */
export type Provenance = "confirmed" | "planned" | "computed" | "carried" | "vacant";

export type ProfileLite = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  initiation_date?: string | null;
  status?: string | null;
};
export type ApptRow = {
  position_key: string;
  member_id: string | null;
  lodge_year: number;
  is_projection: boolean;
  override_reason?: string | null;
};
export type StatusRow = {
  member_id: string;
  readiness: string | null;
  seniority_initiation_date?: string | null;
  seniority_tiebreaker?: number | null;
};

export type ResolvedOffice = {
  key: string;
  label: string;
  memberId: string | null;
  provenance: Provenance;
  fromYear: number | null; // year the record came from (carried) or selected year
  note?: string;
};

export type ReturnData = {
  year: number;
  installationDate: string | null; // ISO yyyy-mm-dd
  prescribedDate: string; // 3rd Wednesday of October
  installationEventTitle: string | null;
  wm: ResolvedOffice;
  sw: ResolvedOffice;
  jw: ResolvedOffice;
  ipm: ResolvedOffice;
  officers: ResolvedOffice[]; // treasurer, almoner, charity_steward, membership_officer, mentor, secretary
  qualification:
    | { branch: 1; lodgeNo: string; year: number; allYears: number[] }
    | { branch: 2; lodgeNo: string; year: number; office: "senior_warden" | "junior_warden" }
    | { branch: 0; reason: string };
  profiles: Record<string, ProfileLite>;
  membershipLodgeEmail: string;
  issues: string[];
};

export const EMAIL_OFFICES: { key: string; label: string; slug: string }[] = [
  { key: "treasurer", label: "Treasurer", slug: "treasurer" },
  { key: "almoner", label: "Almoner", slug: "almoner" },
  { key: "charity_steward", label: "Charity Steward", slug: "charitysteward" },
  { key: "membership_officer", label: "Membership Officer", slug: "membershipofficer" },
  { key: "mentor", label: "Mentor", slug: "mentor" },
  { key: "secretary", label: "Secretary", slug: "secretary" },
];

export function prescribedInstallationDate(year: number): string {
  const d = new Date(Date.UTC(year, 9, 15));
  while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Resolve a non-ladder office: this year's row with a member, else most recent earlier row with
 *  a member. Almoner: if the most recent row that exists is empty, it stays vacant. */
export function resolveContinuingOffice(key: string, label: string, year: number, appts: ApptRow[]): ResolvedOffice {
  const rows = appts
    .filter((a) => a.position_key === key && a.lodge_year <= year)
    .sort((a, b) => b.lodge_year - a.lodge_year);
  const thisYear = rows.find((r) => r.lodge_year === year && r.member_id);
  if (thisYear) return { key, label, memberId: thisYear.member_id, provenance: "confirmed", fromYear: year };
  if (key === "almoner") {
    const latest = rows[0];
    if (!latest) return { key, label, memberId: null, provenance: "vacant", fromYear: null, note: "No Almoner has ever been recorded." };
    if (!latest.member_id)
      return { key, label, memberId: null, provenance: "vacant", fromYear: latest.lodge_year, note: `The ${latest.lodge_year} Almoner record is empty, so nobody currently holds the office.` };
    return { key, label, memberId: latest.member_id, provenance: "carried", fromYear: latest.lodge_year };
  }
  const prev = rows.find((r) => r.member_id);
  if (prev) return { key, label, memberId: prev.member_id, provenance: "carried", fromYear: prev.lodge_year };
  return { key, label, memberId: null, provenance: "vacant", fromYear: null, note: "No appointment has ever been recorded." };
}

type LadderInput = { year: number; appts: ApptRow[]; profiles: ProfileLite[]; statuses: StatusRow[] };

export function resolveLadderOffice(key: PositionKey, label: string, input: LadderInput): ResolvedOffice {
  const { year, appts, profiles, statuses } = input;
  const row = appts.find((a) => a.lodge_year === year && a.position_key === key && a.member_id);
  if (row) {
    return {
      key, label, memberId: row.member_id, fromYear: year,
      provenance: row.is_projection ? "planned" : "confirmed",
      note: row.is_projection ? `Saved on the Progression Ladder as a projection${row.override_reason ? ` — "${row.override_reason}"` : ""}.` : undefined,
    };
  }
  const statusMap = new Map(statuses.map((s) => [s.member_id, s]));
  const byId: Record<string, MemberLite> = {};
  for (const p of profiles) {
    if (p.status && p.status !== "active") continue;
    const st = statusMap.get(p.id);
    byId[p.id] = { id: p.id, full_name: p.full_name, effective_initiation_date: st?.seniority_initiation_date ?? p.initiation_date ?? null, tiebreaker: st?.seniority_tiebreaker ?? null };
  }
  const base = year - 1;
  const onLadder = new Set(appts.filter((a) => a.lodge_year === base && a.member_id).map((a) => a.member_id as string));
  const readyQueue = Object.values(byId).filter((m) => !onLadder.has(m.id) && statusMap.get(m.id)?.readiness === "ready");
  const proj = computeProjection({ currentYear: base, yearsAhead: 1, appointments: appts as Appointment[], readyQueue, membersById: byId });
  const cell = proj.grid[year]?.[key];
  if (cell?.member) return { key, label, memberId: cell.member.id, provenance: "computed", fromYear: year, note: "Worked out by the Progression Ladder; not saved yet." };
  return { key, label, memberId: null, provenance: "vacant", fromYear: year, note: "The Progression Ladder has no candidate." };
}

export function resolveQualification(wmId: string | null, year: number, appts: ApptRow[]): ReturnData["qualification"] {
  if (!wmId) return { branch: 0, reason: "No incoming Master resolved." };
  const confirmedPrior = appts.filter((a) => a.member_id === wmId && a.lodge_year < year && !a.is_projection);
  const wmYears = confirmedPrior.filter((a) => a.position_key === "worshipful_master").map((a) => a.lodge_year).sort((a, b) => a - b);
  if (wmYears.length) return { branch: 1, lodgeNo: LODGE_NUMBER, year: wmYears[0], allYears: wmYears };
  const warden = confirmedPrior.find((a) => a.lodge_year === year - 1 && (a.position_key === "senior_warden" || a.position_key === "junior_warden"));
  if (warden) return { branch: 2, lodgeNo: LODGE_NUMBER, year: year - 1, office: warden.position_key as "senior_warden" | "junior_warden" };
  return { branch: 0, reason: "The incoming Master has no recorded year as Master, and was not a Warden in the preceding year. This needs a human decision (possibly a dispensation)." };
}

export function lodgeEmailFor(key: string, membershipEmail: string): string {
  if (key === "membership_officer") return membershipEmail;
  const o = EMAIL_OFFICES.find((x) => x.key === key);
  return o ? `${o.slug}@${LODGE_EMAIL_DOMAIN}` : "";
}

export function forenames(p?: ProfileLite | null) {
  if (!p) return "";
  return [p.first_name, p.middle_name].filter(Boolean).join(" ").trim();
}
export function surname(p?: ProfileLite | null) {
  return p?.last_name?.trim() ?? "";
}
export function blockName(p?: ProfileLite | null) {
  if (!p) return "";
  const n = [forenames(p), surname(p)].filter(Boolean).join(" ") || p.full_name || "";
  return n.toUpperCase();
}

export async function loadReturnData(year: number): Promise<ReturnData> {
  const issues: string[] = [];
  const [apptRes, statusRes, eventRes, settingRes] = await Promise.all([
    supabase.from("officer_appointments").select("position_key,member_id,lodge_year,is_projection,override_reason"),
    supabase.from("member_progression_status").select("member_id,readiness,seniority_initiation_date,seniority_tiebreaker"),
    supabase
      .from("lodge_events")
      .select("title,event_date,published")
      .ilike("title", "%installation%")
      .eq("published", true)
      .gte("event_date", `${year}-09-01`)
      .lt("event_date", `${year + 1}-09-01`)
      .order("event_date", { ascending: true }),
    supabase.from("module_settings").select("value").eq("key", MEMBERSHIP_EMAIL_SETTING).maybeSingle(),
  ]);
  if (apptRes.error) throw apptRes.error;
  const appts = (apptRes.data ?? []) as ApptRow[];
  const statuses = (statusRes.data ?? []) as StatusRow[];

  const { data: profs, error: pe } = await supabase
    .from("profiles")
    .select("id,first_name,middle_name,last_name,full_name,email,initiation_date,status");
  if (pe) throw pe;
  const profiles = (profs ?? []) as ProfileLite[];
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const ladder = { year, appts, profiles, statuses };
  const wm = resolveLadderOffice("worshipful_master", "Worshipful Master", ladder);
  const sw = resolveLadderOffice("senior_warden", "Senior Warden", ladder);
  const jw = resolveLadderOffice("junior_warden", "Junior Warden", ladder);
  const ipm = resolveContinuingOffice("immediate_past_master", "Immediate Past Master", year, appts);
  const officers = EMAIL_OFFICES.map((o) => resolveContinuingOffice(o.key, o.label, year, appts));

  const events = (eventRes.data ?? []) as { title: string; event_date: string }[];
  if (events.length > 1) issues.push(`${events.length} published Installation meetings found in ${year}/${(year + 1) % 100}; using the earliest.`);
  const ev = events[0];
  const installationDate = ev ? ev.event_date.slice(0, 10) : null;
  if (!ev) issues.push(`No published Installation meeting found for ${year}. Installation date fields will be blank.`);

  const settingVal = (settingRes.data?.value as string | undefined) ?? null;
  const membershipLodgeEmail = settingVal || MEMBERSHIP_EMAIL_OPTIONS[0];
  if (!settingVal) issues.push("Membership Officer lodge email has not been chosen yet; using membershipofficer@ until it is.");

  for (const o of [wm, sw, jw, ipm, ...officers]) {
    if (o.memberId && !byId[o.memberId]?.email) issues.push(`${o.label}: no personal email on their profile.`);
  }
  const holders = new Map<string, string[]>();
  for (const o of [wm, sw, jw, ipm, ...officers]) if (o.memberId) holders.set(o.memberId, [...(holders.get(o.memberId) ?? []), o.label]);
  for (const [id, labels] of holders) if (labels.length > 1) issues.push(`${blockName(byId[id])} is resolved into ${labels.length} offices: ${labels.join(", ")}.`);

  return {
    year,
    installationDate,
    prescribedDate: prescribedInstallationDate(year),
    installationEventTitle: ev?.title ?? null,
    wm, sw, jw, ipm, officers,
    qualification: resolveQualification(wm.memberId, year, appts),
    profiles: byId,
    membershipLodgeEmail,
    issues,
  };
}

// ---------------- Field values ----------------

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export function dateParts(iso: string | null) {
  if (!iso) return { dd: "", mmm: "", yyyy: "" };
  const [y, m, d] = iso.split("-");
  return { dd: d, mmm: MONTHS[Number(m) - 1], yyyy: y };
}
export function ukDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** A field spec: exact template name + a fallback matcher used only if the exact name is absent. */
export type FieldSpec = { id: string; label: string; value: string; match?: (name: string) => boolean };

const has = (...parts: string[]) => (n: string) => parts.every((p) => n.toLowerCase().includes(p.toLowerCase()));

export function buildFieldSpecs(d: ReturnData): FieldSpec[] {
  const P = (id: string | null) => (id ? d.profiles[id] : null);
  const prescribed = dateParts(d.prescribedDate);
  const actualDiffers = !!d.installationDate && d.installationDate !== d.prescribedDate;
  const actual = dateParts(actualDiffers ? d.installationDate : null);
  const q = d.qualification;
  const instDate = ukDate(d.installationDate);

  const specs: FieldSpec[] = [
    { id: "Lodge Name", label: "Lodge name", value: LODGE_NAME },
    { id: "Lodge Number", label: "Lodge number", value: LODGE_NUMBER },
    { id: "DD", label: "Prescribed date — day", value: prescribed.dd },
    { id: "MMM", label: "Prescribed date — month", value: prescribed.mmm },
    { id: "YYYY", label: "Prescribed date — year", value: prescribed.yyyy },
    { id: "DD_2", label: "Actual date (if different) — day", value: actual.dd },
    { id: "MMM_2", label: "Actual date (if different) — month", value: actual.mmm },
    { id: "YYYY_2", label: "Actual date (if different) — year", value: actual.yyyy },
    { id: "Lodge No", label: "Qualification 1: served as Master — Lodge No.", value: q.branch === 1 ? q.lodgeNo : "" },
    { id: "in the year", label: "Qualification 1: served as Master — year", value: q.branch === 1 ? String(q.year) : "" },
    { id: "Lodge No_2", label: "Qualification 2: Warden for a full year — Lodge No.", value: q.branch === 2 ? q.lodgeNo : "" },
    { id: "in the year_3", label: "Qualification 2: Warden for a full year — year", value: q.branch === 2 ? String(q.year) : "" },
    { id: "Date of Disp", label: "Qualification 3: dispensation date (never auto-filled)", value: "" },
  ];
  for (const [tag, o] of [["WM", d.wm], ["SW", d.sw], ["JW", d.jw], ["IPM", d.ipm]] as const) {
    const p = P(o.memberId);
    specs.push(
      { id: `Surname${tag}`, label: `${tag} surname`, value: surname(p).toUpperCase() },
      { id: `Forenames${tag}`, label: `${tag} forenames`, value: forenames(p).toUpperCase() },
      {
        id: `Date of Installation Investiture or reason for Absence${tag}`,
        label: `${tag} date of installation / investiture`,
        value: tag === "IPM" ? "" : o.memberId ? instDate : "",
        match: (n) => n.toLowerCase().startsWith("date") && !n.toLowerCase().startsWith("date signed") && n.endsWith(tag),
      },
    );
  }
  for (const o of d.officers) {
    const p = P(o.memberId);
    // No holder → no lodge email either (a mailbox nobody reads helps no one).
    const lodgeEmail = o.memberId ? lodgeEmailFor(o.key, d.membershipLodgeEmail) : "";
    if (o.key === "membership_officer") {
      specs.push(
        { id: "Name (Block Letters)_Membership Oﬃcer", label: "Membership Officer name", value: blockName(p), match: has("name", "membership") },
        { id: "Membership Oﬃcer Personal Email Address", label: "Membership Officer personal email", value: p?.email ?? "", match: has("membership", "personal") },
        { id: "Membership Oﬃcer Lodge Email Address", label: "Membership Officer lodge email", value: lodgeEmail, match: has("membership", "lodge") },
      );
      continue;
    }
    const role = o.label;
    specs.push(
      { id: `Name Block Letters${role}`, label: `${role} name`, value: blockName(p), match: (n) => has("name", "block")(n) && n.toLowerCase().includes(role.toLowerCase()) },
      { id: `${role} Personal Email Address`, label: `${role} personal email`, value: p?.email ?? "", match: has(role, "personal") },
    );
    if (o.key !== "treasurer") {
      specs.push({ id: `${role} Lodge Email Address`, label: `${role} lodge email`, value: lodgeEmail, match: has(role, "lodge email") });
    }
  }
  specs.push(
    { id: "Date Signed", label: "Date signed (Master)", value: instDate },
    { id: "Date Signed_2", label: "Date signed (Secretary)", value: instDate },
  );
  return specs;
}

// Qualification-1 "Lodge No" matcher must not grab "Lodge Number"/"Lodge No_2"; exact names only for those.
// Signature fields are listed so we can prove they are left untouched.
export const NEVER_FILL = ["Worshipful MasterRow1", "SecretaryRow1", "Date of Disp", "LodgeHas the Secretary or his details changed YN"];

export type FillReport = { filled: { id: string; field: string; fuzzy: boolean }[]; missing: string[]; templateFields: string[] };

export async function fillTemplate(templateBytes: ArrayBuffer | Uint8Array, specs: FieldSpec[]): Promise<{ bytes: Uint8Array; report: FillReport }> {
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const names = form.getFields().map((f) => f.getName());
  const used = new Set<string>();
  const report: FillReport = { filled: [], missing: [], templateFields: names };
  for (const s of specs) {
    let name = names.includes(s.id) ? s.id : null;
    let fuzzy = false;
    if (!name && s.match) {
      name = names.find((n) => !used.has(n) && !NEVER_FILL.includes(n) && s.match!(n)) ?? null;
      fuzzy = !!name;
    }
    if (!name) { report.missing.push(s.id); continue; }
    used.add(name);
    if (NEVER_FILL.includes(name)) continue;
    const f = form.getField(name);
    if (f instanceof PDFTextField) {
      f.setText(s.value || "");
      report.filled.push({ id: s.id, field: name, fuzzy });
    }
  }
  const bytes = await pdf.save();
  return { bytes, report };
}
