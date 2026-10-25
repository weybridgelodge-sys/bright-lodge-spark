// Trusted lodge for a NEW sign-in. Written with the service role BEFORE the
// auth user is created; handle_new_user reads it (and deletes it). Sign-in
// metadata is never trusted for the unit. There is deliberately no default.

import { callerUnitFrom, noCallerUnitMessage } from "./callerUnit.ts";
export { callerUnitFrom };

export const NO_CALLER_UNIT_MESSAGE = noCallerUnitMessage("add members");

// deno-lint-ignore no-explicit-any
export async function reserveAccountUnit(db: any, email: string, unitId: string, createdBy: string | null): Promise<string | null> {
  const unit = unitId.trim();
  const key = email.trim().toLowerCase();
  if (!unit) return NO_CALLER_UNIT_MESSAGE;
  if (!key) return "Missing email";
  const { error } = await db.from("pending_account_units")
    .upsert({ email: key, unit_id: unit, created_by: createdBy, created_at: new Date().toISOString() }, { onConflict: "email" });
  return error ? `Could not reserve the lodge for this member: ${error.message}` : null;
}

/** Remove a reservation after a failed create, so it can't be picked up later. Never throws. */
// deno-lint-ignore no-explicit-any
export async function releaseAccountUnit(db: any, email: string): Promise<void> {
  try { await db.from("pending_account_units").delete().eq("email", email.trim().toLowerCase()); } catch { /* ignore */ }
}
