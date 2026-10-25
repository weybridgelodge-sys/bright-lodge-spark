// The lodge (unit) of a SIGNED-IN caller: their own profile row, looked up by
// the verified user id with the service role. Never a default, never from the
// request body. Blank = refuse with noCallerUnitMessage(...).

/** Refusal wording for a caller whose member record has no lodge set. */
export function noCallerUnitMessage(action: string): string {
  return `Your member record has no lodge set, so you cannot ${action}. Ask an administrator to set your lodge first.`;
}

/** Caller's own lodge from their profile row; "" when blank/missing. */
export function callerUnitFrom(profile: { unit_id?: unknown } | null | undefined): string {
  return typeof profile?.unit_id === "string" ? profile.unit_id.trim() : "";
}

/** Loads the caller's profile unit; "" when no profile or blank unit. Never throws. */
// deno-lint-ignore no-explicit-any
export async function loadCallerUnit(admin: any, userId: string): Promise<string> {
  try {
    const { data } = await admin.from("profiles").select("unit_id").eq("id", userId).maybeSingle();
    return callerUnitFrom(data);
  } catch {
    return "";
  }
}

/** A record belongs to the caller's lodge. Blank record unit = not checkable (allowed, as before). */
export function recordUnitMatches(recordUnit: unknown, callerUnit: string): boolean {
  const r = typeof recordUnit === "string" ? recordUnit.trim() : "";
  return r === "" || r === callerUnit;
}

export const CROSS_UNIT_MESSAGE = "This record belongs to a different lodge, so you cannot act on it.";
