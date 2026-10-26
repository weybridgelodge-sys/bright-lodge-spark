// Per-unit runner for scheduled / multi-lodge functions (JOB CI).
// Source of truth for which lodges exist: the public.units table (one row per
// unit; unit_settings only holds keyed settings and may be empty for a unit).
// No npm/Deno imports so vitest can exercise it directly.

// deno-lint-ignore no-explicit-any
type Db = any;

export type UnitOutcome<T> =
  | { unit_id: string; ok: true; result: T }
  | { unit_id: string; ok: false; error: string };

/** Every unit id, trimmed, blank ids dropped, in stable id order. Throws on a read error. */
export async function listActiveUnits(db: Db): Promise<string[]> {
  const { data, error } = await db.from("units").select("id").order("id", { ascending: true });
  if (error) throw new Error(`units lookup failed: ${error.message ?? String(error)}`);
  const ids = ((data ?? []) as { id: unknown }[])
    .map((r) => (typeof r.id === "string" ? r.id.trim() : ""))
    .filter(Boolean);
  return [...new Set(ids)];
}

/**
 * Runs fn once per unit, each in its own try/catch so one unit failing never
 * stops the others. Failures are logged with the unit id only (no personal data).
 */
export async function forEachUnit<T>(
  units: string[],
  fn: (unitId: string) => Promise<T>,
  label = "unit run",
): Promise<UnitOutcome<T>[]> {
  const out: UnitOutcome<T>[] = [];
  for (const unitId of units) {
    try {
      out.push({ unit_id: unitId, ok: true, result: await fn(unitId) });
    } catch (e) {
      console.error(`${label} failed`, { unit_id: unitId });
      out.push({ unit_id: unitId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

/** Trimmed unit of a record; "" when missing/blank. */
export function recordUnit(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Branding block every lodge email carries. */
export function brandFields(lodge: { crestImageUrl?: string; lodgeName: string; lodgeNumber: string; provinceName: string }) {
  return { crestUrl: lodge.crestImageUrl || null, lodgeName: lodge.lodgeName, lodgeNumber: lodge.lodgeNumber, provinceName: lodge.provinceName };
}

/** Current office holder IN THIS UNIT (blank-unit positions count for every unit, per 0147). */
export async function unitOfficeHolder(db: Db, positionKey: string, unitId: string): Promise<string | null> {
  const { data } = await db.rpc("current_officer_holder", { _position_key: positionKey, _unit: unitId });
  return typeof data === "string" && data ? data : null;
}

/** Email of a member only if their profile belongs to this unit. */
export async function unitMemberEmail(db: Db, memberId: string | null, unitId: string): Promise<string | null> {
  if (!memberId) return null;
  const { data } = await db.from("profiles").select("email,unit_id").eq("id", memberId).maybeSingle();
  if (!data || recordUnit(data.unit_id) !== unitId) return null;
  return data.email ?? null;
}

/**
 * Role fallback scoped to the unit: the first user_roles row (in the order the
 * database returns them, as before) whose member belongs to this unit.
 */
export async function unitRoleHolder(db: Db, role: string, unitId: string): Promise<{ id: string; email: string } | null> {
  const { data: rows } = await db.from("user_roles").select("user_id").eq("role", role);
  for (const r of (rows ?? []) as { user_id: string }[]) {
    const { data: p } = await db.from("profiles").select("email,unit_id").eq("id", r.user_id).maybeSingle();
    if (!p || recordUnit(p.unit_id) !== unitId) continue;
    // First in-unit holder decides, as the old limit(1) did; no email = no recipient.
    return p.email ? { id: r.user_id, email: p.email } : null;
  }
  return null;
}

/** Office holder email for the unit, else the unit-scoped role fallback; null = skip (never another lodge). */
export async function unitOfficerRecipient(db: Db, positionKey: string, role: string, unitId: string): Promise<{ id: string; email: string } | null> {
  const holder = await unitOfficeHolder(db, positionKey, unitId);
  const email = await unitMemberEmail(db, holder, unitId);
  if (holder && email) return { id: holder, email };
  return unitRoleHolder(db, role, unitId);
}
