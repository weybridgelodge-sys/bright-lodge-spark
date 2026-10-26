// One unit's run of the monthly "missing Grand Lodge number" digest (JOB CI).
// Pure: db and email are injected.
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields, unitOfficerRecipient } from "../_shared/units.ts";
import { findMissing, idempotencyKey } from "./logic.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps { db: Db; send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>; now?: () => number }
export interface Opts { force: boolean; dryRun: boolean; today: string }

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, o: Opts) {
  const { db } = deps;
  const ADMIN_URL = lodge.configuredSiteUrl ? `${lodge.configuredSiteUrl}/members/admin` : undefined;
  const { data: rows, error } = await db.from("profiles")
    .select("id,full_name,preferred_name,first_name,last_name,title,status,initiation_date,ugle_reg_number")
    .eq("status", "active").eq("unit_id", unitId).not("initiation_date", "is", null);
  if (error) throw error;

  const missing = findMissing((rows ?? []) as any[]);
  if (missing.length === 0) return { sent: false, reason: "nothing_outstanding" };

  // This lodge's Secretary only; none = skip, never another lodge's Secretary.
  const sec = await unitOfficerRecipient(db, "secretary", "secretary", unitId);
  if (!sec) {
    console.warn("secretary-ugle-reminder: no secretary recipient", { unit_id: unitId });
    return { sent: false, reason: "no_secretary_recipient", missing: missing.length };
  }
  if (o.dryRun) return { dry_run: true, recipient_found: true, missing: missing.length };

  // Content-based key from this lodge's own member ids, so lodges cannot suppress each other.
  const key = o.force ? `secretary-ugle-${o.today}-force-${(deps.now ?? Date.now)()}` : idempotencyKey(o.today, missing);
  const resp = await deps.send({
    templateName: "secretary-ugle-missing", recipientEmail: sec.email, idempotencyKey: key, unitId,
    templateData: {
      members: missing.map((m) => ({ name: m.name, initiationLabel: m.initiationLabel, url: ADMIN_URL ? `${ADMIN_URL}#member-${m.id}` : undefined })),
      adminUrl: ADMIN_URL,
      ...brandFields(lodge),
    },
  });
  if (!resp.ok) throw new Error(`send_failed: ${String(resp.error ?? resp.status)}`);
  return { sent: true, recipient: sec.email, missing: missing.length };
}
