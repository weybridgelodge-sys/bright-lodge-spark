// One unit's run of the Secretary returns digest (JOB CI). Pure: db and email injected.
//
// secretary_returns has no unit_id. A row's unit = its member's profile unit.
// Rows with no member (candidate letters, lodge-level returns) have no unit:
// they belong to the lodge only when exactly ONE unit exists (the same
// single-unit rule loadLodgeSettings() uses); otherwise they are skipped and
// counted as skipped_no_unit until secretary_returns carries a unit.
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields, recordUnit, unitOfficerRecipient } from "../_shared/units.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps { db: Db; send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>; now?: () => number }
export interface Opts { force: boolean; today: string; reportDate: string; singleUnit: boolean }

const TYPE_LABELS: Record<string, string> = {
  form_p: "Form P", lp_a5_certificate: "LP&A5 certificate application", candidate_letter: "Candidate letter",
  clearance_letter: "Clearance letter", change_of_status: "Change of status", installation_return: "Installation Return",
  provincial_return: "Provincial Return", other: "Other",
};
export const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
const yearLabel = (y: number | null): string => (typeof y === "number" ? `${y}/${y + 1}` : "—");
const personName = (m: any, c: any): string => {
  const from = (p: any) => {
    if (!p) return "";
    const first = (p.preferred_name?.trim() || p.first_name?.trim() || "").trim();
    const last = (p.last_name?.trim() || "").trim();
    const composed = [first, last].filter(Boolean).join(" ").trim();
    return composed || (p.full_name?.trim() || "");
  };
  return from(m) || from(c) || "";
};
const DEFAULT_LEAD_DAYS = 14;
const MAX_LEAD_DAYS = 3650;
const LODGE_LEVEL = new Set(["installation_return", "provincial_return"]);

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, o: Opts) {
  const { db } = deps;
  const PORTAL_URL = lodge.configuredSiteUrl ? `${lodge.configuredSiteUrl}/members/admin/returns` : undefined;
  const { today } = o;
  const { data: rows, error } = await db.from("secretary_returns")
    .select(
      "id,return_type,masonic_year,date_due,member_id,candidate_id,reminder_lead_days," +
        "member:profiles!secretary_returns_member_id_fkey(full_name,preferred_name,first_name,last_name,unit_id)," +
        "candidate:candidates!secretary_returns_candidate_id_fkey(first_name,last_name)",
    )
    .eq("status", "draft").not("date_due", "is", null).lte("date_due", addDays(today, MAX_LEAD_DAYS))
    .order("date_due", { ascending: true });
  if (error) throw error;

  let skippedNoUnit = 0;
  const mine = ((rows ?? []) as any[]).filter((r) => {
    const u = r.member_id ? recordUnit(r.member?.unit_id) : "";
    if (u) return u === unitId;
    if (o.singleUnit) return true;
    skippedNoUnit++;
    return false;
  });
  // In scope when due within its own lead time (default 14 days) or overdue. Missing dates never reach here.
  const all = mine.filter((r) => {
    const lead = typeof r.reminder_lead_days === "number" && r.reminder_lead_days >= 0 ? r.reminder_lead_days : DEFAULT_LEAD_DAYS;
    return r.date_due <= addDays(today, lead);
  });
  const daysBetween = (from: string, to: string) =>
    Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000);
  const shape = (r: any) => ({
    typeLabel: TYPE_LABELS[r.return_type] ?? r.return_type, masonicYear: yearLabel(r.masonic_year), dateDue: r.date_due,
    daysUntil: daysBetween(today, r.date_due), showPerson: !LODGE_LEVEL.has(r.return_type),
    person: personName(r.member, r.candidate), personLabel: r.member_id ? "Member" : "Candidate",
  });
  const overdue = all.filter((r) => r.date_due < today).map(shape);
  const dueSoon = all.filter((r) => r.date_due >= today).map(shape);
  const extra = skippedNoUnit ? { skipped_no_unit: skippedNoUnit } : {};
  if (overdue.length === 0 && dueSoon.length === 0) return { sent: false, reason: "nothing_outstanding", ...extra };

  const sec = await unitOfficerRecipient(db, "secretary", "secretary", unitId);
  if (!sec) {
    console.warn("secretary-returns-reminder: no secretary recipient", { unit_id: unitId });
    return { sent: false, reason: "no_secretary_recipient", overdue: overdue.length, due_soon: dueSoon.length, ...extra };
  }
  // Unit in the key: two lodges with the same counts on the same day must not suppress each other.
  const idempotencyKey = o.force
    ? `secretary-returns-${unitId}-${today}-force-${(deps.now ?? Date.now)()}`
    : `secretary-returns-${unitId}-${today}-o${overdue.length}-s${dueSoon.length}`;
  const resp = await deps.send({
    templateName: "secretary-returns-digest", recipientEmail: sec.email, idempotencyKey, unitId,
    templateData: { overdue, dueSoon, reportDate: o.reportDate, portalUrl: PORTAL_URL, ...brandFields(lodge) },
  });
  if (!resp.ok) throw new Error(`send_failed: ${String(resp.error ?? resp.status)}`);
  return { sent: true, recipient: sec.email, overdue: overdue.length, due_soon: dueSoon.length, ...extra };
}
