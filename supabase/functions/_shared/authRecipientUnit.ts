// Which lodge a sign-in email is for (JOB CJ). Pure: the database is injected.
// Order: pending_account_units (by email, server-only) -> the user's
// app_metadata.unit_id from the hook payload (server-written) -> profiles.unit_id.
// Nothing found -> if EXACTLY ONE row exists in public.units, that unit
// (source "single_unit", JOB CK); zero or 2+ units -> "" (the hook then uses the neutral text-only brand). Never
// user_metadata (client-writable). Never throws.

// deno-lint-ignore no-explicit-any
type Db = any;
import { listActiveUnits } from "./units.ts";
export type RecipientUnitSource = "pending" | "app_metadata" | "profile" | "single_unit" | "none";
export interface AuthRecipient { email: string; userId: string; appUnit: string }

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Recipient from either payload shape ({ user, email_data } or { data: { email, ... } }). */
export function recipientOf(payload: unknown): AuthRecipient {
  const p = (payload ?? {}) as Record<string, any>;
  const user = (p.user ?? p.data?.user ?? {}) as Record<string, any>;
  const email = str(user.email) || str(p.data?.email) || str(p.email) || str(p.email_data?.email);
  return {
    email: email.toLowerCase(),
    userId: str(user.id) || str(p.data?.user_id) || str(p.user_id),
    appUnit: str(user.app_metadata?.unit_id) || str(p.data?.app_metadata?.unit_id),
  };
}

export async function resolveRecipientUnit(db: Db, r: AuthRecipient): Promise<{ unitId: string; source: RecipientUnitSource }> {
  try {
    if (r.email) {
      const { data } = await db.from("pending_account_units").select("unit_id").eq("email", r.email).maybeSingle();
      const u = str(data?.unit_id);
      if (u) return { unitId: u, source: "pending" };
    }
    if (r.appUnit) return { unitId: r.appUnit, source: "app_metadata" };
    if (r.userId) {
      const { data } = await db.from("profiles").select("unit_id").eq("id", r.userId).maybeSingle();
      const u = str(data?.unit_id);
      if (u) return { unitId: u, source: "profile" };
    }
    if (r.email) {
      const { data } = await db.from("profiles").select("unit_id").eq("email", r.email).limit(2);
      const units = [...new Set(((data ?? []) as any[]).map((x) => str(x.unit_id)).filter(Boolean))];
      // Only an unambiguous match counts; two lodges sharing an address = neutral brand.
      if (units.length === 1) return { unitId: units[0], source: "profile" };
    }
  } catch { /* fall through to the single-unit check */ }
  try {
    const units = await listActiveUnits(db);
    if (units.length === 1) return { unitId: units[0], source: "single_unit" };
  } catch { /* neutral brand */ }
  return { unitId: "", source: "none" };
}
