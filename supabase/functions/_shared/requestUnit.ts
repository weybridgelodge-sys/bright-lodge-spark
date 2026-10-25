// Unit for a request-scoped flow: the record's own unit_id (meeting, event,
// subscriber) wins; otherwise the unit resolved from the web address
// (resolveUnit). Neither = the same "unknown site" error; never a default unit.
import type { ResolveUnitResult } from "./resolveUnit.ts";

/** Trimmed unit id from a row value; "" when missing/blank/not text. */
export function ownUnit(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function unitFor(own: unknown, resolve: () => Promise<ResolveUnitResult>): Promise<ResolveUnitResult> {
  const u = ownUnit(own);
  return u ? { ok: true, unitId: u, host: "" } : resolve();
}
