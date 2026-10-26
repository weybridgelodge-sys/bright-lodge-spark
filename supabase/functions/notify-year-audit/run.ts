// Year End audit emails for ONE lodge: the signed-in caller's own unit (JOB CI).
// treasurer_year_approvals has no unit column; recipients are this unit's
// current office holders only (blank-unit positions count for every unit, per 0147).
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields, recordUnit, unitOfficeHolder } from "../_shared/units.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps { db: Db; send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }> }
const OFFICE: Record<string, string> = { auditor_1: "Auditor", auditor_2: "Auditor", treasurer: "Treasurer" };

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, a: any, roles: string[], kind: string, note: string, actorId: string | null) {
  const { db } = deps;
  const URL_BASE = lodge.configuredSiteUrl;
  const y = a.masonic_year as number;
  const yearLabel = `FY ${y}/${String(y + 1).slice(2)}`;
  const yearEnd = `30 September ${y + 1}`;
  const appts: { member_id: string; position_key: string }[] = [];
  for (const key of roles) {
    const id = await unitOfficeHolder(db, key, unitId);
    if (id) appts.push({ member_id: id, position_key: key });
  }
  const ids = [...new Set([...appts.map((x) => x.member_id), ...(actorId ? [actorId] : [])])];
  const { data: profs } = await db.from("profiles").select("id,email,full_name,unit_id").in("id", ids);
  const actor = profs?.find((p: any) => p.id === actorId)?.full_name ?? "";
  let sent = 0, skippedOtherUnit = 0;
  const failures: string[] = [];
  for (const ap of appts) {
    const p = profs?.find((x: any) => x.id === ap.member_id);
    if (!p?.email) continue;
    // Never email a holder whose own record is another lodge's.
    if (recordUnit(p.unit_id) !== unitId) { skippedOtherUnit++; continue; }
    const res = await deps.send({
      templateName: "year-audit-update", recipientEmail: p.email, unitId,
      idempotencyKey: `year-audit-${a.id}-r${a.round_number}-${kind}-${ap.member_id}`,
      templateData: {
        kind, yearLabel, yearEnd, round: a.round_number, actor, note, office: OFFICE[ap.position_key],
        url: !URL_BASE ? undefined : kind === "review_needed" ? `${URL_BASE}/members` : `${URL_BASE}/members/admin/treasurer`,
        ...brandFields(lodge),
      },
    });
    if (res.ok) sent++; else failures.push(p.email);
  }
  return { sent, failures, ...(skippedOtherUnit && { skipped_other_unit: skippedOtherUnit }) };
}
